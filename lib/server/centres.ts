import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { examBookings, examCentres } from "@/db/schema";
import type { Level } from "@/config/plans";
import { audit } from "./billing";
import { db } from "./db";
import { ExamError, NO_SHOW_MS, examStatus, startExam } from "./exams";
import { newId } from "./ids";

// Exam centres and sittings. A learner books a session at a centre; on the day the invigilator
// checks their ID and types the centre's code on the learner's screen, which opens the paper.

const HOUR = 3_600_000;
/** Sessions start at 09:00 and 13:00 South African time (UTC+2), Monday to Friday. */
export const SESSION_HOURS_UTC = [7, 11];
export const SEATS_PER_SESSION = 10;
const BOOK_AHEAD_DAYS = 45;
/** Bookings close this long before a session, and can be changed for free until 48 hours before. */
const MIN_NOTICE_MS = 24 * HOUR;
export const FREE_CHANGE_MS = 48 * HOUR;
/** The invigilator can open a sitting from 30 minutes before to 60 minutes after its start. */
const OPEN_BEFORE_MS = 30 * 60_000;
const OPEN_AFTER_MS = 60 * 60_000;

export async function createCentre(input: { name: string; area: string; address: string; code: string }, actorId: string) {
  const id = newId();
  await db.insert(examCentres).values({ id, name: input.name, area: input.area, address: input.address, codeHash: await hash(input.code) });
  await audit(actorId, "centre.created", id, { name: input.name });
  return id;
}

export const activeCentres = () => db.select({ id: examCentres.id, name: examCentres.name, area: examCentres.area, address: examCentres.address }).from(examCentres).where(eq(examCentres.active, true));

/** Session start times a centre offers from tomorrow on, with the seats left in each. */
export async function sessionsAt(centreId: string, now = new Date()) {
  const times: Date[] = [];
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (let d = 0; d <= BOOK_AHEAD_DAYS; d++) {
    const date = new Date(day.getTime() + d * 24 * HOUR);
    const wd = date.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    for (const h of SESSION_HOURS_UTC) {
      const t = new Date(date.getTime() + h * HOUR);
      if (t.getTime() - now.getTime() >= MIN_NOTICE_MS) times.push(t);
    }
  }
  const taken = await db
    .select({ at: examBookings.sessionAt })
    .from(examBookings)
    .where(and(eq(examBookings.centreId, centreId), inArray(examBookings.status, ["booked", "sat"]), gte(examBookings.sessionAt, times[0] ?? now), lt(examBookings.sessionAt, new Date(now.getTime() + (BOOK_AHEAD_DAYS + 1) * 24 * HOUR))));
  return times.map((t) => ({ at: t, left: SEATS_PER_SESSION - taken.filter((b) => b.at.getTime() === t.getTime()).length })).filter((s) => s.left > 0);
}

export const bookingsFor = (userId: string) => db.select().from(examBookings).where(eq(examBookings.userId, userId));

export async function bookSitting(userId: string, level: Level, centreId: string, sessionAt: Date, now = new Date()) {
  const centre = (await db.select().from(examCentres).where(and(eq(examCentres.id, centreId), eq(examCentres.active, true))).limit(1))[0];
  if (!centre) throw new ExamError("That centre is not taking bookings.");
  const slot = (await sessionsAt(centreId, now)).find((s) => s.at.getTime() === sessionAt.getTime());
  if (!slot) throw new ExamError("That session is full or no longer open. Pick another.");
  const open = (await bookingsFor(userId)).find((b) => b.level === level && b.status === "booked" && b.sessionAt.getTime() + NO_SHOW_MS > now.getTime());
  if (open) throw new ExamError("You already have a sitting booked for this exam. Change it instead.");
  // The learner must be able to sit it on the day: a credit now, or a free resit due by then.
  const onTheDay = await examStatus(userId, level, sessionAt);
  if (!onTheDay.canStart) throw new ExamError(onTheDay.blocked ?? "You cannot sit this exam yet.");
  const id = newId();
  await db.insert(examBookings).values({ id, userId, level, centreId, sessionAt });
  await audit(userId, "exam.booked", id, { level, centreId, sessionAt });
  return id;
}

export async function cancelSitting(userId: string, bookingId: string, now = new Date()) {
  const b = (await db.select().from(examBookings).where(and(eq(examBookings.id, bookingId), eq(examBookings.userId, userId))).limit(1))[0];
  if (!b || b.status !== "booked") throw new ExamError("That booking cannot be changed.");
  if (b.sessionAt.getTime() - now.getTime() < FREE_CHANGE_MS) throw new ExamError("Sittings can be changed until 48 hours before. A missed sitting counts as an attempt.");
  await db.update(examBookings).set({ status: "cancelled" }).where(eq(examBookings.id, b.id));
  await audit(userId, "exam.booking_cancelled", b.id);
}

/** The invigilator's step: checks the centre code in the session window and opens the paper. */
export async function openSitting(userId: string, bookingId: string, code: string, now = new Date()) {
  const b = (await db.select().from(examBookings).where(and(eq(examBookings.id, bookingId), eq(examBookings.userId, userId))).limit(1))[0];
  if (!b || b.status !== "booked") throw new ExamError("There is no open booking to start.");
  const t = now.getTime() - b.sessionAt.getTime();
  if (t < -OPEN_BEFORE_MS || t > OPEN_AFTER_MS) throw new ExamError("This sitting can only be opened at the centre, from 30 minutes before its start until an hour after.");
  const centre = (await db.select().from(examCentres).where(eq(examCentres.id, b.centreId)).limit(1))[0];
  if (!centre || !(await verify(centre.codeHash, code.trim()))) {
    await audit(userId, "exam.bad_centre_code", b.id);
    throw new ExamError("That invigilator code is not right.");
  }
  const attemptId = await startExam(userId, b.level as Level, now, b.id);
  await db.update(examBookings).set({ status: "sat", attemptId }).where(eq(examBookings.id, b.id));
  await audit(userId, "exam.sitting_opened", b.id, { centreId: b.centreId, attemptId });
  return attemptId;
}
