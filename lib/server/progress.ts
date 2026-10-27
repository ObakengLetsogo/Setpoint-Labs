import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { progress, quizAttempts, savedPrograms } from "@/db/schema";
import { metaOf } from "@/data/catalog";
import { isSandbox, sandboxRig } from "@/data/sandbox";
import { db } from "./db";
import { newId } from "./ids";

const RANK = { started: 0, ran: 1, completed: 2 } as const;

export async function progressOf(userId: string) {
  const [rows, quiz, programs] = await Promise.all([
    db.select().from(progress).where(eq(progress.userId, userId)),
    db
      .select({ lessonId: quizAttempts.lessonId, best: sql<number>`MAX(${quizAttempts.score})` })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .groupBy(quizAttempts.lessonId),
    db.select({ slot: savedPrograms.slot, language: savedPrograms.language, source: savedPrograms.source, updatedAt: savedPrograms.updatedAt }).from(savedPrograms).where(eq(savedPrograms.userId, userId)),
  ]);
  return {
    completed: rows.filter((r) => r.status === "completed").map((r) => r.lessonId),
    ran: rows.filter((r) => r.status !== "started").map((r) => r.lessonId),
    quiz: Object.fromEntries(quiz.map((q) => [q.lessonId, Number(q.best)])),
    programs,
  };
}

/** Records a lesson as run or completed. Status only ever moves forward. */
export async function markProgress(userId: string, lessonId: string, status: "ran" | "completed") {
  const now = new Date();
  const existing = (await db.select().from(progress).where(and(eq(progress.userId, userId), eq(progress.lessonId, lessonId))).limit(1))[0];
  if (existing && RANK[existing.status] >= RANK[status]) return;
  const row = { status, completedAt: status === "completed" ? now : null, updatedAt: now };
  if (existing) await db.update(progress).set(row).where(and(eq(progress.userId, userId), eq(progress.lessonId, lessonId)));
  else await db.insert(progress).values({ userId, lessonId, ...row });
}

export async function recordQuiz(userId: string, lessonId: string, score: number, total: number) {
  await db.insert(quizAttempts).values({ id: newId(), userId, lessonId, score, total });
}

/** Where a program may be saved: a real lesson, or a sandbox on a real machine. */
export function validSlot(slot: string) {
  return isSandbox(slot) ? Boolean(sandboxRig(slot)) : Boolean(metaOf(slot) && !metaOf(slot)!.locked);
}

export const rigOfSlot = (slot: string) => (isSandbox(slot) ? sandboxRig(slot)! : metaOf(slot)!.rig);

export async function saveProgram(userId: string, slot: string, language: "ladder" | "st", source: string) {
  await db
    .insert(savedPrograms)
    .values({ id: newId(), userId, slot, rigId: rigOfSlot(slot), language, source })
    .onDuplicateKeyUpdate({ set: { source, version: sql`${savedPrograms.version} + 1`, updatedAt: new Date() } });
}
