import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { PLATFORMS } from "@/engine/platforms";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { platformLockFor } from "@/lib/server/orgs";

/** Sets the learner's controller family. A class or organisation lock wins. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorised" }, { status: 401 });
  const { platform } = ((await req.json().catch(() => ({}))) ?? {}) as { platform?: string };
  if (!PLATFORMS.some((p) => p.id === platform)) return Response.json({ error: "unknown platform" }, { status: 400 });
  const lock = await platformLockFor(user.id);
  if (lock && lock !== platform) return Response.json({ error: "locked", lock }, { status: 409 });
  await db.update(users).set({ platform: platform! }).where(eq(users.id, user.id));
  return Response.json({ ok: true });
}
