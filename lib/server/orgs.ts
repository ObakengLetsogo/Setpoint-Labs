import "server-only";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { assignments, certificates, cohortMembers, cohorts, entitlements, memberships, organisations, progress, quizAttempts, seats, submissions, users } from "@/db/schema";
import { catalog } from "@/data/catalog";
import type { SessionUser } from "./auth";
import { assignSeat, audit } from "./billing";
import { db } from "./db";
import { mails } from "./email";
import { issuePasswordReset, normaliseEmail } from "./auth";
import { newId } from "./ids";

const MANAGERS = ["teacher", "employer_admin", "institution_admin"] as const;

/** Organisations this person may see the learners of. */
export async function managedOrgs(user: SessionUser) {
  if (user.role === "platform_admin") return db.select().from(organisations).orderBy(organisations.name);
  return db
    .select({ id: organisations.id, name: organisations.name, kind: organisations.kind, platformLock: organisations.platformLock, certificateName: organisations.certificateName, createdAt: organisations.createdAt })
    .from(memberships)
    .innerJoin(organisations, eq(organisations.id, memberships.organisationId))
    .where(and(eq(memberships.userId, user.id), inArray(memberships.role, [...MANAGERS])));
}

export async function canManage(user: SessionUser, organisationId: string) {
  return (await managedOrgs(user)).some((o) => o.id === organisationId);
}

/** Whether this person runs the organisation (admins), as opposed to teaching in it. */
export async function isOrgAdmin(user: SessionUser, organisationId: string) {
  if (user.role === "platform_admin") return true;
  const m = (await db.select().from(memberships).where(and(eq(memberships.userId, user.id), eq(memberships.organisationId, organisationId))).limit(1))[0];
  return m?.role === "employer_admin" || m?.role === "institution_admin";
}

export async function seatUsage(organisationId: string) {
  const now = new Date();
  const rows = await db
    .select({ total: sql<number>`COUNT(*)`, used: sql<number>`SUM(${seats.userId} IS NOT NULL)` })
    .from(seats)
    .innerJoin(entitlements, eq(entitlements.id, seats.entitlementId))
    .where(and(eq(seats.organisationId, organisationId), eq(entitlements.status, "active"), sql`${entitlements.endsAt} > ${now}`));
  return { total: Number(rows[0]?.total ?? 0), used: Number(rows[0]?.used ?? 0) };
}

export interface LearnerRow {
  id: string;
  name: string;
  email: string;
  role: string;
  seated: boolean;
  completed: number;
  quizAvg: number | null;
  certificates: string[];
  lastActive: Date | null;
  cohorts: string[];
}

/** One row per member with their progress, for the dashboard and the CSV export. */
export async function learners(organisationId: string): Promise<LearnerRow[]> {
  const members = await db
    .select({ id: users.id, name: users.name, email: users.email, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.organisationId, organisationId))
    .orderBy(users.name);
  if (!members.length) return [];
  const ids = members.map((m) => m.id);
  const [done, quiz, certs, seated, cohortRows] = await Promise.all([
    db
      .select({ userId: progress.userId, n: sql<number>`SUM(${progress.status} = 'completed')`, last: sql<Date>`MAX(${progress.updatedAt})` })
      .from(progress)
      .where(inArray(progress.userId, ids))
      .groupBy(progress.userId),
    db
      .select({ userId: quizAttempts.userId, avg: sql<number>`AVG(${quizAttempts.score} * 100 / ${quizAttempts.total})` })
      .from(quizAttempts)
      .where(inArray(quizAttempts.userId, ids))
      .groupBy(quizAttempts.userId),
    db.select({ userId: certificates.userId, trackId: certificates.trackId }).from(certificates).where(and(inArray(certificates.userId, ids), sql`${certificates.revokedAt} IS NULL`)),
    db.select({ userId: seats.userId }).from(seats).where(and(eq(seats.organisationId, organisationId), isNotNull(seats.userId))),
    db
      .select({ userId: cohortMembers.userId, name: cohorts.name })
      .from(cohortMembers)
      .innerJoin(cohorts, eq(cohorts.id, cohortMembers.cohortId))
      .where(and(eq(cohorts.organisationId, organisationId), inArray(cohortMembers.userId, ids))),
  ]);
  return members.map((m) => ({
    ...m,
    seated: seated.some((s) => s.userId === m.id),
    completed: Number(done.find((d) => d.userId === m.id)?.n ?? 0),
    quizAvg: quiz.find((q) => q.userId === m.id) ? Math.round(Number(quiz.find((q) => q.userId === m.id)!.avg)) : null,
    certificates: certs.filter((c) => c.userId === m.id).map((c) => c.trackId),
    lastActive: done.find((d) => d.userId === m.id)?.last ? new Date(done.find((d) => d.userId === m.id)!.last) : null,
    cohorts: cohortRows.filter((c) => c.userId === m.id).map((c) => c.name),
  }));
}

