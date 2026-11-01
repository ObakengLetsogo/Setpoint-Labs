"use server";

import { ADULT_AGE, MIN_AGE, ageOn, requestConsent } from "@/lib/server/consent";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  checkPassword,
  consumePasswordReset,
  createSession,
  createUser,
  currentUser,
  destroySession,
  findUserByEmail,
  issuePasswordReset,
  issueVerification,
} from "@/lib/server/auth";
import { mails } from "@/lib/server/email";
import { limited } from "@/lib/server/rateLimit";
import { audit } from "@/lib/server/billing";

export interface FormState {
  error?: string;
  ok?: string;
}

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/account";
};
const ip = async () => (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

const SignUp = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(10, "Use at least 10 characters.").max(200),
  birthDate: z.iso.date("Enter your date of birth."),
  guardianName: z.string().trim().max(120).optional(),
  guardianEmail: z.string().trim().max(254).optional(),
});

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = SignUp.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (limited(`signup:${await ip()}`, 5, 60 * 60 * 1000)) return { error: "Too many sign ups from here. Try again in an hour." };
  if (await findUserByEmail(parsed.data.email)) return { error: "An account with that email already exists. Sign in instead." };
  const birthDate = new Date(`${parsed.data.birthDate}T00:00:00Z`);
  const age = ageOn(birthDate);
  if (age < 0 || age > 100) return { error: "Check your date of birth." };
  if (age < MIN_AGE) return { error: `You need to be at least ${MIN_AGE} to use Setpoint Labs.` };
  const minor = age < ADULT_AGE;
  const g = { name: parsed.data.guardianName ?? "", email: (parsed.data.guardianEmail ?? "").toLowerCase() };
  if (minor && (!g.name || !z.email().safeParse(g.email).success)) return { error: "You are under 18, so we need a parent or guardian's name and email. We will ask them to agree before your account opens." };
  if (minor && g.email === parsed.data.email.trim().toLowerCase()) return { error: "Use your parent or guardian's own email address, not yours." };
  const id = await createUser({ ...parsed.data, birthDate });
  await createSession(id);
  if (minor) {
    await requestConsent(id, g.name, g.email);
    await mails.verify(parsed.data.email, await issueVerification(id));
    await audit(id, "user.signed_up", id, { minor: true });
    redirect("/consent");
  }
  await mails.verify(parsed.data.email, await issueVerification(id));
  await mails.welcome(parsed.data.email, parsed.data.name);
  await audit(id, "user.signed_up", id);
  redirect(safeNext(form.get("next")));
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (limited(`signin:${await ip()}:${email.toLowerCase()}`, 8, 15 * 60 * 1000)) return { error: "Too many attempts. Wait 15 minutes and try again." };
  const user = await findUserByEmail(email);
  // The same message either way, so the form does not reveal which emails have accounts.
  if (!user?.passwordHash || !(await checkPassword(user.passwordHash, password))) return { error: "That email and password do not match." };
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  await destroySession();
  redirect("/");
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  if (limited(`reset:${await ip()}`, 5, 60 * 60 * 1000)) return { error: "Too many requests. Try again later." };
  const user = await findUserByEmail(email);
  if (user) await mails.reset(user.email, await issuePasswordReset(user.id));
  return { ok: "If that email has an account, a reset link is on its way." };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  const userId = await consumePasswordReset(String(form.get("token") ?? ""), password);
  if (!userId) return { error: "This link has expired or was already used. Ask for a new one." };
  await createSession(userId);
  await audit(userId, "user.password_reset", userId);
  redirect("/account");
}

export async function resendVerification(): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { error: "Sign in first." };
  if (user.verified) return { ok: "Your email is already confirmed." };
  if (limited(`verify:${user.id}`, 3, 60 * 60 * 1000)) return { error: "Already sent. Check your inbox and spam folder." };
  await mails.verify(user.email, await issueVerification(user.id));
  return { ok: `A new link is on its way to ${user.email}.` };
}

/** Confirms an email from the link's token. A button posts this, so link scanners cannot use the token up. */
export async function confirmEmail(form: FormData) {
  const { consumeVerification } = await import("@/lib/server/auth");
  const ok = await consumeVerification(String(form.get("token") ?? ""));
  redirect(ok ? "/verify-email?done=1" : "/verify-email?failed=1");
}

export async function resendConsent(form: FormData) {
  const user = await currentUser();
  if (!user?.needsConsent) redirect("/account");
  if (limited(`consent:${user.id}`, 3, 60 * 60 * 1000)) redirect("/consent?sent=busy");
  await requestConsent(user.id, String(form.get("guardianName") ?? ""), String(form.get("guardianEmail") ?? ""));
  redirect("/consent?sent=1");
}
