import { z } from "zod";
import { isSandbox, sandboxRig } from "@/data/sandbox";
import { accessFor, canOpenLesson } from "@/lib/server/access";
import { currentUser } from "@/lib/server/auth";
import { saveProgram, validSlot } from "@/lib/server/progress";

const Body = z.object({ slot: z.string().max(80), language: z.enum(["ladder", "st"]), source: z.string().max(60_000) });

/** Saves the learner's program for a lesson or sandbox. Free accounts save free lessons and the motor starter sandbox. */
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorised" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !validSlot(parsed.data.slot)) return Response.json({ error: "bad request" }, { status: 400 });
  const { slot, language, source } = parsed.data;
  const allowed = isSandbox(slot) ? sandboxRig(slot) === "motor-starter" || (await accessFor(user.id)).paid : await canOpenLesson(user.id, slot);
  if (!allowed) return Response.json({ error: "upgrade" }, { status: 402 });
  await saveProgram(user.id, slot, language, source);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
