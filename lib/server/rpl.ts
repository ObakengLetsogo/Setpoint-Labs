import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { rplApplications, users } from "@/db/schema";
import { LEVEL_NAMES, LEVELS, type Level } from "@/config/plans";
import { audit } from "./billing";
import { db } from "./db";
import { mails } from "./email";
import { ExamError } from "./exams";
import { newId } from "./ids";

// Recognition of Prior Learning. An experienced technician applies to be assessed at a level
// without the full course. An assessor reviews the experience and evidence, may ask for more,
// and approves (at the level asked or a lower one) or declines. Approval does not issue a
// certificate: it lets the candidate sit that level's exam, theory and practical, without passing
// the lower exams or buying the training. The exam and its requirements stay the same.

const DAY = 86_400_000;
export const RPL_REAPPLY_DAYS = 90;
export const RPL_MIN_EXPERIENCE = 400;

export async function rplFor(userId: string) {
  return db.select().from(rplApplications).where(eq(rplApplications.userId, userId)).orderBy(desc(rplApplications.submittedAt));
}

/** Levels a candidate has been approved for through RPL. */
export async function rplLevels(userId: string): Promise<Level[]> {
  const rows = await db.select({ l: rplApplications.approvedLevel }).from(rplApplications).where(and(eq(rplApplications.userId, userId), eq(rplApplications.status, "approved")));
  return rows.map((r) => r.l as Level).filter((l) => LEVELS.includes(l));
}

export interface RplInput {
  level: Level;
  years: number;
  jobTitle: string;
  employer: string;
  experience: string;
  evidence: string;
  qualifications: string;
}

function check(v: RplInput) {
  if (!LEVELS.includes(v.level)) throw new ExamError("Choose a level.");
  if (!(Number.isInteger(v.years) && v.years >= 1 && v.years <= 50)) throw new ExamError("Give your years of experience, from 1 to 50.");
  if (!v.jobTitle.trim()) throw new ExamError("Give your job title.");
  if (v.experience.trim().length < RPL_MIN_EXPERIENCE) throw new ExamError(`Describe your experience in at least ${RPL_MIN_EXPERIENCE} characters: the systems and brands you have worked on, what you programmed, commissioned or fault-found, and on what plant.`);
  if (v.evidence.trim().length < 30) throw new ExamError("List your evidence: links to documents or photos of your work, and the name and number of someone who can confirm it.");
}

/** Applies, or answers an assessor's request for more information. */
export async function applyRpl(user: { id: string }, v: RplInput, now = new Date()) {
  check(v);
  const all = await rplFor(user.id);
  const open = all.find((a) => a.status === "submitted" || a.status === "more_info");
  if (open?.status === "submitted") throw new ExamError("Your application is with an assessor. We will email you.");
  if ((await rplLevels(user.id)).some((l) => LEVELS.indexOf(l) >= LEVELS.indexOf(v.level))) throw new ExamError("You are already approved at this level or above.");
  const declined = all.find((a) => a.status === "declined");
  if (!open && declined?.decidedAt && now.getTime() - declined.decidedAt.getTime() < RPL_REAPPLY_DAYS * DAY)
    throw new ExamError(`You can apply again ${RPL_REAPPLY_DAYS} days after a decline, from ${new Date(declined.decidedAt.getTime() + RPL_REAPPLY_DAYS * DAY).toISOString().slice(0, 10)}.`);
  const values = { level: v.level, years: v.years, jobTitle: v.jobTitle.trim().slice(0, 120), employer: v.employer.trim().slice(0, 160) || null, experience: v.experience.trim(), evidence: v.evidence.trim(), qualifications: v.qualifications.trim() || null, status: "submitted" as const, submittedAt: now };
  if (open) {
    await db.update(rplApplications).set(values).where(eq(rplApplications.id, open.id));
    await audit(user.id, "rpl.resubmitted", open.id);
    return open.id;
  }
  const id = newId();
  await db.insert(rplApplications).values({ id, userId: user.id, ...values });
  await audit(user.id, "rpl.submitted", id, { level: v.level });
  return id;
}

export async function rplToReview() {
  return db
    .select({ a: rplApplications, name: users.name, email: users.email })
    .from(rplApplications)
    .innerJoin(users, eq(users.id, rplApplications.userId))
    .where(inArray(rplApplications.status, ["submitted"]))
    .orderBy(asc(rplApplications.submittedAt));
}

/** The assessor's decision. Approval may be at a lower level than asked. Feedback is required. */
export async function decideRpl(applicationId: string, assessorId: string, decision: "approve" | "more_info" | "decline", feedback: string, approvedLevel?: Level, now = new Date()) {
  const row = (await db.select({ a: rplApplications, email: users.email }).from(rplApplications).innerJoin(users, eq(users.id, rplApplications.userId)).where(eq(rplApplications.id, applicationId)).limit(1))[0];
  if (!row || row.a.status !== "submitted") throw new ExamError("This application is not waiting for a decision.");
  if (row.a.userId === assessorId) throw new ExamError("You cannot decide your own application.");
  if (feedback.trim().length < 20) throw new ExamError("Give the candidate feedback of at least 20 characters.");
  const asked = row.a.level as Level;
  const level = approvedLevel ?? asked;
  if (decision === "approve" && LEVELS.indexOf(level) > LEVELS.indexOf(asked)) throw new ExamError("Approve at the level asked or a lower one.");
  const status = decision === "approve" ? "approved" : decision === "decline" ? "declined" : "more_info";
  await db
    .update(rplApplications)
    .set({ status, approvedLevel: decision === "approve" ? level : null, assessorId, feedback: feedback.trim(), decidedAt: now })
    .where(eq(rplApplications.id, applicationId));
  await audit(assessorId, `rpl.${status}`, applicationId, { level: decision === "approve" ? level : asked });
  await mails.rplDecided(row.email, status, LEVEL_NAMES[decision === "approve" ? level : asked], feedback.trim());
}
