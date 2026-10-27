import "server-only";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { auditLog, entitlements, invoices, memberships, organisations, paymentEvents, payments, seats, subscriptions, users } from "@/db/schema";
import { planById, rand, vatOf, VAT_NUMBER } from "@/config/plans";
import { SITE_URL } from "@/lib/config";
import { db } from "./db";
import { mails } from "./email";
import { newId } from "./ids";
import { activeProvider, providerById } from "./payments";
import type { WebhookEvent } from "./payments/types";

export async function audit(actorId: string | null, action: string, subject: string | null, detail?: unknown) {
  await db.insert(auditLog).values({ id: newId(), actorId, action, subject, detail: detail ?? null });
}

const addMonths = (d: Date, months: number) => {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
};

export class CheckoutError extends Error {}

/** Creates a pending payment and returns the provider page to send the payer to. */
export async function startCheckout(user: { id: string; email: string; verified: boolean }, planId: string, seatCount = 1, organisationName?: string, origin = process.env.APP_URL ?? SITE_URL) {
  const plan = planById(planId);
  if (!plan || !plan.online) throw new CheckoutError("That plan cannot be bought online.");
  if (!user.verified) throw new CheckoutError("Confirm your email before paying.");
  const count = plan.perSeat ? Math.max(plan.minSeats, Math.floor(seatCount)) : 1;
  const amountCents = plan.priceCents * count;

  let organisationId: string | null = null;
  if (plan.audience !== "learner") {
    // A buyer who already runs an organisation of this kind renews it rather than starting another.
    const kind = plan.audience === "employer" ? "employer" : "institution";
    const mine = await db
      .select({ id: organisations.id })
      .from(memberships)
      .innerJoin(organisations, eq(organisations.id, memberships.organisationId))
      .where(and(eq(memberships.userId, user.id), eq(organisations.kind, kind), or(eq(memberships.role, "employer_admin"), eq(memberships.role, "institution_admin"))))
      .limit(1);
    organisationId = mine[0]?.id ?? null;
  }
  if (plan.audience !== "learner" && !organisationId) {
    organisationId = newId();
    await db.insert(organisations).values({ id: organisationId, name: organisationName?.trim() || `${user.email} organisation`, kind: plan.audience === "employer" ? "employer" : "institution" });
    await db.insert(memberships).values({ userId: user.id, organisationId, role: plan.audience === "employer" ? "employer_admin" : "institution_admin" });
  }

  const provider = activeProvider();
  const id = newId();
  await db.insert(payments).values({ id, userId: user.id, organisationId, planId, seats: count, provider: provider.id, amountCents, status: "pending" });
  const created = await provider.createPayment({
    paymentId: id,
    amountCents,
    payerReference: "SetpointLabs",
    beneficiaryReference: `SPL-${id.slice(0, 12).toUpperCase()}`,
    returnUrl: `${origin}/checkout/${id}`,
  });
  await db.update(payments).set({ providerPaymentId: created.providerPaymentId }).where(eq(payments.id, id));
  await audit(user.id, "payment.started", id, { planId, seats: count, amountCents, provider: provider.id });
  return { paymentId: id, redirectUrl: created.redirectUrl };
}

/**
 * Grants or extends access for a paid plan. Renewals stack on the end of current access, so paying
 * early never loses days.
 */
export async function grant(opts: { userId: string | null; organisationId: string | null; planId: string; seats: number; source: "payment" | "invoice" | "admin"; months?: number; note?: string; actorId?: string | null }) {
  const plan = planById(opts.planId);
  const months = opts.months ?? plan?.periodMonths ?? 1;
  // DATETIME keeps whole seconds and rounds up, so start on the current second, never just after it.
  const now = new Date(Math.floor(Date.now() / 1000) * 1000);
  const holder = opts.organisationId ? eq(entitlements.organisationId, opts.organisationId) : eq(entitlements.userId, opts.userId!);
  const current = await db.select().from(entitlements).where(and(holder, eq(entitlements.status, "active"))).orderBy(desc(entitlements.endsAt)).limit(1);
  const startsAt = current[0] && current[0].endsAt > now ? current[0].endsAt : now;
  const endsAt = addMonths(startsAt, months);
  const id = newId();
  await db.insert(entitlements).values({ id, userId: opts.organisationId ? null : opts.userId, organisationId: opts.organisationId, planId: opts.planId, seats: opts.seats, startsAt, endsAt, source: opts.source, note: opts.note ?? null });

  if (opts.organisationId) {
    await db.insert(seats).values(Array.from({ length: opts.seats }, () => ({ id: newId(), organisationId: opts.organisationId!, entitlementId: id })));
    // The buyer takes the first seat so they can see what their people see.
    if (opts.userId) await assignSeat(opts.organisationId, opts.userId);
  }

  const sub = await db
    .select()
    .from(subscriptions)
    .where(opts.organisationId ? eq(subscriptions.organisationId, opts.organisationId) : eq(subscriptions.userId, opts.userId!))
    .limit(1);
  if (sub[0]) await db.update(subscriptions).set({ planId: opts.planId, status: "active", currentPeriodEnd: endsAt, renewalReminderAt: null }).where(eq(subscriptions.id, sub[0].id));
  else await db.insert(subscriptions).values({ id: newId(), userId: opts.organisationId ? null : opts.userId, organisationId: opts.organisationId, planId: opts.planId, status: "active", currentPeriodEnd: endsAt });

  await audit(opts.actorId ?? null, "entitlement.granted", id, { ...opts, startsAt, endsAt });
  return { id, startsAt, endsAt };
}

