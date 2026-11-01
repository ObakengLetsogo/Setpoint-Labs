import "server-only";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { endorsementAttempts, entitlements } from "@/db/schema";
import { BRANDS, ENDORSE_BANKS, ENDORSE_SPEC } from "@/data/exam-bank/endorsements";
import { audit } from "./billing";
import { hasLevel } from "./access";
import { db } from "./db";
import { issueCertificate } from "./certificates";
import { ExamError, PASS_PCT, issueLevelIfComplete } from "./exams";
import { newId } from "./ids";

// Platform endorsement exams: 20 questions in 45 minutes on one brand, 70 % to pass, written
// online. Each payment is one attempt. Passing issues the endorsement certificate and may complete
// a level certificate that was waiting for it.

const LATE_MS = 2 * 60_000;
type Paper = { i: number; order: number[] }[];

function shuffle<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const brandOf = (id: string) => BRANDS.find((b) => b.id === id);

export interface EndorsementStatus {
  brand: string;
  name: string;
  passed: boolean;
  credits: number;
  canStart: boolean;
  blocked: string | null;
  openAttempt: string | null;
  lastPct: number | null;
}

export async function endorsementStatus(userId: string, brand: string, now = new Date()): Promise<EndorsementStatus> {
  const b = brandOf(brand);
  if (!b) throw new ExamError("Unknown platform.");
  const attempts = await db.select().from(endorsementAttempts).where(and(eq(endorsementAttempts.userId, userId), eq(endorsementAttempts.brand, brand))).orderBy(desc(endorsementAttempts.startedAt));
  const bought = (await db.select({ id: entitlements.id }).from(entitlements).where(and(eq(entitlements.userId, userId), eq(entitlements.planId, `endorse-${brand}`), eq(entitlements.status, "active"), gt(entitlements.endsAt, now)))).length;
  const credits = Math.max(0, bought - attempts.length);
  const passed = attempts.some((a) => a.passed);
  const open = attempts.find((a) => !a.submittedAt && a.deadlineAt.getTime() + LATE_MS > now.getTime());
  const last = attempts.find((a) => a.submittedAt);
  let blocked: string | null = null;
  if (passed) blocked = "Already passed.";
  else if (open) blocked = "An attempt is in progress.";
  else if (!(await hasLevel(userId, "P"))) blocked = "Platform endorsements come with Professional training.";
  else if (!credits) blocked = "Buy this endorsement exam to sit it.";
  return { brand, name: b.name, passed, credits, canStart: !blocked, blocked, openAttempt: open?.id ?? null, lastPct: last?.pct ?? null };
}

export async function startEndorsement(userId: string, brand: string, now = new Date()) {
  const st = await endorsementStatus(userId, brand, now);
  if (!st.canStart) throw new ExamError(st.blocked ?? "This exam cannot start.");
  const bank = ENDORSE_BANKS[brand];
  const paper: Paper = shuffle(bank.map((_, i) => i))
    .slice(0, ENDORSE_SPEC.questions)
    .map((i) => ({ i, order: shuffle(bank[i].options.map((_, k) => k)) }));
  const id = newId();
  const startedAt = new Date(Math.floor(now.getTime() / 1000) * 1000);
  await db.insert(endorsementAttempts).values({ id, userId, brand, paper, startedAt, deadlineAt: new Date(startedAt.getTime() + ENDORSE_SPEC.minutes * 60_000) });
  await audit(userId, "endorsement.started", id, { brand });
  return id;
}

/** The paper as the learner sees it: no answers. */
export async function endorsementForLearner(userId: string, attemptId: string) {
  const a = (await db.select().from(endorsementAttempts).where(and(eq(endorsementAttempts.id, attemptId), eq(endorsementAttempts.userId, userId))).limit(1))[0];
  if (!a) return null;
  const bank = ENDORSE_BANKS[a.brand];
  return {
    id: a.id,
    brand: a.brand,
    name: brandOf(a.brand)?.name ?? a.brand,
    deadlineAt: a.deadlineAt,
    submitted: Boolean(a.submittedAt),
    pct: a.pct,
    passed: a.passed,
    questions: (a.paper as Paper).map((p) => ({ q: bank[p.i].q, options: p.order.map((k) => bank[p.i].options[k]) })),
  };
}

export async function submitEndorsement(user: { id: string; email: string; name: string }, attemptId: string, answers: (number | null)[], now = new Date()) {
  const a = (await db.select().from(endorsementAttempts).where(and(eq(endorsementAttempts.id, attemptId), eq(endorsementAttempts.userId, user.id), isNull(endorsementAttempts.submittedAt))).limit(1))[0];
  if (!a) throw new ExamError("This attempt is already finished.");
  const bank = ENDORSE_BANKS[a.brand];
  const paper = a.paper as Paper;
  const late = now.getTime() > a.deadlineAt.getTime() + LATE_MS;
  const given = late ? [] : answers;
  const right = paper.filter((p, k) => given[k] != null && p.order[given[k]!] === bank[p.i].answer).length;
  const pct = Math.round((right / paper.length) * 100);
  const passed = pct >= PASS_PCT;
  await db.update(endorsementAttempts).set({ answers: given, submittedAt: now, pct, passed }).where(eq(endorsementAttempts.id, a.id));
  await audit(user.id, "endorsement.submitted", a.id, { brand: a.brand, pct, passed, late });
  let certificate: string | null = null;
  if (passed) {
    certificate = await issueCertificate(user, `endorse-${a.brand}`);
    // A level certificate may have been waiting for this endorsement.
    await issueLevelIfComplete(user, "P");
    await issueLevelIfComplete(user, "E");
  }
  return { pct, passed, late, certificate };
}
