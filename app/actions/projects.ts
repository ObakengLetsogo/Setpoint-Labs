"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/server/auth";
import { ExamError } from "@/lib/server/exams";
import { decideProject, scheduleInterview, submitProject } from "@/lib/server/projects";
import { limited } from "@/lib/server/rateLimit";
import { applyRpl, decideRpl } from "@/lib/server/rpl";
import type { Level } from "@/config/plans";

const fail = (path: string, e: unknown): never => {
  if (e instanceof ExamError) redirect(`${path}?error=${encodeURIComponent(e.message)}`);
  throw e;
};

export async function sendProject(form: FormData) {
  const user = await requireUser("/exams/project");
  if (limited(`project:${user.id}`, 20, 60 * 60 * 1000)) redirect("/exams/project?error=busy");
  const language = form.get("language") === "st" ? "st" : "ladder";
  const source = String(form.get("source") ?? "").slice(0, 60_000);
  const notes = String(form.get("notes") ?? "").slice(0, 10_000);
  try {
    await submitProject(user.id, language, source, notes);
  } catch (e) {
    fail("/exams/project", e);
  }
  revalidatePath("/exams/project");
  redirect("/exams/project?sent=1");
}

export async function bookInterview(form: FormData) {
  const user = await requireRole(["assessor"], "/assessor");
  const at = new Date(`${String(form.get("at"))}:00+02:00`);
  try {
    await scheduleInterview(String(form.get("project")), user.id, at, String(form.get("link") ?? "").trim());
  } catch (e) {
    fail("/assessor", e);
  }
  revalidatePath("/assessor");
  redirect("/assessor?done=booked");
}

export async function signOff(form: FormData) {
  const user = await requireRole(["assessor"], "/assessor");
  try {
    await decideProject(String(form.get("project")), user.id, form.get("outcome") === "pass", String(form.get("feedback") ?? "").slice(0, 4000));
  } catch (e) {
    fail("/assessor", e);
  }
  revalidatePath("/assessor");
  redirect("/assessor?done=decided");
}

const lvl = (v: FormDataEntryValue | null) => (["F", "P", "E"].includes(String(v)) ? (String(v) as Level) : undefined);

export async function sendRpl(form: FormData) {
  const user = await requireUser("/rpl");
  if (limited(`rpl:${user.id}`, 10, 60 * 60 * 1000)) redirect("/rpl?error=busy");
  const t = (k: string, n: number) => String(form.get(k) ?? "").slice(0, n);
  try {
    await applyRpl(user, { level: lvl(form.get("level")) ?? ("X" as Level), years: Number(form.get("years")), jobTitle: t("jobTitle", 120), employer: t("employer", 160), experience: t("experience", 8000), evidence: t("evidence", 4000), qualifications: t("qualifications", 2000) });
  } catch (e) {
    fail("/rpl", e);
  }
  revalidatePath("/rpl");
  redirect("/rpl?sent=1");
}

export async function decideRplAction(form: FormData) {
  const user = await requireRole(["assessor"], "/assessor");
  const d = String(form.get("decision"));
  try {
    await decideRpl(String(form.get("application")), user.id, d === "approve" ? "approve" : d === "decline" ? "decline" : "more_info", String(form.get("feedback") ?? "").slice(0, 4000), lvl(form.get("approvedLevel")));
  } catch (e) {
    fail("/assessor", e);
  }
  revalidatePath("/assessor");
  redirect("/assessor?done=rpl");
}
