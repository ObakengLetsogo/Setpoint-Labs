import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { expertProjects, users } from "@/db/schema";
import { audit } from "./billing";
import { db } from "./db";
import { mails } from "./email";
import { ExamError, issueLevelIfComplete } from "./exams";
import { runProject } from "./assess";
import { newId } from "./ids";

// The Expert final plant project. Passing the Expert exam opens it for 30 days. The learner
// submits a program, marked at once by hidden tests, with a design note; an assessor then books
// a 30 minute interview and signs it off, or sends it back for one more 30 day attempt.

const DAY = 86_400_000;
export const PROJECT_DAYS = 30;
const fmt = (d: Date) => d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });

export async function projectFor(userId: string) {
  return (await db.select().from(expertProjects).where(eq(expertProjects.userId, userId)).orderBy(desc(expertProjects.opensAt)).limit(1))[0] ?? null;
}

/** Opens the project once, when the Expert exam is passed. */
export async function openProject(user: { id: string; email: string }, now = new Date()) {
  if (await projectFor(user.id)) return;
  const dueAt = new Date(now.getTime() + PROJECT_DAYS * DAY);
  await db.insert(expertProjects).values({ id: newId(), userId: user.id, opensAt: now, dueAt });
  await audit(user.id, "project.opened", null, { dueAt });
  await mails.projectOpen(user.email, fmt(dueAt));
}

export async function submitProject(userId: string, language: "ladder" | "st", source: string, notes: string, now = new Date()) {
  const p = await projectFor(userId);
  if (!p) throw new ExamError("Your final project opens when you pass the Expert exam.");
  if (p.outcome === "pass") throw new ExamError("Your project is already signed off.");
  if (now > p.dueAt) throw new ExamError("The 30 days for this project have passed. Contact us to arrange another attempt.");
  if (p.interviewAt && p.outcome === "pending") throw new ExamError("Your interview is booked; the project is locked until the assessor decides.");
  if (notes.trim().length < 200) throw new ExamError("Write a design note of at least 200 characters: what you built, how it handles faults, and how you tested it.");
  const r = runProject(language, source);
  // A resubmission after a failed review starts a fresh review.
  await db
    .update(expertProjects)
    .set({ language, source, notes, submittedAt: now, testsPassed: r.passed, results: r.results, outcome: "pending", assessorId: null, interviewAt: null, interviewLink: null, feedback: p.outcome === "fail" ? p.feedback : null, decidedAt: null })
    .where(eq(expertProjects.id, p.id));
  await audit(userId, "project.submitted", p.id, { passed: r.passed });
  return r;
}

/** Projects waiting for an assessor: submitted, passing every hidden test, not yet decided. */
export async function projectsToReview() {
  return db
    .select({ p: expertProjects, name: users.name, email: users.email })
    .from(expertProjects)
    .innerJoin(users, eq(users.id, expertProjects.userId))
    .where(and(isNotNull(expertProjects.submittedAt), eq(expertProjects.testsPassed, true), eq(expertProjects.outcome, "pending")))
    .orderBy(expertProjects.submittedAt);
}

export async function scheduleInterview(projectId: string, assessorId: string, at: Date, link: string, now = new Date()) {
  const p = (await db.select().from(expertProjects).where(eq(expertProjects.id, projectId)).limit(1))[0];
  if (!p || !p.testsPassed || p.outcome !== "pending") throw new ExamError("This project is not waiting for an interview.");
  if (at <= now) throw new ExamError("Choose a time in the future.");
  if (!/^https:\/\//.test(link)) throw new ExamError("Give a meeting link starting with https://.");
  await db.update(expertProjects).set({ assessorId, interviewAt: at, interviewLink: link }).where(eq(expertProjects.id, projectId));
  await audit(assessorId, "project.interview_booked", projectId, { at });
  const u = (await db.select().from(users).where(eq(users.id, p.userId)).limit(1))[0];
  if (u) await mails.interviewBooked(u.email, fmt(at), link);
}

/** The assessor's sign-off after the interview. A pass may complete the Expert certificate. */
export async function decideProject(projectId: string, assessorId: string, passed: boolean, feedback: string, now = new Date()) {
  const p = (await db.select().from(expertProjects).where(eq(expertProjects.id, projectId)).limit(1))[0];
  if (!p || p.outcome !== "pending" || !p.interviewAt) throw new ExamError("Book and hold the interview before deciding.");
  if (p.assessorId && p.assessorId !== assessorId) throw new ExamError("Only the assessor who booked the interview can sign it off.");
  if (feedback.trim().length < 20) throw new ExamError("Give the learner some feedback.");
  await db
    .update(expertProjects)
    .set({ outcome: passed ? "pass" : "fail", feedback, decidedAt: now, ...(passed ? {} : { dueAt: new Date(now.getTime() + PROJECT_DAYS * DAY) }) })
    .where(eq(expertProjects.id, projectId));
  await audit(assessorId, "project.decided", projectId, { passed });
  const u = (await db.select().from(users).where(eq(users.id, p.userId)).limit(1))[0];
  if (!u) return null;
  await mails.projectDecided(u.email, passed, feedback);
  return passed ? issueLevelIfComplete({ id: u.id, email: u.email, name: u.name }, "E") : null;
}
