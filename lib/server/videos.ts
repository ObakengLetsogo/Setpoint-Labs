import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { eq } from "drizzle-orm";
import { lessonVideos } from "@/db/schema";
import type { LessonVideo } from "@/data/videos";
import { db } from "./db";

// Videos live outside the web root in VIDEO_DIR/<lessonId>/. The browser only ever gets short
// lived signed URLs, issued with the lesson content after its access check. In production Nginx
// serves the bytes through an internal location (VIDEO_ACCEL=1); in development Node streams them.

export type VideoKind = "video" | "poster" | "captions";
export const KINDS: Record<VideoKind, { ext: string[]; type: string; column: "videoFile" | "posterFile" | "captionsFile"; max: number }> = {
  video: { ext: [".mp4", ".webm"], type: "video/mp4", column: "videoFile", max: 2 * 1024 ** 3 },
  poster: { ext: [".jpg", ".jpeg", ".png", ".webp"], type: "image/jpeg", column: "posterFile", max: 10 * 1024 ** 2 },
  captions: { ext: [".vtt"], type: "text/vtt", column: "captionsFile", max: 2 * 1024 ** 2 },
};

const TTL_S = 2 * 60 * 60;
export const videoDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.VIDEO_DIR ?? "storage/videos");
const secret = () => process.env.VIDEO_URL_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-video-secret");

const sign = (lessonId: string, kind: VideoKind, exp: number) => createHmac("sha256", secret()).update(`${lessonId}:${kind}:${exp}`).digest("base64url");

export function signedUrl(lessonId: string, kind: VideoKind, now = Date.now()) {
  const exp = Math.floor(now / 1000) + TTL_S;
  return `/api/video/${encodeURIComponent(lessonId)}/${kind}?exp=${exp}&sig=${sign(lessonId, kind, exp)}`;
}

export function checkSignature(lessonId: string, kind: VideoKind, exp: string | null, sig: string | null, now = Date.now()) {
  if (!secret() || !exp || !sig || Number(exp) < now / 1000) return false;
  const want = Buffer.from(sign(lessonId, kind, Number(exp)));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The player's view of a published video, with fresh signed URLs. */
export async function videoForLesson(lessonId: string): Promise<LessonVideo | undefined> {
  const row = (await db.select().from(lessonVideos).where(eq(lessonVideos.lessonId, lessonId)).limit(1))[0];
  if (!row?.published || !row.videoFile) return undefined;
  return {
    src: signedUrl(lessonId, "video"),
    poster: row.posterFile ? signedUrl(lessonId, "poster") : undefined,
    captions: row.captionsFile ? signedUrl(lessonId, "captions") : undefined,
    durationS: row.durationS ?? undefined,
    chapters: row.chapters ?? [],
  };
}

export async function fileFor(lessonId: string, kind: VideoKind) {
  const row = (await db.select().from(lessonVideos).where(eq(lessonVideos.lessonId, lessonId)).limit(1))[0];
  const name = row?.[KINDS[kind].column];
  return name ? path.join(videoDir(), lessonId, name) : null;
}

/** Streams an upload to disk, then records it. Writes to a temporary file first, so a broken upload never replaces a good one. */
export async function storeUpload(lessonId: string, kind: VideoKind, ext: string, body: ReadableStream<Uint8Array>, userId: string) {
  const dir = path.join(videoDir(), lessonId);
  await mkdir(dir, { recursive: true });
  const name = `${kind}${ext}`;
  const tmp = path.join(dir, `.${name}.${Date.now()}.part`);
  let size = 0;
  const limit = KINDS[kind].max;
  const counted = Readable.fromWeb(body as never).on("data", (chunk: Buffer) => {
    size += chunk.length;
    if (size > limit) counted.destroy(new Error("file too large"));
  });
  try {
    await pipeline(counted, createWriteStream(tmp));
  } catch (e) {
    await unlink(tmp).catch(() => undefined);
    throw e;
  }
  await rename(tmp, path.join(dir, name));
  const set = { [KINDS[kind].column]: name, updatedBy: userId, updatedAt: new Date() };
  await db.insert(lessonVideos).values({ lessonId, ...set }).onDuplicateKeyUpdate({ set });
  return { name, size };
}

/** A Response for a file on disk, honouring a Range header so the player can seek. */
export async function serveFile(file: string, type: string, range: string | null) {
  const { size } = await stat(file);
  const headers: Record<string, string> = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" };
  const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) } });
  }
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers: { ...headers, "Content-Length": String(size) } });
}
