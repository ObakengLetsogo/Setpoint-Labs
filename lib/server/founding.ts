import "server-only";
import { eq, isNotNull, sql } from "drizzle-orm";
import { users } from "@/db/schema";
import { audit } from "./billing";
import { db } from "./db";

// The founding member badge: the first 100 learners to get paid training, bought themselves or
// given a seat, carry a numbered badge on their profile, verify page and certificates.

export const FOUNDING_SEATS = 100;

/** Gives the learner the next founding number if any are left. Returns their number, or null. */
export async function claimFounding(userId: string) {
  const me = (await db.select({ n: users.foundingNumber, role: users.role }).from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!me) return null;
  if (me.n != null) return me.n;
  if (me.role === "platform_admin") return null;
  // Two learners paying at once may pick the same number; the unique index stops one, which retries.
  for (let i = 0; i < 5; i++) {
    const top = Number((await db.select({ n: sql<number>`COALESCE(MAX(${users.foundingNumber}), 0)` }).from(users).where(isNotNull(users.foundingNumber)))[0]?.n ?? 0);
    if (top >= FOUNDING_SEATS) return null;
    try {
      await db.update(users).set({ foundingNumber: top + 1 }).where(eq(users.id, userId));
      await audit(userId, "founding.claimed", userId, { n: top + 1 });
      return top + 1;
    } catch (e) {
      if ((e as { cause?: { code?: string } }).cause?.code !== "ER_DUP_ENTRY") throw e;
    }
  }
  return null;
}

export const foundingLabel = (n: number | null | undefined) => (n ? `Founding member #${n}` : null);
