import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { emailVerifications, passwordResets, sessions, users, ROLES } from "@/db/schema";
import { db } from "./db";
import { newId, newToken, sha256 } from "./ids";

export const SESSION_COOKIE = "sp_session";
const SESSION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export type Role = (typeof ROLES)[number];

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  verified: boolean;
  platform: string;
}

export const hashPassword = (password: string) => hash(password);
export const checkPassword = (stored: string, password: string) => verify(stored, password).catch(() => false);

/** Starts a session and sets its cookie. Only the hash of the token is stored. */
export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  const ua = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt, userAgent: ua });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

/** The signed in user, or null. Reads the session cookie, so call it behind a Suspense boundary. */
export async function currentUser(): Promise<SessionUser | null> {
  // The session check compares against the clock, so it always runs at request time.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, verifiedAt: users.emailVerifiedAt, platform: users.platform })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const u = rows[0];
  return u ? { id: u.id, email: u.email, name: u.name, role: u.role, verified: Boolean(u.verifiedAt), platform: u.platform } : null;
}

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireRole(roles: Role[], next = "/account"): Promise<SessionUser> {
  const u = await requireUser(next);
  if (!roles.includes(u.role) && u.role !== "platform_admin") redirect("/account?denied=1");
  return u;
}

export const normaliseEmail = (e: string) => e.trim().toLowerCase();

export async function findUserByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, normaliseEmail(email))).limit(1);
  return rows[0] ?? null;
}

export async function createUser(input: { email: string; name: string; password: string }) {
  const id = newId();
  await db.insert(users).values({ id, email: normaliseEmail(input.email), name: input.name.trim(), passwordHash: await hashPassword(input.password) });
  return id;
}

// ── One time tokens for links in emails ─────────────────────────────────────

export async function issueVerification(userId: string) {
  const token = newToken();
  await db.insert(emailVerifications).values({ tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + 2 * DAY) });
  return token;
}

/** Marks the email verified if the token is valid and unused. Returns the user id. */
export async function consumeVerification(token: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(emailVerifications)
    .where(and(eq(emailVerifications.tokenHash, sha256(token)), gt(emailVerifications.expiresAt, new Date()), isNull(emailVerifications.usedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  await db.update(emailVerifications).set({ usedAt: new Date() }).where(eq(emailVerifications.tokenHash, row.tokenHash));
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));
  return row.userId;
}

export async function issuePasswordReset(userId: string) {
  const token = newToken();
  await db.insert(passwordResets).values({ tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
  return token;
}

/** Sets a new password and signs out every session. Returns the user id, or null for a bad token. */
export async function consumePasswordReset(token: string, password: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, sha256(token)), gt(passwordResets.expiresAt, new Date()), isNull(passwordResets.usedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.tokenHash, row.tokenHash));
  // The link went to their inbox, so using it also confirms the address; invited learners start here.
  const user = (await db.select({ verified: users.emailVerifiedAt }).from(users).where(eq(users.id, row.userId)).limit(1))[0];
  await db.update(users).set({ passwordHash: await hashPassword(password), ...(user?.verified ? {} : { emailVerifiedAt: new Date() }) }).where(eq(users.id, row.userId));
  await db.delete(sessions).where(eq(sessions.userId, row.userId));
  return row.userId;
}
