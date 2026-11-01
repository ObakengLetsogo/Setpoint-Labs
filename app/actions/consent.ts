"use server";

import { redirect } from "next/navigation";
import { giveConsent, refuseConsent } from "@/lib/server/consent";

export async function guardianDecides(form: FormData) {
  const token = String(form.get("token") ?? "");
  const ok = form.get("decision") === "agree" ? await giveConsent(token) : await refuseConsent(token);
  redirect(`/guardian/done?result=${ok ? (form.get("decision") === "agree" ? "agreed" : "refused") : "gone"}`);
}
