import "server-only";
import { and, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { memberships, subscriptions, users } from "@/db/schema";
import { GRACE_DAYS, planById } from "@/config/plans";
import { audit } from "./billing";
import { db } from "./db";
import { mails } from "./email";

const DAY = 24 * 60 * 60 * 1000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Daily: remind people three days before their access ends, and mark lapsed plans past due with an
 * email about the grace days. Locking needs no job: access checks compare dates on every request.
 */
export async function runRenewals(now = new Date()) {
  let reminded = 0;
  let lapsed = 0;
  const soon = new Date(now.getTime() + GRACE_DAYS * DAY);

  const due = await db
    .select({ s: subscriptions, email: users.email })
    .from(subscriptions)
    .leftJoin(users, eq(users.id, subscriptions.userId))
    .where(and(eq(subscriptions.status, "active"), isNull(subscriptions.renewalReminderAt), gt(subscriptions.currentPeriodEnd, now), lte(subscriptions.currentPeriodEnd, soon)));
  for (const { s, email } of due) {
    const to = email ?? (await orgContact(s.organisationId));
    if (to) await mails.renewalReminder(to, planById(s.planId)?.name ?? s.planId, ymd(s.currentPeriodEnd));
    await db.update(subscriptions).set({ renewalReminderAt: now }).where(eq(subscriptions.id, s.id));
    reminded++;
  }

  const ended = await db
    .select({ s: subscriptions, email: users.email })
    .from(subscriptions)
    .leftJoin(users, eq(users.id, subscriptions.userId))
    .where(and(eq(subscriptions.status, "active"), lte(subscriptions.currentPeriodEnd, now)));
  for (const { s, email } of ended) {
    const to = email ?? (await orgContact(s.organisationId));
    if (to) await mails.expired(to, planById(s.planId)?.name ?? s.planId, ymd(new Date(s.currentPeriodEnd.getTime() + GRACE_DAYS * DAY)));
    await db.update(subscriptions).set({ status: "past_due" }).where(eq(subscriptions.id, s.id));
    await audit(null, "subscription.lapsed", s.id);
    lapsed++;
  }
  return { reminded, lapsed };
}

/** The organisation's admin, who bought and renews its seats. */
async function orgContact(organisationId: string | null) {
  if (!organisationId) return null;
  const row = await db
    .select({ email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.organisationId, organisationId), inArray(memberships.role, ["employer_admin", "institution_admin"])))
    .limit(1);
  return row[0]?.email ?? null;
}