/** Puts a user on a free seat of the organisation's newest active entitlement. */
export async function assignSeat(organisationId: string, userId: string) {
  const taken = await db.select().from(seats).where(and(eq(seats.organisationId, organisationId), eq(seats.userId, userId))).limit(1);
  if (taken[0]) return true;
  const free = await db
    .select({ id: seats.id })
    .from(seats)
    .innerJoin(entitlements, eq(entitlements.id, seats.entitlementId))
    .where(and(eq(seats.organisationId, organisationId), isNull(seats.userId), eq(entitlements.status, "active")))
    .orderBy(desc(entitlements.endsAt))
    .limit(1);
  if (!free[0]) return false;
  await db.update(seats).set({ userId, assignedAt: new Date() }).where(eq(seats.id, free[0].id));
  return true;
}

export type WebhookOutcome = "duplicate" | "unknown-payment" | "already-final" | "updated";

/**
 * Applies a verified webhook. Each provider event id is stored first, so a repeat delivery is
 * ignored; access is only ever granted here, never from the payer's return redirect.
 */
export async function handlePaymentEvent(providerId: string, event: WebhookEvent): Promise<WebhookOutcome> {
  try {
    await db.insert(paymentEvents).values({ id: `${providerId}:${event.eventId}`, provider: providerId, type: event.type, payload: event.payload as object });
  } catch (e) {
    if ((e as { cause?: { code?: string }; code?: string }).cause?.code === "ER_DUP_ENTRY" || (e as { code?: string }).code === "ER_DUP_ENTRY") return "duplicate";
    throw e;
  }

  const conds = [event.providerPaymentId ? eq(payments.providerPaymentId, event.providerPaymentId) : undefined, event.externalReference ? eq(payments.id, event.externalReference) : undefined].filter(Boolean);
  const rows = conds.length ? await db.select().from(payments).where(and(eq(payments.provider, providerId), or(...conds))).limit(1) : [];
  const payment = rows[0];
  if (!payment) {
    await audit(null, "payment.event_unmatched", event.eventId, { providerId, type: event.type });
    return "unknown-payment";
  }
  await db.update(paymentEvents).set({ paymentId: payment.id }).where(eq(paymentEvents.id, `${providerId}:${event.eventId}`));
  await audit(null, "payment.event", payment.id, { providerId, type: event.type, status: event.status });

  if (payment.status === "paid" || event.status === "pending" || payment.status === event.status) return "already-final";

  const user = (await db.select().from(users).where(eq(users.id, payment.userId)).limit(1))[0];
  const plan = planById(payment.planId);
  if (event.status === "paid") {
    await db.update(payments).set({ status: "paid", paidAt: new Date(), rawPayload: event.payload as object }).where(eq(payments.id, payment.id));
    const g = await grant({ userId: payment.userId, organisationId: payment.organisationId, planId: payment.planId, seats: payment.seats, source: "payment" });
    if (user) {
      const lines = [
        `Thank you. We received ${rand(payment.amountCents)} for ${plan?.name ?? payment.planId}${payment.seats > 1 ? `, ${payment.seats} seats` : ""}.`,
        `Access runs until ${g.endsAt.toISOString().slice(0, 10)}.`,
        `Includes VAT of ${rand(vatOf(payment.amountCents))}.${VAT_NUMBER ? ` VAT number ${VAT_NUMBER}.` : ""}`,
        `Reference SPL-${payment.id.slice(0, 12).toUpperCase()}.`,
      ];
      await mails.receipt(user.email, lines);
    }
  } else {
    await db.update(payments).set({ status: event.status, rawPayload: event.payload as object }).where(eq(payments.id, payment.id));
    if (user && event.status === "failed") await mails.paymentFailed(user.email, plan?.name ?? payment.planId);
  }
  return "updated";
}

/** Runs a webhook body through its provider, for the API route. */
export async function receiveWebhook(providerId: string, rawBody: string, headers: Headers) {
  const provider = providerById(providerId);
  if (!provider) return { status: 404 as const, outcome: "no-provider" };
  const event = await provider.verifyWebhook(rawBody, headers);
  return { status: 200 as const, outcome: await handlePaymentEvent(providerId, event) };
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function revokeEntitlement(entitlementId: string, actorId: string) {
  await db.update(entitlements).set({ status: "revoked" }).where(eq(entitlements.id, entitlementId));
  await audit(actorId, "entitlement.revoked", entitlementId);
}

export async function markInvoicePaid(invoiceId: string, actorId: string) {
  const inv = (await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1))[0];
  if (!inv || inv.status !== "open") return null;
  await db.update(invoices).set({ status: "paid", paidAt: new Date(), markedPaidBy: actorId }).where(eq(invoices.id, invoiceId));
  const g = await grant({ userId: null, organisationId: inv.organisationId, planId: inv.planId, seats: inv.seats, source: "invoice", actorId });
  await audit(actorId, "invoice.paid", invoiceId);
  return g;
}
