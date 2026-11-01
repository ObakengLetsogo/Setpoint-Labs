"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LEVELS, type Level } from "@/config/plans";
import { startRecert, submitRecert } from "@/lib/server/recert";
import { requireUser } from "@/lib/server/auth";
import { bookSitting, cancelSitting, openSitting } from "@/lib/server/centres";
import { ExamError, logIncident, startExam, submitExam } from "@/lib/server/exams";
import { startEndorsement, submitEndorsement } from "@/lib/server/endorsements";
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

export async function beginEndorsement(form: FormData) {
  const brand = String(form.get("brand"));
  const user = await requireUser("/exams");
  if (limited(`endorse:${user.id}`, 5, 60 * 60 * 1000)) redirect("/exams?error=busy");
  let id: string;
  try {
    id = await startEndorsement(user.id, brand);
  } catch (e) {
    if (e instanceof ExamError) redirect(`/exams?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/exams/e/${id}`);
}

export async function finishEndorsement(attemptId: string, answers: (number | null)[]): Promise<ExamResult> {
  const user = await requireUser(`/exams/e/${attemptId}`);
  try {
    const r = await submitEndorsement(user, attemptId, answers.slice(0, 100).map((a) => (Number.isInteger(a) ? a : null)));
    revalidatePath("/exams");
    return { theoryPct: r.pct, practical: true, passed: r.passed, late: r.late };
  } catch (e) {
    if (e instanceof ExamError) return { error: e.message };
    throw e;
  }
}

export async function beginRecert(form: FormData) {
  const level = String(form.get("level"));
  const user = await requireUser("/exams");
  if (!["F", "P", "E"].includes(level)) redirect("/exams");
  if (limited(`recert:${user.id}`, 5, 60 * 60 * 1000)) redirect("/exams?error=busy");
  let id: string;
  try {
    id = await startRecert(user.id, level as "F" | "P" | "E");
  } catch (e) {
    if (e instanceof ExamError) redirect(`/exams?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/exams/r/${id}`);
}

export async function finishRecert(attemptId: string, answers: (number | null)[]): Promise<ExamResult> {
  const user = await requireUser(`/exams/r/${attemptId}`);
  try {
    const r = await submitRecert(user, attemptId, answers.slice(0, 100).map((a) => (Number.isInteger(a) ? a : null)));
    revalidatePath("/exams");
    return { theoryPct: r.pct, practical: true, passed: r.passed, late: r.late };
  } catch (e) {
    if (e instanceof ExamError) return { error: e.message };
    throw e;
  }
}
