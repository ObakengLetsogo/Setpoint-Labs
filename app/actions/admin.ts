"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { invoices, memberships, organisations, users } from "@/db/schema";
import { planById } from "@/config/plans";
import { requireRole } from "@/lib/server/auth";
import { audit, grant, markInvoicePaid, revokeEntitlement } from "@/lib/server/billing";
import { revokeCertificate } from "@/lib/server/certificates";
import { db } from "@/lib/server/db";
import { newId } from "@/lib/server/ids";
import type { FormState } from "./auth";

const admin = () => requireRole(["platform_admin"], "/admin");

const Grant = z.object({ email: z.email(), plan: z.string(), months: z.coerce.number().int().min(1).max(60), note: z.string().max(255).optional() });

export async function grantAccess(_: FormState, form: FormData): Promise<FormState> {
  const me = await admin();
  const p = Grant.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  if (!planById(p.data.plan)) return { error: "Unknown plan." };
  const user = (await db.select().from(users).where(eq(users.email, p.data.email.toLowerCase())).limit(1))[0];
  if (!user) return { error: "No account has that email. Ask them to sign up first." };
  await grant({ userId: user.id, organisationId: null, planId: p.data.plan, seats: 1, source: "admin", months: p.data.months, note: p.data.note, actorId: me.id });
  revalidatePath("/admin");
  return { ok: `Granted ${p.data.months} month${p.data.months === 1 ? "" : "s"} to ${user.email}.` };
}

export async function revokeAccess(form: FormData) {
  const me = await admin();
  await revokeEntitlement(String(form.get("id")), me.id);
  revalidatePath("/admin");
}

const Invoice = z.object({ organisation: z.string().trim().min(1).max(160), kind: z.enum(["employer", "institution"]), adminEmail: z.email(), plan: z.string(), seats: z.coerce.number().int().min(1).max(100000) });

/** Raises an invoice for an organisation paying by EFT. Marking it paid grants the seats. */
export async function createInvoice(_: FormState, form: FormData): Promise<FormState> {
  const me = await admin();
  const p = Invoice.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const plan = planById(p.data.plan);
  if (!plan) return { error: "Unknown plan." };
  const contact = (await db.select().from(users).where(eq(users.email, p.data.adminEmail.toLowerCase())).limit(1))[0];
  if (!contact) return { error: "The organisation's admin needs an account first." };
  const orgId = newId();
  await db.insert(organisations).values({ id: orgId, name: p.data.organisation, kind: p.data.kind });
  await db.insert(memberships).values({ userId: contact.id, organisationId: orgId, role: p.data.kind === "employer" ? "employer_admin" : "institution_admin" });
  // Promote a learner to run the organisation; never demote staff or another admin.
  if (contact.role === "learner") await db.update(users).set({ role: p.data.kind === "employer" ? "employer_admin" : "institution_admin" }).where(eq(users.id, contact.id));
  const seats = plan.perSeat ? Math.max(plan.minSeats, p.data.seats) : p.data.seats;
  const number = `SPL-${new Date().getFullYear()}-${newId().slice(0, 6).toUpperCase()}`;
  await db.insert(invoices).values({ id: newId(), number, organisationId: orgId, planId: plan.id, seats, amountCents: plan.perSeat ? plan.priceCents * seats : plan.priceCents });
  await audit(me.id, "invoice.created", number, { organisation: p.data.organisation, seats });
  revalidatePath("/admin");
  return { ok: `Invoice ${number} raised for ${p.data.organisation}.` };
}

export async function payInvoice(form: FormData) {
  const me = await admin();
  await markInvoicePaid(String(form.get("id")), me.id);
  revalidatePath("/admin");
}

export async function revokeCert(form: FormData) {
  const me = await admin();
  await revokeCertificate(String(form.get("code")), me.id);
  revalidatePath("/admin");
}

/** Chapters as "m:ss Title" lines. */
function parseChapters(text: string) {
  // Browsers submit textarea lines with CRLF endings.
  return text
    .split(/\r?\n/)
    .map((l) => /^\s*(?:(\d+):)?(\d{1,2}):(\d{2})\s+(.+)$/.exec(l))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ t: Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]), title: m[4].trim() }))
    .sort((a, b) => a.t - b.t);
}

export async function saveVideoDetails(_: FormState, form: FormData): Promise<FormState> {
  const me = await admin();
  const lessonId = String(form.get("lessonId"));
  const { lessonVideos } = await import("@/db/schema");
  const row = (await db.select().from(lessonVideos).where(eq(lessonVideos.lessonId, lessonId)).limit(1))[0];
  const published = form.get("published") === "on";
  if (published && !row?.videoFile) return { error: "Upload the video file before publishing." };
  const set = { chapters: parseChapters(String(form.get("chapters") ?? "")), durationS: Number(form.get("duration")) || null, published, updatedBy: me.id, updatedAt: new Date() };
  await db.insert(lessonVideos).values({ lessonId, ...set }).onDuplicateKeyUpdate({ set });
  await audit(me.id, published ? "video.published" : "video.saved", lessonId);
  revalidatePath("/admin/videos");
  return { ok: published ? "Saved and published." : "Saved. Not published yet." };
}
