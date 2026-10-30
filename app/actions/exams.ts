"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LEVELS, type Level } from "@/config/plans";
import { requireUser } from "@/lib/server/auth";
import { bookSitting, cancelSitting, openSitting } from "@/lib/server/centres";
import { ExamError, logIncident, startExam, submitExam } from "@/lib/server/exams";
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

function back(msg: string): never {
  redirect(`/exams?error=${encodeURIComponent(msg)}`);
}

export async function bookExam(form: FormData) {
  const user = await requireUser("/exams");
  const level = String(form.get("level")) as Level;
  const [centreId, iso] = String(form.get("session") ?? "").split("|");
  if (!LEVELS.includes(level) || !centreId || !iso) back("Pick a centre and a session.");
  try {
    await bookSitting(user.id, level, centreId, new Date(iso));
  } catch (e) {
    if (e instanceof ExamError) back(e.message);
    throw e;
  }
  revalidatePath("/exams");
  redirect("/exams?booked=1");
}

export async function cancelBooking(form: FormData) {
  const user = await requireUser("/exams");
  try {
    await cancelSitting(user.id, String(form.get("booking")));
  } catch (e) {
    if (e instanceof ExamError) back(e.message);
    throw e;
  }
  revalidatePath("/exams");
  redirect("/exams");
}

export async function openAtCentre(form: FormData) {
  const user = await requireUser("/exams");
  if (limited(`centre-code:${user.id}`, 8, 60 * 60 * 1000)) back("Too many code attempts. Ask the invigilator to contact Setpoint Labs.");
  let id: string;
  try {
    id = await openSitting(user.id, String(form.get("booking")), String(form.get("code") ?? ""));
  } catch (e) {
    if (e instanceof ExamError) back(e.message);
    throw e;
  }
  redirect(`/exams/${id}`);
}

export async function reportIncident(attemptId: string, what: string) {
  const user = await requireUser(`/exams/${attemptId}`);
  if (limited(`incident:${user.id}`, 200, 60 * 60 * 1000)) return;
  await logIncident(user.id, attemptId, what);
}
