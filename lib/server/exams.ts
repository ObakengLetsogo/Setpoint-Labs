import "server-only";
import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { assessmentRuns, certificates, entitlements, examAttempts, examBookings, seats } from "@/db/schema";
import { FREE_RESIT_AFTER_DAYS, LEVELS, PLANS, type Level } from "@/config/plans";
import { coreTracks } from "@/data/curriculum";
import { QUIZZES } from "@/data/quizzes";
import { bankQuestion, bankRef, EXAM_BANKS, topicShares } from "@/data/exam-bank";
import { audit } from "./billing";
import { db } from "./db";
import { mails } from "./email";
import { certificateCode, newId } from "./ids";

// The theory part of a level exam is drawn from the level's exam bank, spread evenly over its
// topics, with the options shuffled. A level without a bank yet draws from its lesson quizzes. The practical part is the level's track assessments, marked
// by hidden tests. Both need 70%. Answers never leave the server.

export const EXAM_SPEC: Record<Level, { questions: number; minutes: number }> = {
  F: { questions: 40, minutes: 60 },
  P: { questions: 50, minutes: 90 },
  E: { questions: 40, minutes: 120 },
};
export const PASS_PCT = 70;
/** Professional and Expert exams are written at a partner exam centre, opened by its invigilator. */
export const CENTRE_LEVELS: Level[] = ["P", "E"];
/** A booking not opened within this long after its start counts as a missed sitting. */
export const NO_SHOW_MS = 2 * 3_600_000;
const DAY = 86_400_000;
/** Answers sent this long after the deadline still count, to cover a slow connection. */
const LATE_MS = 2 * 60_000;

const levelTracks = (level: Level) => coreTracks(level).map((t) => t.id);
const levelIndex = (level: Level) => LEVELS.indexOf(level);
export const levelCertId = (level: Level) => `level-${level}`;

/** Questions that only make sense inside their lesson, such as "in this program", stay out of exams. */
const NEEDS_LESSON = /this program|code card|this lesson|on the bench|this bench|\brung \d|in this (lab|scene|machine)|the sim\b|lamp in this|scene/i;

/** Every question a level's exam can use: bank refs, or quiz refs (lessonId:index) without a bank. */
export function questionBank(level: Level) {
  const bank = EXAM_BANKS[level];
  if (bank) return Object.entries(bank).flatMap(([topic, qs]) => qs.map((_, i) => bankRef(level, topic, i)));
  const ids: string[] = [];
  for (const t of coreTracks(level))
    for (const c of t.chapters)
      for (const l of c.lessons)
        (QUIZZES[l.id] ?? []).forEach((q, i) => {
          if (!NEEDS_LESSON.test(`${q.q} ${q.options.join(" ")}`)) ids.push(`${l.id}:${i}`);
        });
  return ids;
}

const question = (ref: string) => {
  if (ref.startsWith("bank:")) return bankQuestion(ref);
  const [lessonId, i] = ref.split(":");
  return QUIZZES[lessonId]?.[Number(i)];
};

function shuffle<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Paper = { ref: string; order: number[] }[];

/** The questions for one paper: an even share from each bank topic, or a random draw from the quizzes. */
export function drawPaper(level: Level, size: number) {
  const bank = EXAM_BANKS[level];
  if (!bank) return shuffle(questionBank(level)).slice(0, size);
  const shares = topicShares(Object.fromEntries(Object.entries(bank).map(([t, qs]) => [t, qs.length])), size);
  return shuffle(Object.entries(bank).flatMap(([topic, qs]) => shuffle(qs.map((_, i) => bankRef(level, topic, i))).slice(0, shares[topic])));
}

/** Exam credits for a level, from exam or resit payments, the bundle and employer vouchers, still valid. */
async function creditsBought(userId: string, level: Level, now: Date) {
  const plans = PLANS.filter((p) => p.exams.includes(level)).map((p) => p.id);
  const own = await db
    .select({ id: entitlements.id })
    .from(entitlements)
    .where(and(eq(entitlements.userId, userId), inArray(entitlements.planId, plans), eq(entitlements.status, "active"), gt(entitlements.endsAt, now)));
  // Exam vouchers an employer has given this learner.
  const given = await db
    .select({ id: seats.id })
    .from(seats)
    .innerJoin(entitlements, eq(entitlements.id, seats.entitlementId))
    .where(and(eq(seats.userId, userId), inArray(entitlements.planId, plans), eq(entitlements.status, "active"), gt(entitlements.endsAt, now)));
  return own.length + given.length;
}

