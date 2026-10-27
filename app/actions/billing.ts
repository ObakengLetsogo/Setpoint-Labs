"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { enquiries } from "@/db/schema";
import { requireUser } from "@/lib/server/auth";
import { CheckoutError, receiveWebhook, startCheckout, audit } from "@/lib/server/billing";
import { db } from "@/lib/server/db";
import { newId } from "@/lib/server/ids";
import { limited } from "@/lib/server/rateLimit";
import { DEV_WEBHOOK_SECRET } from "@/lib/server/payments/dev";
import { signSvix } from "@/lib/server/payments/svix";
import { appUrl } from "@/lib/server/url";
import type { FormState } from "./auth";

export async function checkout(_: FormState, form: FormData): Promise<FormState> {
  const planId = String(form.get("plan") ?? "");
  const user = await requireUser(`/pricing?plan=${planId}`);
  if (limited(`checkout:${user.id}`, 10, 60 * 60 * 1000)) return { error: "Too many attempts. Try again in an hour." };
  let url: string;
  try {
    const r = await startCheckout(user, planId, Number(form.get("seats") ?? 1), String(form.get("organisation") ?? ""), await appUrl());
    url = r.redirectUrl;
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    console.error(e);
    return { error: "We could not reach the payment provider. Nothing was charged. Please try again." };
  }
  redirect(url);
}

/** The dev simulator's buttons: sends a signed webhook through the real handler, then returns. */
export async function simulatePayment(form: FormData) {
  if (process.env.NODE_ENV === "production" && process.env.PAYMENT_PROVIDER !== "dev") throw new Error("Simulator is off in production.");
  const paymentId = String(form.get("paymentId"));
  const status = String(form.get("status"));
  const body = JSON.stringify({ paymentId, status });
  await receiveWebhook("dev", body, new Headers(signSvix(DEV_WEBHOOK_SECRET, newId(), body)));
  const back = String(form.get("return") ?? `/checkout/${paymentId}`);
  redirect(back.startsWith("http") ? new URL(back).pathname : back);
}

const Enquiry = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.email("Enter a valid email address."),
  organisation: z.string().trim().min(1, "Enter your organisation.").max(160),
  seats: z.coerce.number().int().min(0).max(100000).optional(),
  message: z.string().max(4000).optional(),
});

export async function sendEnquiry(_: FormState, form: FormData): Promise<FormState> {
  const parsed = Enquiry.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (limited(`enquiry:${parsed.data.email}`, 3, 24 * 60 * 60 * 1000)) return { ok: "Thanks, we already have your enquiry." };
  const id = newId();
  await db.insert(enquiries).values({ id, ...parsed.data, seats: parsed.data.seats ?? null, message: parsed.data.message ?? null });
  await audit(null, "enquiry.received", id);
  return { ok: "Thanks. We will be in touch within one working day with a quote and an invoice option." };
}