export const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Leading = + - @ would run as a formula in a spreadsheet.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/**
 * Adds people to an organisation. New emails get an account and a link to set their password;
 * everyone gets a seat while seats last.
 */
export async function addLearners(organisationId: string, rows: { email: string; name: string }[], actor: SessionUser, cohortId?: string) {
  let created = 0;
  let added = 0;
  let unseated = 0;
  for (const r of rows) {
    const email = normaliseEmail(r.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    let user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (!user) {
      const id = newId();
      await db.insert(users).values({ id, email, name: r.name.trim() || email.split("@")[0], passwordHash: null, emailVerifiedAt: null });
      user = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
      // The reset link doubles as an invitation: choosing a password also proves the address.
      await mails.reset(email, await issuePasswordReset(id));
      created++;
    }
    const existing = await db.select().from(memberships).where(and(eq(memberships.userId, user.id), eq(memberships.organisationId, organisationId))).limit(1);
    if (!existing[0]) {
      await db.insert(memberships).values({ userId: user.id, organisationId, role: "learner" });
      added++;
    }
    if (!(await assignSeat(organisationId, user.id))) unseated++;
    if (cohortId) await db.insert(cohortMembers).values({ cohortId, userId: user.id }).onDuplicateKeyUpdate({ set: { userId: user.id } });
  }
  await audit(actor.id, "org.learners_added", organisationId, { created, added, unseated });
  return { created, added, unseated };
}

export async function cohortsOf(organisationId: string) {
  const rows = await db.select().from(cohorts).where(eq(cohorts.organisationId, organisationId)).orderBy(cohorts.name);
  const counts = await db
    .select({ cohortId: cohortMembers.cohortId, n: sql<number>`COUNT(*)` })
    .from(cohortMembers)
    .where(rows.length ? inArray(cohortMembers.cohortId, rows.map((r) => r.id)) : sql`FALSE`)
    .groupBy(cohortMembers.cohortId);
  return rows.map((r) => ({ ...r, size: Number(counts.find((c) => c.cohortId === r.id)?.n ?? 0) }));
}

/** Each assignment with who in the cohort has completed the lesson, and any grade given. */
export async function assignmentBoard(cohortId: string) {
  const list = await db.select().from(assignments).where(eq(assignments.cohortId, cohortId)).orderBy(desc(assignments.createdAt));
  const members = await db.select({ id: users.id, name: users.name }).from(cohortMembers).innerJoin(users, eq(users.id, cohortMembers.userId)).where(eq(cohortMembers.cohortId, cohortId)).orderBy(users.name);
  const ids = members.map((m) => m.id);
  const done = ids.length && list.length ? await db.select().from(progress).where(and(inArray(progress.userId, ids), inArray(progress.lessonId, list.map((a) => a.lessonId)))) : [];
  const grades = list.length ? await db.select().from(submissions).where(inArray(submissions.assignmentId, list.map((a) => a.id))) : [];
  return {
    members,
    assignments: list.map((a) => ({
      ...a,
      title: catalog.find((l) => l.id === a.lessonId)?.title ?? a.lessonId,
      chip: catalog.find((l) => l.id === a.lessonId)?.chip ?? "",
      status: Object.fromEntries(
        members.map((m) => {
          const p = done.find((d) => d.userId === m.id && d.lessonId === a.lessonId);
          const g = grades.find((s) => s.assignmentId === a.id && s.userId === m.id);
          return [m.id, { completed: p?.status === "completed", late: Boolean(p?.completedAt && a.dueAt && p.completedAt > a.dueAt), grade: g?.grade ?? null, feedback: g?.feedback ?? null }];
        }),
      ),
    })),
  };
}

/** The platform a member must use, if their organisation or cohort locks one. */
export async function platformLockFor(userId: string) {
  const viaCohort = await db
    .select({ lock: cohorts.platformLock })
    .from(cohortMembers)
    .innerJoin(cohorts, eq(cohorts.id, cohortMembers.cohortId))
    .where(and(eq(cohortMembers.userId, userId), isNotNull(cohorts.platformLock)))
    .limit(1);
  if (viaCohort[0]?.lock) return viaCohort[0].lock;
  const viaOrg = await db
    .select({ lock: organisations.platformLock })
    .from(memberships)
    .innerJoin(organisations, eq(organisations.id, memberships.organisationId))
    .where(and(eq(memberships.userId, userId), isNotNull(organisations.platformLock)))
    .limit(1);
  return viaOrg[0]?.lock ?? null;
}