export interface ExamStatus {
  level: Level;
  passed: boolean;
  /** Paid attempts left. */
  credits: number;
  /** When the free resit can be taken, if one is owed. */
  freeResitFrom: Date | null;
  canStart: boolean;
  /** Why the exam cannot start, in plain words. */
  blocked: string | null;
  /** An attempt that is still running. */
  openAttempt: string | null;
  lastPct: number | null;
}

export async function examStatus(userId: string, level: Level, now = new Date()): Promise<ExamStatus> {
  const attempts = await db.select().from(examAttempts).where(and(eq(examAttempts.userId, userId), eq(examAttempts.level, level))).orderBy(desc(examAttempts.startedAt));
  const passed = attempts.some((a) => a.passed);
  // A booked centre sitting that was missed uses up a credit, as an attempt would.
  const missed = (await db.select({ id: examBookings.id, at: examBookings.sessionAt, status: examBookings.status }).from(examBookings).where(and(eq(examBookings.userId, userId), eq(examBookings.level, level)))).filter(
    (b) => b.status === "no_show" || (b.status === "booked" && b.at.getTime() + NO_SHOW_MS < now.getTime()),
  ).length;
  const used = attempts.filter((a) => a.kind === "credit").length + missed;
  const credits = Math.max(0, (await creditsBought(userId, level, now)) - used);
  const open = attempts.find((a) => !a.submittedAt && a.deadlineAt.getTime() + LATE_MS > now.getTime());

  // One free resit per level, after a failed paid attempt, once 14 days have passed.
  const last = attempts.find((a) => a.submittedAt || a.deadlineAt.getTime() + LATE_MS <= now.getTime());
  let freeResitFrom: Date | null = null;
  if (last && !last.passed && last.kind === "credit" && !attempts.some((x) => x.kind === "free_resit")) freeResitFrom = new Date((last.submittedAt ?? last.deadlineAt).getTime() + FREE_RESIT_AFTER_DAYS * DAY);

  let blocked: string | null = null;
  const prev = LEVELS[levelIndex(level) - 1];
  if (passed) blocked = "Already passed.";
  else if (open) blocked = "An attempt is in progress.";
  else if (prev && !(await examStatus(userId, prev, now)).passed) blocked = `Pass the ${prev === "F" ? "Foundation" : "Professional"} exam first.`;
  else if (!credits && !(freeResitFrom && freeResitFrom <= now)) blocked = freeResitFrom ? `Your free resit opens on ${freeResitFrom.toISOString().slice(0, 10)}, or buy a resit now.` : "Buy this exam to sit it.";
  return { level, passed, credits, freeResitFrom, canStart: !blocked, blocked, openAttempt: open?.id ?? null, lastPct: last?.theoryPct ?? null };
}

export class ExamError extends Error {}

export async function startExam(userId: string, level: Level, now = new Date(), bookingId: string | null = null) {
  const st = await examStatus(userId, level, now);
  if (!st.canStart) throw new ExamError(st.blocked ?? "This exam cannot start.");
  if (CENTRE_LEVELS.includes(level) && !bookingId) throw new ExamError("This exam is written at an exam centre. Book a sitting below.");
  const kind = st.credits > 0 ? "credit" : "free_resit";
  const spec = EXAM_SPEC[level];
  const paper: Paper = drawPaper(level, spec.questions)
    .map((ref) => ({ ref, order: shuffle(question(ref)!.options.map((_, i) => i)) }));
  const id = newId();
  const startedAt = new Date(Math.floor(now.getTime() / 1000) * 1000);
  await db.insert(examAttempts).values({ id, userId, level, kind, paper, startedAt, deadlineAt: new Date(startedAt.getTime() + spec.minutes * 60_000), bookingId });
  await audit(userId, "exam.started", id, { level, kind });
  return id;
}

