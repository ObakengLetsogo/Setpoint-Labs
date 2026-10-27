"use server";

import { requireUser } from "@/lib/server/auth";
import { submitAssessment, type SubmitOutcome } from "@/lib/server/certificates";
import { limited } from "@/lib/server/rateLimit";
import { assessmentFor } from "@/data/assessments";

export type AssessState = (SubmitOutcome & { at: number }) | { error: string; at: number } | null;

export async function submit(_: AssessState, form: FormData): Promise<AssessState> {
  const trackId = String(form.get("track") ?? "");
  const user = await requireUser(`/assess/${trackId}`);
  if (!assessmentFor(trackId)) return { error: "Unknown assessment.", at: Date.now() };
  if (limited(`assess:${user.id}`, 30, 60 * 60 * 1000)) return { error: "That is a lot of attempts. Take a break and try again in an hour.", at: Date.now() };
  const language = form.get("language") === "st" ? "st" : "ladder";
  const source = String(form.get("source") ?? "").slice(0, 60_000);
  return { ...(await submitAssessment(user, trackId, language, source)), at: Date.now() };
}
