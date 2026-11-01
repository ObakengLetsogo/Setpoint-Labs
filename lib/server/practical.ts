import "server-only";
import { and, asc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { entitlements, practicalBookings, practicalDays, progress, seats, users } from "@/db/schema";
import { CURRICULUM, STAGES } from "@/data/curriculum";
import { PRACTICAL_PLANS } from "@/config/plans";
import { audit } from "./billing";
import { db } from "./db";
import { mails } from "./email";
import { ExamError } from "./exams";
import { newId } from "./ids";

// Practical days at the training venue. An admin schedules dated days for one online stage (or an
// open day for anyone). A learner buys a seat credit, or an employer gives one, then books a day
// for a stage they have finished online. Free cancellation until 7 days before; the facilitator
// marks attendance and the practical sign-off on the day.

const DAY = 86_400_000;
export const CANCEL_DAYS = 7;
export const fmtDay = (d: Date) => d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "full", timeStyle: "short" });
export const stageName = (n: number | null) => (n == null ? "Open day" : `Stage ${n}: ${STAGES.find((s) => s.n === n)?.name ?? ""}`);

/** Lesson ids of every chapter in a stage. */
export const stageLessons = (n: number) => CURRICULUM.flatMap((t) => t.chapters.filter((c) => c.stage === n).flatMap((c) => c.lessons.map((l) => l.id)));

/** Lessons of the stage the learner has not completed yet. */
export async function stageLeft(userId: string, n: number) {
  const ids = stageLessons(n);
  if (!ids.length) return 0;
  const done = await db.select({ id: progress.lessonId }).from(progress).where(and(eq(progress.userId, userId), eq(progress.status, "completed"), inArray(progress.lessonId, ids)));
  return ids.length - new Set(done.map((d) => d.id)).size;
}

/** Practical day credits bought or given, less seats already booked or used. */
export async function practicalCredits(userId: string, now = new Date()) {
  const own = await db.select({ id: entitlements.id }).from(entitlements).where(and(eq(entitlements.userId, userId), inArray(entitlements.planId, PRACTICAL_PLANS), eq(entitlements.status, "active"), gt(entitlements.endsAt, now)));
  const given = await db
    .select({ id: seats.id })
    .from(seats)
    .innerJoin(entitlements, eq(entitlements.id, seats.entitlementId))
    .where(and(eq(seats.userId, userId), inArray(entitlements.planId, PRACTICAL_PLANS), eq(entitlements.status, "active"), gt(entitlements.endsAt, now)));
  const used = await db.select({ id: practicalBookings.id }).from(practicalBookings).where(and(eq(practicalBookings.userId, userId), ne(practicalBookings.status, "cancelled")));
  return Math.max(0, own.length + given.length - used.length);
}

async function takenOn(dayId: string) {
  const r = await db.select({ n: sql<number>`COUNT(*)` }).from(practicalBookings).where(and(eq(practicalBookings.dayId, dayId), ne(practicalBookings.status, "cancelled")));
  return Number(r[0]?.n ?? 0);
}

export interface DayView {
  id: string;
  title: string;
  stage: number | null;
  startsAt: Date;
  venue: string;
  notes: string | null;
  left: number;
  booking: { id: string; status: string; signedOff: boolean } | null;
  /** Why this learner cannot book it, if they cannot. */
  blocked: string | null;
  canCancel: boolean;
}

/** Upcoming days, as one learner sees them, plus the learner's past bookings. */
export async function practicalFor(userId: string, now = new Date()) {
  const credits = await practicalCredits(userId, now);
  const mine = await db.select().from(practicalBookings).where(eq(practicalBookings.userId, userId));
  const days = await db.select().from(practicalDays).where(isNull(practicalDays.cancelledAt)).orderBy(asc(practicalDays.startsAt));
  const views: DayView[] = [];
  for (const d of days) {
    const b = mine.find((m) => m.dayId === d.id && m.status !== "cancelled") ?? null;
    if (d.startsAt < now && !b) continue;
    const left = d.capacity - (await takenOn(d.id));
    let blocked: string | null = null;
    if (b) blocked = "Booked.";
    else if (left <= 0) blocked = "Full.";
    else if (d.stage != null && (await stageLeft(userId, d.stage)) > 0) blocked = `Finish the ${stageName(d.stage)} lessons online first (${await stageLeft(userId, d.stage)} to go).`;
    else if (!credits) blocked = "Buy a practical day seat to book.";
    views.push({ id: d.id, title: d.title, stage: d.stage, startsAt: d.startsAt, venue: d.venue, notes: d.notes, left: Math.max(0, left), booking: b && { id: b.id, status: b.status, signedOff: b.signedOff }, blocked, canCancel: Boolean(b && b.status === "booked" && d.startsAt.getTime() - now.getTime() >= CANCEL_DAYS * DAY) });
  }
  return { credits, days: views };
}

export async function bookDay(user: { id: string; email: string }, dayId: string, now = new Date()) {
  const view = (await practicalFor(user.id, now)).days.find((d) => d.id === dayId);
  if (!view) throw new ExamError("That day is not open for booking.");
  if (view.blocked) throw new ExamError(view.blocked);
  if (view.startsAt < now) throw new ExamError("That day has passed.");
  const id = newId();
  await db.insert(practicalBookings).values({ id, dayId, userId: user.id, bookedAt: now });
  // Two learners booking the last seat at once: keep the earlier booking.
  if ((await takenOn(dayId)) > (await db.select().from(practicalDays).where(eq(practicalDays.id, dayId)))[0].capacity) {
    await db.delete(practicalBookings).where(eq(practicalBookings.id, id));
    throw new ExamError("That day just filled up.");
  }
  await audit(user.id, "practical.booked", id, { dayId });
  await mails.practicalBooked(user.email, view.title, fmtDay(view.startsAt), view.venue);
  return id;
}

