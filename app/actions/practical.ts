"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/server/auth";
import { ExamError } from "@/lib/server/exams";
import { bookDay, cancelBooking, cancelDay, createDay, markAttendance } from "@/lib/server/practical";

const fail = (path: string, e: unknown): never => {
  if (e instanceof ExamError) redirect(`${path}?error=${encodeURIComponent(e.message)}`);
  throw e;
};

export async function bookPractical(form: FormData) {
  const user = await requireUser("/practical");
  try {
    await bookDay(user, String(form.get("day")));
  } catch (e) {
    fail("/practical", e);
  }
  revalidatePath("/practical");
  redirect("/practical?done=booked");
}

export async function cancelPractical(form: FormData) {
  const user = await requireUser("/practical");
  try {
    await cancelBooking(user.id, String(form.get("booking")));
  } catch (e) {
    fail("/practical", e);
  }
  revalidatePath("/practical");
  redirect("/practical?done=cancelled");
}

export async function addPracticalDay(form: FormData) {
  const me = await requireRole(["platform_admin"], "/practical/manage");
  const stage = String(form.get("stage") ?? "");
  try {
    await createDay(me.id, {
      title: String(form.get("title") ?? ""),
      stage: stage ? Number(stage) : null,
      startsAt: new Date(`${String(form.get("at"))}:00+02:00`),
      venue: String(form.get("venue") ?? ""),
      capacity: Number(form.get("capacity")),
      notes: String(form.get("notes") ?? "").slice(0, 2000),
    });
  } catch (e) {
    fail("/practical/manage", e);
  }
  revalidatePath("/practical/manage");
  redirect("/practical/manage?done=created");
}

export async function dropPracticalDay(form: FormData) {
  const me = await requireRole(["platform_admin"], "/practical/manage");
  await cancelDay(me.id, String(form.get("day")));
  revalidatePath("/practical/manage");
  redirect("/practical/manage?done=dropped");
}

export async function markPractical(form: FormData) {
  const me = await requireRole(["assessor"], "/practical/manage");
  try {
    await markAttendance(me.id, String(form.get("booking")), form.get("attended") === "yes", form.get("signedOff") === "on", String(form.get("note") ?? "").slice(0, 2000));
  } catch (e) {
    fail("/practical/manage", e);
  }
  revalidatePath("/practical/manage");
  redirect("/practical/manage?done=marked");
}
