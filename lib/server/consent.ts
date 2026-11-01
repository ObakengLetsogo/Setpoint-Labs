import "server-only";
import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { emailVerifications, passwordResets, progress, quizAttempts, savedPrograms, sessions, users } from "@/db/schema";
import { audit } from "./billing";
import { db } from "./db";
import { mails } from "./email";
import { newToken, sha256 } from "./ids";

// Learners under 18 need a parent or guardian's consent to register, as POPIA requires for a
// child's personal information. Sign up asks for the date of birth; a minor also gives a parent or
// guardian's name and email. The account is created but held on /consent until that person opens
// the emailed link and agrees. If they refuse, or nobody answers within 30 days, the account and
// everything stored with it is deleted.

const DAY = 86_400_000;
export const ADULT_AGE = 18;
export const CONSENT_DAYS = 30;
export const MIN_AGE = 13;

/** Whole years between a birth date and a day. */
export function ageOn(birth: Date, now = new Date()) {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

/** Stores the guardian and emails them the consent link. Safe to call again to resend. */
export async function requestConsent(userId: string, guardianName: string, guardianEmail: string, now = new Date()) {
  const u = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!u) return;
  const email = guardianEmail.trim().toLowerCase();
  const token = newToken();
  await db.update(users).set({ guardianName: guardianName.trim().slice(0, 120), guardianEmail: email, guardianTokenHash: sha256(token), consentRequestedAt: u.consentRequestedAt ?? now }).where(eq(users.id, userId));
  await audit(userId, "consent.requested", userId);
  await mails.guardianConsent(email, guardianName.trim(), u.name, token);
}

export async function consentRequestFor(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const u = (await db.select().from(users).where(and(eq(users.guardianTokenHash, sha256(token)), isNull(users.guardianConsentAt))).limit(1))[0];
  return u ? { name: u.name, guardianName: u.guardianName ?? "", email: u.email } : null;
}

export async function giveConsent(token: string, now = new Date()) {
  const u = (await db.select().from(users).where(and(eq(users.guardianTokenHash, sha256(token)), isNull(users.guardianConsentAt))).limit(1))[0];
  if (!u) return false;
  await db.update(users).set({ guardianConsentAt: now, guardianTokenHash: null }).where(eq(users.id, u.id));
  await audit(null, "consent.given", u.id, { guardian: u.guardianEmail });
  await mails.consentGiven(u.email, u.name);
  return true;
}

/** The guardian refuses: the child's account is deleted. */
export async function refuseConsent(token: string) {
  const u = (await db.select().from(users).where(and(eq(users.guardianTokenHash, sha256(token)), isNull(users.guardianConsentAt))).limit(1))[0];
  if (!u) return false;
  await deleteAccount(u.id);
  await audit(null, "consent.refused", u.id);
  return true;
}

/** Removes an account that never got consent, with what it stored. It cannot have paid or sat exams. */
async function deleteAccount(userId: string) {
  for (const t of [sessions, emailVerifications, passwordResets, progress, savedPrograms, quizAttempts]) await db.delete(t).where(eq(t.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

/** Daily: delete accounts still waiting for consent after 30 days. */
export async function purgeUnconsented(now = new Date()) {
  const stale = await db
    .select({ id: users.id })
    .from(users)
    .where(and(isNotNull(users.consentRequestedAt), isNull(users.guardianConsentAt), lte(users.consentRequestedAt, new Date(now.getTime() - CONSENT_DAYS * DAY))));
  for (const s of stale) {
    await deleteAccount(s.id);
    await audit(null, "consent.expired", s.id);
  }
  return { deleted: stale.length };
}
