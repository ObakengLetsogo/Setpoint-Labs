import path from "node:path";
import { metaOf } from "@/data/catalog";
import { currentUser } from "@/lib/server/auth";
import { audit } from "@/lib/server/billing";
import { KINDS, storeUpload, type VideoKind } from "@/lib/server/videos";

/** Upload one file for a lesson: PUT ?kind=video|poster|captions&name=<original file name>, the raw file as the body. */
export async function PUT(req: Request, ctx: RouteContext<"/api/admin/videos/[lessonId]">) {
  const user = await currentUser();
  if (user?.role !== "platform_admin") return Response.json({ error: "forbidden" }, { status: 403 });
  const { lessonId } = await ctx.params;
  if (!metaOf(lessonId)) return Response.json({ error: "unknown lesson" }, { status: 404 });
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as VideoKind;
  const ext = path.extname(url.searchParams.get("name") ?? "").toLowerCase();
  if (!(kind in KINDS) || !KINDS[kind].ext.includes(ext)) return Response.json({ error: `Expected ${KINDS[kind]?.ext.join(" or ") ?? "a known kind"}` }, { status: 400 });
  if (!req.body) return Response.json({ error: "empty body" }, { status: 400 });
  try {
    const r = await storeUpload(lessonId, kind, ext, req.body, user.id);
    await audit(user.id, "video.uploaded", lessonId, { kind, size: r.size });
    return Response.json({ ok: true, ...r });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "upload failed" }, { status: 400 });
  }
}
