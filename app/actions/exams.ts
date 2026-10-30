"use server";

import { redirect } from "next/navigation";
import { LEVELS, type Level } from "@/config/plans";
import { requireUser } from "@/lib/server/auth";
import { ExamError, startExam, submitExam } from "@/lib/server/exams";
import { limited } from "@/lib/server/rateLimit";

export async function beginExam(form: FormData) {
  const level = String(form.get("level")) as Level;
  const user = await requireUser("/exams");
  if (!LEVELS.includes(level)) redirect("/exams");
  if (limited(`exam:${user.id}`, 5, 60 * 60 * 1000)) redirect("/exams?error=busy");
  let id: string;
  try {
    id = await startExam(user.id, level);
  } catch (e) {
    if (e instanceof ExamError) redirect(`/exams?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/exams/${id}`);
}

export type ExamResult = { theoryPct: number; practical: boolean; passed: boolean; late: boolean } | { error: string };

export async function finishExam(attemptId: string, answers: (number | null)[]): Promise<ExamResult> {
  const user = await requireUser(`/exams/${attemptId}`);
  try {
    return await submitExam(user, attemptId, answers.slice(0, 200).map((a) => (Number.isInteger(a) ? a : null)));
  } catch (e) {
    if (e instanceof ExamError) return { error: e.message };
    throw e;
  }
}
