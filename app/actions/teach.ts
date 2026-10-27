"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assignments, cohortMembers, cohorts, organisations, submissions } from "@/db/schema";
import { metaOf } from "@/data/catalog";
import { PLATFORMS } from "@/engine/platforms";
import { requireUser } from "@/lib/server/auth";
import { audit } from "@/lib/server/billing";
import { db } from "@/lib/server/db";
import { newId } from "@/lib/server/ids";
import { addLearners, canManage, isOrgAdmin } from "@/lib/server/orgs";
import type { FormState } from "./auth";

async function manager(orgId: string) {
  const user = await requireUser(`/teach/${orgId}`);
  if (!(await canManage(user, orgId))) throw new Error("not allowed");
  return user;
}

/** Lines of "email, name", pasted or from a CSV file with an email column. */
function parseRoster(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const header = lines[0]?.toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, "")) ?? [];
  const hasHeader = header.includes("email");
  const ei = hasHeader ? header.indexOf("email") : 0;
  const ni = hasHeader ? header.findIndex((h) => h === "name" || h === "full name") : 1;
  return (hasHeader ? lines.slice(1) : lines).map((l) => {
    const cells = l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return { email: cells[ei] ?? "", name: ni >= 0 ? (cells[ni] ?? "") : "" };
  });
}

export async function importLearners(_: FormState, form: FormData): Promise<FormState> {
  const orgId = String(form.get("orgId"));
  const user = await manager(orgId);
  const file = form.get("file");
  const text = file instanceof File && file.size ? await file.text() : String(form.get("roster") ?? "");
  const rows = parseRoster(text).slice(0, 2000);
  if (!rows.length) return { error: "Paste one learner per line as: email, name. Or choose a CSV file with an email column." };
  const cohortId = String(form.get("cohortId") ?? "") || undefined;
  const r = await addLearners(orgId, rows, user, cohortId);
  revalidatePath(`/teach/${orgId}`);
  return { ok: `${r.added} added, ${r.created} invited by email${r.unseated ? `, ${r.unseated} without a seat: buy more seats to give them access` : ""}.` };
}

const Cohort = z.object({ orgId: z.string(), name: z.string().trim().min(1, "Name the class.").max(120), platform: z.string().optional() });

export async function createCohort(_: FormState, form: FormData): Promise<FormState> {
  const p = Cohort.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const user = await manager(p.data.orgId);
  const lock = PLATFORMS.some((x) => x.id === p.data.platform) ? p.data.platform! : null;
  await db.insert(cohorts).values({ id: newId(), organisationId: p.data.orgId, name: p.data.name, teacherId: user.id, platformLock: lock });
  revalidatePath(`/teach/${p.data.orgId}`);
  return { ok: `Class ${p.data.name} created.` };
}

async function cohortOrg(cohortId: string) {
  return (await db.select({ orgId: cohorts.organisationId }).from(cohorts).where(eq(cohorts.id, cohortId)).limit(1))[0]?.orgId;
}

export async function addAssignment(_: FormState, form: FormData): Promise<FormState> {
  const cohortId = String(form.get("cohortId"));
  const orgId = await cohortOrg(cohortId);
  if (!orgId) return { error: "Unknown class." };
  const user = await manager(orgId);
  const lessonId = String(form.get("lessonId"));
  if (!metaOf(lessonId)) return { error: "Choose a lesson." };
  const due = String(form.get("due") ?? "");
  await db.insert(assignments).values({ id: newId(), cohortId, lessonId, dueAt: due ? new Date(`${due}T23:59:59Z`) : null });
  await audit(user.id, "assignment.created", cohortId, { lessonId, due });
  revalidatePath(`/teach/${orgId}/classes/${cohortId}`);
  return { ok: "Assigned." };
}

export async function gradeAssignment(form: FormData) {
  const assignmentId = String(form.get("assignmentId"));
  const userId = String(form.get("userId"));
  const a = (await db.select().from(assignments).where(eq(assignments.id, assignmentId)).limit(1))[0];
  if (!a) return;
  const orgId = await cohortOrg(a.cohortId);
  if (!orgId) return;
  const grader = await manager(orgId);
  const member = await db.select().from(cohortMembers).where(and(eq(cohortMembers.cohortId, a.cohortId), eq(cohortMembers.userId, userId))).limit(1);
  if (!member[0]) return;
  const grade = form.get("grade") === "" ? null : Math.max(0, Math.min(100, Number(form.get("grade"))));
  const feedback = String(form.get("feedback") ?? "").slice(0, 2000) || null;
  const existing = (await db.select().from(submissions).where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.userId, userId))).limit(1))[0];
  if (existing) await db.update(submissions).set({ grade, feedback }).where(eq(submissions.id, existing.id));
  else await db.insert(submissions).values({ id: newId(), assignmentId, userId, source: "", language: "ladder", passed: false, grade, feedback });
  await audit(grader.id, "assignment.graded", assignmentId, { userId, grade });
  revalidatePath(`/teach/${orgId}/classes/${a.cohortId}`);
}

export async function saveOrgSettings(_: FormState, form: FormData): Promise<FormState> {
  const orgId = String(form.get("orgId"));
  const user = await manager(orgId);
  if (!(await isOrgAdmin(user, orgId))) return { error: "Only the organisation's admin can change these." };
  const platform = String(form.get("platform") ?? "");
  const certificateName = String(form.get("certificateName") ?? "").trim().slice(0, 160) || null;
  await db.update(organisations).set({ platformLock: PLATFORMS.some((p) => p.id === platform) ? platform : null, certificateName }).where(eq(organisations.id, orgId));
  await audit(user.id, "org.settings", orgId, { platform, certificateName });
  revalidatePath(`/teach/${orgId}`);
  return { ok: "Saved." };
}
