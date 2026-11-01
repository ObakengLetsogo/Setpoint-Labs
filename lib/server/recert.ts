import "server-only";
import { and, desc, eq, gt, gte, isNotNull, isNull, lte, or } from "drizzle-orm";
import { certificates, entitlements, recertAttempts, users } from "@/db/schema";
import { CERT_YEARS, LEVEL_NAMES, RECERT_OPENS_DAYS, type Level } from "@/config/plans";
import { bankQuestion } from "@/data/exam-bank";
import { audit } from "./billing";
import { addYears } from "./certificates";
import { db } from "./db";
import { mails } from "./email";
import { ExamError, PASS_PCT, drawPaper } from "./exams";
import { newId } from "./ids";

// Recertification. Level certificates of competence last 3 years. From 90 days before expiry the
// learner can buy and sit a short recertification exam online: 20 questions from the level's
// exam bank in 30 minutes, 70 % to pass. A pass keeps the certificate code and moves the expiry
// on 3 years from the old expiry (or from today, if it had already lapsed). A fail uses the credit.

const DAY = 86_400_000;
const LATE_MS = 2 * 60_000;
export const RECERT_SPEC = { questions: 20, minutes: 30 };
type Paper = { ref: string; order: number[] }[];

function shuffle<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function levelCert(userId: string, level: Level) {
  return (await db.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.trackId, `level-${level}`), isNull(certificates.revokedAt))).limit(1))[0] ?? null;
}

export interface RecertStatus {
  level: Level;
  name: string;
  code: string;
  expiresAt: Date;
  expired: boolean;
  /** Can buy and sit the recertification exam now. */
  open: boolean;
  credits: number;
  canStart: boolean;
  blocked: string | null;
  openAttempt: string | null;
  lastPct: number | null;
}

/** One entry per level certificate the learner holds that expires. */
export async function recertStatuses(userId: string, now = new Date()): Promise<RecertStatus[]> {
  const out: RecertStatus[] = [];
  for (const level of ["F", "P", "E"] as Level[]) {
    const cert = await levelCert(userId, level);
    if (!cert?.expiresAt) continue;
    const attempts = await db.select().from(recertAttempts).where(and(eq(recertAttempts.userId, userId), eq(recertAttempts.level, level))).orderBy(desc(recertAttempts.startedAt));
    // Only payments and attempts since the certificate was last issued or renewed count.
    const since = cert.renewedAt ?? cert.issuedAt;
    const bought = (await db.select({ id: entitlements.id }).from(entitlements).where(and(eq(entitlements.userId, userId), eq(entitlements.planId, `recert-${level}`), eq(entitlements.status, "active"), gt(entitlements.endsAt, now), gte(entitlements.startsAt, since)))).length;
    const used = attempts.filter((a) => a.startedAt >= since).length;
    const credits = Math.max(0, bought - used);
    const open = cert.expiresAt.getTime() - now.getTime() <= RECERT_OPENS_DAYS * DAY;
    const live = attempts.find((a) => !a.submittedAt && a.deadlineAt.getTime() + LATE_MS > now.getTime());
    let blocked: string | null = null;
    if (!open) blocked = `Recertification opens ${RECERT_OPENS_DAYS} days before expiry.`;
    else if (live) blocked = "An attempt is in progress.";
    else if (!credits) blocked = "Buy the recertification exam to sit it.";
    out.push({ level, name: LEVEL_NAMES[level], code: cert.code, expiresAt: cert.expiresAt, expired: cert.expiresAt <= now, open, credits, canStart: !blocked, blocked, openAttempt: live?.id ?? null, lastPct: attempts.find((a) => a.submittedAt && a.startedAt >= since)?.pct ?? null });
  }
  return out;
}

