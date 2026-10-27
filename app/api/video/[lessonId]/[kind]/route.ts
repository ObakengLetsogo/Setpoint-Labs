import path from "node:path";
import { checkSignature, fileFor, KINDS, serveFile, videoDir, type VideoKind } from "@/lib/server/videos";

/**
 * A lesson video, poster or caption file. Only a valid, unexpired signature from the lesson
 * content response opens it. With VIDEO_ACCEL=1 Nginx sends the bytes from an internal location.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/video/[lessonId]/[kind]">) {
  const { lessonId, kind } = await ctx.params;
  if (!(kind in KINDS)) return new Response("not found", { status: 404 });
  const url = new URL(req.url);
  if (!checkSignature(lessonId, kind as VideoKind, url.searchParams.get("exp"), url.searchParams.get("sig"))) return new Response("link expired", { status: 403 });
  const file = await fileFor(lessonId, kind as VideoKind);
  if (!file) return new Response("not found", { status: 404 });
  const type = KINDS[kind as VideoKind].type;
  if (process.env.VIDEO_ACCEL === "1") {
    const rel = path.relative(videoDir(), file).split(path.sep).map(encodeURIComponent).join("/");
    return new Response(null, { headers: { "X-Accel-Redirect": `/_protected_videos/${rel}`, "Content-Type": type } });
  }
  try {
    return await serveFile(file, type, req.headers.get("range"));
  } catch {
    return new Response("not found", { status: 404 });
  }
}
