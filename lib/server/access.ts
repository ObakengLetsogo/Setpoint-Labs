import "server-only";
import { and, desc, eq, gt, inArray, isNotNull, lte } from "drizzle-orm";
import { entitlements, memberships, seats, users } from "@/db/schema";
import { GRACE_DAYS, planById } from "@/config/plans";
import { isFreeLesson } from "@/data/access";
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
}

const NONE: Access = { paid: false, until: null, inGrace: false, planName: null, via: null };

/**
 * Paid access for a user: their own active entitlement, or a seat on an organisation's.
 * A lapsed entitlement keeps working for GRACE_DAYS so a failed renewal does not lock anyone out
 * mid lesson; admin revocations take effect at once.
 */
export async function accessFor(userId: string | null | undefined, now = new Date()): Promise<Access> {
  if (!userId) return NONE;
  const role = (await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0]?.role;
  // Platform staff see everything so they can support learners.
  if (role === "platform_admin") return { paid: true, until: null, inGrace: false, planName: "Staff access", via: null };
  const graceStart = new Date(now.getTime() - GRACE_DAYS * DAY);

  const own = await db
    .select()
    .from(entitlements)
    .where(and(eq(entitlements.userId, userId), eq(entitlements.status, "active"), lte(entitlements.startsAt, now), gt(entitlements.endsAt, graceStart)))
    .orderBy(desc(entitlements.endsAt))
    .limit(1);

  const orgIds = (await db.select({ id: memberships.organisationId }).from(memberships).where(eq(memberships.userId, userId))).map((r) => r.id);
  let org: (typeof own)[number] | undefined;
  if (orgIds.length) {
    const seat = await db
      .select({ e: entitlements })
      .from(seats)
      .innerJoin(entitlements, eq(entitlements.id, seats.entitlementId))
      .where(and(eq(seats.userId, userId), isNotNull(seats.assignedAt), inArray(entitlements.organisationId, orgIds), eq(entitlements.status, "active"), lte(entitlements.startsAt, now), gt(entitlements.endsAt, graceStart)))
      .orderBy(desc(entitlements.endsAt))
      .limit(1);
    org = seat[0]?.e;
  }

  const best = [own[0], org].filter(Boolean).sort((a, b) => b!.endsAt.getTime() - a!.endsAt.getTime())[0];
  if (!best) return NONE;
  const grace = best.source === "admin" ? 0 : GRACE_DAYS * DAY;
  const until = new Date(best.endsAt.getTime() + grace);
  if (until <= now) return NONE;
  return { paid: true, until, inGrace: best.endsAt <= now, planName: planById(best.planId)?.name ?? best.planId, via: best === org ? "organisation" : "personal" };
}

export async function canOpenLesson(userId: string | null | undefined, lessonId: string) {
  if (isFreeLesson(lessonId)) return true;
  return (await accessFor(userId)).paid;
}