export async function startRecert(userId: string, level: Level, now = new Date()) {
  const st = (await recertStatuses(userId, now)).find((s) => s.level === level);
  if (!st) throw new ExamError("You hold no certificate at this level to renew.");
  if (!st.canStart) throw new ExamError(st.blocked ?? "This exam cannot start.");
  const paper: Paper = drawPaper(level, RECERT_SPEC.questions).map((ref) => ({ ref, order: shuffle(bankQuestion(ref)!.options.map((_, k) => k)) }));
  const id = newId();
  const startedAt = new Date(Math.floor(now.getTime() / 1000) * 1000);
  await db.insert(recertAttempts).values({ id, userId, level, paper, startedAt, deadlineAt: new Date(startedAt.getTime() + RECERT_SPEC.minutes * 60_000) });
  await audit(userId, "recert.started", id, { level });
  return id;
}

export async function recertForLearner(userId: string, attemptId: string) {
  const a = (await db.select().from(recertAttempts).where(and(eq(recertAttempts.id, attemptId), eq(recertAttempts.userId, userId))).limit(1))[0];
  if (!a) return null;
  return {
    id: a.id,
    level: a.level as Level,
    deadlineAt: a.deadlineAt,
    submitted: Boolean(a.submittedAt),
    pct: a.pct,
    passed: a.passed,
    questions: (a.paper as Paper).map((p) => {
      const q = bankQuestion(p.ref)!;
      return { q: q.q, options: p.order.map((k) => q.options[k]) };
    }),
  };
}

export async function submitRecert(user: { id: string; email: string }, attemptId: string, answers: (number | null)[], now = new Date()) {
  const a = (await db.select().from(recertAttempts).where(and(eq(recertAttempts.id, attemptId), eq(recertAttempts.userId, user.id), isNull(recertAttempts.submittedAt))).limit(1))[0];
  if (!a) throw new ExamError("This attempt is already finished.");
  const paper = a.paper as Paper;
  const late = now.getTime() > a.deadlineAt.getTime() + LATE_MS;
  const given = late ? [] : answers;
  const right = paper.filter((p, k) => given[k] != null && p.order[given[k]!] === bankQuestion(p.ref)!.answer).length;
  const pct = Math.round((right / paper.length) * 100);
  const passed = pct >= PASS_PCT;
  await db.update(recertAttempts).set({ answers: given, submittedAt: now, pct, passed }).where(eq(recertAttempts.id, a.id));
  let expiresAt: Date | null = null;
  if (passed) {
    const cert = await levelCert(user.id, a.level as Level);
    if (cert?.expiresAt) {
      expiresAt = addYears(cert.expiresAt > now ? cert.expiresAt : now, CERT_YEARS);
      await db.update(certificates).set({ expiresAt, renewedAt: now, remindedDays: null }).where(eq(certificates.id, cert.id));
      await mails.recertified(user.email, LEVEL_NAMES[a.level as Level], cert.code, expiresAt.toISOString().slice(0, 10));
    }
  }
  await audit(user.id, "recert.submitted", a.id, { level: a.level, pct, passed, late });
  return { pct, passed, late, expiresAt };
}

/** Daily: remind holders 90 and 30 days before a level certificate expires, and once on expiry. */
export async function runExpiryReminders(now = new Date()) {
  let sent = 0;
  // Nearest edge first, so a certificate gets only the most urgent reminder it has not had.
  for (const days of [0, 30, 90]) {
    const edge = new Date(now.getTime() + days * DAY);
    const rows = await db
      .select({ c: certificates, email: users.email })
      .from(certificates)
      .innerJoin(users, eq(users.id, certificates.userId))
      .where(and(isNull(certificates.revokedAt), isNotNull(certificates.expiresAt), lte(certificates.expiresAt, edge), or(isNull(certificates.remindedDays), gt(certificates.remindedDays, days))));
    for (const { c, email } of rows) {
      const level = c.trackId.slice(-1) as Level;
      await mails.certExpiring(email, LEVEL_NAMES[level], c.code, c.expiresAt!.toISOString().slice(0, 10), days === 0);
      await db.update(certificates).set({ remindedDays: days }).where(eq(certificates.id, c.id));
      sent++;
    }
  }
  return { sent };
}
