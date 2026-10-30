import "server-only";
import { and, desc, eq, gt, inArray, isNotNull, lte } from "drizzle-orm";
import { entitlements, memberships, seats, users } from "@/db/schema";
import { GRACE_DAYS, LEVELS, levelsOf, planById, type Level } from "@/config/plans";
import { isFreeLesson, levelOfLesson } from "@/data/access";
import { db } from "./db";

const DAY = 24 * 60 * 60 * 1000;

export interface Access {
  paid: boolean;
  /** When paid access ends, grace included. */
  until: Date | null;
  /** Inside the grace days after a lapsed payment. */
  inGrace: boolean;
  planName: string | null;
  via: "personal" | "organisation" | null;
  /** The ladder levels whose training is open. */
  levels: Level[];
}

const NONE: Access = { paid: false, until: null, inGrace: false, planName: null, via: null, levels: [] };

/**
 * Paid access for a user: their own active entitlement, or a seat on an organisation's.
 * A lapsed entitlement keeps working for GRACE_DAYS so a failed renewal does not lock anyone out
 * mid lesson; admin revocations take effect at once.
 */
export async function accessFor(userId: string | null | undefined, now = new Date()): Promise<Access> {
  if (!userId) return NONE;
  const role = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0]?.role;
  // Platform staff see everything so they can support learners.
  if (role === "platform_admin") return { paid: true, until: null, inGrace: false, planName: "Staff access", via: null, levels: LEVELS };
  const graceStart = new Date(now.getTime() - GRACE_DAYS * DAY);

  const own = await db
    .select()
    .from(entitlements)
    .where(and(eq(entitlements.userId, userId), eq(entitlements.status, "active"), lte(entitlements.startsAt, now), gt(entitlements.endsAt, graceStart)))
    .orderBy(desc(entitlements.endsAt));

  const orgIds = (await db.select({ id: memberships.organisationId }).from(memberships).where(eq(memberships.userId, userId))).map((r) => r.id);
  let org: typeof own = [];
  if (orgIds.length) {
    const seat = await db
      .select({ e: entitlements })
      .from(seats)
      .innerJoin(entitlements, eq(entitlements.id, seats.entitlementId))
      .where(and(eq(seats.userId, userId), isNotNull(seats.assignedAt), inArray(entitlements.organisationId, orgIds), eq(entitlements.status, "active"), lte(entitlements.startsAt, now), gt(entitlements.endsAt, graceStart)))
      .orderBy(desc(entitlements.endsAt));
    org = seat.map((r) => r.e);
  }

  // Every entitlement still inside its grace counts; each opens the levels its plan covers.
  // Exam credits are entitlements too, but they open no training.
  const live = [...own.map((e) => ({ e, via: "personal" as const })), ...org.map((e) => ({ e, via: "organisation" as const }))]
    .filter((x) => levelsOf(x.e.planId).length > 0)
    .map((x) => ({ ...x, until: new Date(x.e.endsAt.getTime() + (x.e.source === "admin" ? 0 : GRACE_DAYS * DAY)) }))
    .filter((x) => x.until > now)
    .sort((a, b) => b.e.endsAt.getTime() - a.e.endsAt.getTime());
  if (!live.length) return NONE;
  const best = live[0];
  const levels = LEVELS.filter((l) => live.some((x) => levelsOf(x.e.planId).includes(l)));
  return { paid: true, until: best.until, inGrace: best.e.endsAt <= now, planName: planById(best.e.planId)?.name ?? best.e.planId, via: best.via, levels };
}

/** Whether a user's training covers a level. */
export async function hasLevel(userId: string | null | undefined, level: Level | undefined) {
  if (!level) return false;
  return (await accessFor(userId)).levels.includes(level);
}

export async function canOpenLesson(userId: string | null | undefined, lessonId: string) {
  if (isFreeLesson(lessonId)) return true;
  return hasLevel(userId, levelOfLesson(lessonId));
}