export async function cancelBooking(userId: string, bookingId: string, now = new Date()) {
  const b = (await db.select().from(practicalBookings).where(and(eq(practicalBookings.id, bookingId), eq(practicalBookings.userId, userId))).limit(1))[0];
  if (!b || b.status !== "booked") throw new ExamError("That booking cannot be cancelled.");
  const d = (await db.select().from(practicalDays).where(eq(practicalDays.id, b.dayId)).limit(1))[0];
  if (d.startsAt.getTime() - now.getTime() < CANCEL_DAYS * DAY) throw new ExamError(`Bookings can be cancelled free until ${CANCEL_DAYS} days before the day. Contact us if something has come up.`);
  await db.update(practicalBookings).set({ status: "cancelled", cancelledAt: now }).where(eq(practicalBookings.id, b.id));
  await audit(userId, "practical.cancelled", b.id, { dayId: b.dayId });
}

// ── Admin and facilitator ──────────────────────────────────────────────────────────────────

export async function createDay(actorId: string, v: { title: string; stage: number | null; startsAt: Date; venue: string; capacity: number; notes?: string }) {
  if (!v.title.trim() || !v.venue.trim()) throw new ExamError("A day needs a title and a venue.");
  if (!(v.capacity >= 1 && v.capacity <= 40)) throw new ExamError("Capacity must be between 1 and 40.");
  if (Number.isNaN(v.startsAt.getTime())) throw new ExamError("Give the day a date and time.");
  if (v.stage != null && !stageLessons(v.stage).length) throw new ExamError("That stage has no lessons.");
  const id = newId();
  await db.insert(practicalDays).values({ id, title: v.title.trim(), stage: v.stage, startsAt: v.startsAt, venue: v.venue.trim(), capacity: Math.floor(v.capacity), notes: v.notes?.trim() || null });
  await audit(actorId, "practical.day_created", id, v);
  return id;
}

/** Cancels a day and returns every seat on it; the learners are emailed. */
export async function cancelDay(actorId: string, dayId: string, now = new Date()) {
  const d = (await db.select().from(practicalDays).where(eq(practicalDays.id, dayId)).limit(1))[0];
  if (!d || d.cancelledAt) return;
  await db.update(practicalDays).set({ cancelledAt: now }).where(eq(practicalDays.id, dayId));
  const rows = await db.select({ b: practicalBookings, email: users.email }).from(practicalBookings).innerJoin(users, eq(users.id, practicalBookings.userId)).where(and(eq(practicalBookings.dayId, dayId), eq(practicalBookings.status, "booked")));
  await db.update(practicalBookings).set({ status: "cancelled", cancelledAt: now }).where(and(eq(practicalBookings.dayId, dayId), eq(practicalBookings.status, "booked")));
  for (const r of rows) await mails.practicalCancelled(r.email, d.title, fmtDay(d.startsAt));
  await audit(actorId, "practical.day_cancelled", dayId, { learners: rows.length });
}

/** Every day with its roster, newest first, for the admin and facilitators. */
export async function practicalRoster() {
  const days = await db.select().from(practicalDays).orderBy(sql`${practicalDays.startsAt} DESC`).limit(30);
  const out = [];
  for (const d of days) {
    const people = await db
      .select({ b: practicalBookings, name: users.name, email: users.email })
      .from(practicalBookings)
      .innerJoin(users, eq(users.id, practicalBookings.userId))
      .where(and(eq(practicalBookings.dayId, d.id), ne(practicalBookings.status, "cancelled")))
      .orderBy(asc(practicalBookings.bookedAt));
    out.push({ d, people });
  }
  return out;
}

/** The facilitator records attendance and the practical sign-off. Only on or after the day. */
export async function markAttendance(facilitatorId: string, bookingId: string, attended: boolean, signedOff: boolean, note: string, now = new Date()) {
  const b = (await db.select().from(practicalBookings).where(eq(practicalBookings.id, bookingId)).limit(1))[0];
  if (!b || b.status === "cancelled") throw new ExamError("No such booking.");
  const d = (await db.select().from(practicalDays).where(eq(practicalDays.id, b.dayId)).limit(1))[0];
  if (d.startsAt.getTime() - now.getTime() > DAY / 2) throw new ExamError("Attendance is marked on the day.");
  await db
    .update(practicalBookings)
    .set({ status: attended ? "attended" : "absent", signedOff: attended && signedOff, facilitatorId, note: note.trim() || null })
    .where(eq(practicalBookings.id, b.id));
  await audit(facilitatorId, "practical.marked", b.id, { attended, signedOff: attended && signedOff });
}

/** Stages a learner has a facilitator's practical sign-off for. */
export async function practicalSignOffs(userId: string) {
  const rows = await db
    .select({ stage: practicalDays.stage, title: practicalDays.title, startsAt: practicalDays.startsAt })
    .from(practicalBookings)
    .innerJoin(practicalDays, eq(practicalDays.id, practicalBookings.dayId))
    .where(and(eq(practicalBookings.userId, userId), eq(practicalBookings.signedOff, true)));
  return rows;
}
