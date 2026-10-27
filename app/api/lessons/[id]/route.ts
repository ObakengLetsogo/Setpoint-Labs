import { metaOf } from "@/data/catalog";
import { canOpenLesson } from "@/lib/server/access";
import { currentUser } from "@/lib/server/auth";
import { wireBundle } from "@/lib/server/content";
import { videoForLesson } from "@/lib/server/videos";

/** Lesson content, only for those allowed to open it. Free lessons need no account. */
export async function GET(_req: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  const { id } = await ctx.params;
  const meta = metaOf(id);
  if (!meta || meta.locked) return Response.json({ error: "not found" }, { status: 404 });
  if (!meta.free) {
    const user = await currentUser();
    if (!user) return Response.json({ error: "sign in", reason: "signin" }, { status: 401 });
    if (!(await canOpenLesson(user.id, id))) return Response.json({ error: "upgrade", reason: "upgrade" }, { status: 402 });
  }
  const bundle = wireBundle(id);
  if (!bundle) return Response.json({ error: "not found" }, { status: 404 });
  const video = await videoForLesson(id);
  // Signed video links are per response, so nothing with them is cached in shared caches.
  return Response.json({ ...bundle, video }, { headers: { "Cache-Control": meta.free && !video ? "public, max-age=300" : "private, no-store" } });
}