/** The paper as the learner sees it: questions and shuffled options, no answers. */
export async function attemptForLearner(userId: string, attemptId: string) {
  const a = (await db.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, userId))).limit(1))[0];
  if (!a) return null;
  const paper = a.paper as Paper;
  return {
    id: a.id,
    level: a.level as Level,
    deadlineAt: a.deadlineAt,
    submitted: Boolean(a.submittedAt),
    theoryPct: a.theoryPct,
    practicalPassed: a.practicalPassed,
    passed: a.passed,
    atCentre: Boolean(a.bookingId),
    questions: paper.map((p) => {
      const q = question(p.ref)!;
      return { q: q.q, options: p.order.map((i) => q.options[i]) };
    }),
  };
}

/** Whether every track assessment of the level has been passed. */
async function practicalPassed(userId: string, level: Level) {
  const tracks = levelTracks(level);
  const rows = await db.select({ id: assessmentRuns.assessmentId }).from(assessmentRuns).where(and(eq(assessmentRuns.userId, userId), inArray(assessmentRuns.assessmentId, tracks), eq(assessmentRuns.passed, true)));
  const done = new Set(rows.map((r) => r.id));
  return tracks.every((t) => done.has(t));
}

/** Marks a submitted paper. answers[i] is the index of the option the learner chose, as shown. */
export async function submitExam(user: { id: string; email: string; name: string }, attemptId: string, answers: (number | null)[], now = new Date()) {
  const a = (await db.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, user.id), isNull(examAttempts.submittedAt))).limit(1))[0];
  if (!a) throw new ExamError("This attempt is already finished.");
  const paper = a.paper as Paper;
  const late = now.getTime() > a.deadlineAt.getTime() + LATE_MS;
  const given = late ? [] : answers;
  const right = paper.filter((p, i) => {
    const shown = given[i];
    return shown != null && p.order[shown] === question(p.ref)!.answer;
  }).length;
  const theoryPct = Math.round((right / paper.length) * 100);
  const level = a.level as Level;
  const practical = await practicalPassed(user.id, level);
  // The Expert level also needs the final project and the interview, signed off by an assessor.
  const passed = theoryPct >= PASS_PCT && practical && level !== "E";
  await db.update(examAttempts).set({ answers: given, submittedAt: now, theoryPct, practicalPassed: practical, passed }).where(eq(examAttempts.id, a.id));
  await audit(user.id, "exam.submitted", a.id, { level, theoryPct, practical, passed, late });
  if (passed) await issueLevelCertificate(user, level);
  return { theoryPct, practical, passed, late };
}

async function issueLevelCertificate(user: { id: string; email: string; name: string }, level: Level) {
  const trackId = levelCertId(level);
  const existing = (await db.select().from(certificates).where(and(eq(certificates.userId, user.id), eq(certificates.trackId, trackId), isNull(certificates.revokedAt))).limit(1))[0];
  if (existing) return existing.code;
  for (let i = 0; i < 5; i++) {
    const code = certificateCode();
    try {
      await db.insert(certificates).values({ id: newId(), code, userId: user.id, trackId, nameOnCertificate: user.name });
      await audit(user.id, "certificate.issued", code, { trackId });
      await mails.certificate(user.email, `Level ${levelIndex(level) + 1} competence`, code);
      return code;
    } catch (e) {
      if ((e as { cause?: { code?: string } }).cause?.code !== "ER_DUP_ENTRY") throw e;
    }
  }
  throw new Error("could not allocate a certificate code");
}

/** Notes something the browser saw during a sitting, such as leaving full screen. Kept for the assessor. */
export async function logIncident(userId: string, attemptId: string, what: string, now = new Date()) {
  const a = (await db.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, userId), isNull(examAttempts.submittedAt))).limit(1))[0];
  if (!a) return;
  const list = (a.incidents as { at: string; what: string }[] | null) ?? [];
  if (list.length >= 100) return;
  await db.update(examAttempts).set({ incidents: [...list, { at: now.toISOString(), what: what.slice(0, 80) }] }).where(eq(examAttempts.id, a.id));
}
