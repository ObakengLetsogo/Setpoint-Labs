import Link from "next/link";
import { Suspense } from "react";
import { lessonVideos } from "@/db/schema";
import { CURRICULUM } from "@/data/curriculum";
import { requireRole } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { VideoUploader } from "@/components/site/VideoUploader";
import { SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Lesson videos · Setpoint Labs", robots: { index: false } };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

async function Videos() {
  await requireRole(["platform_admin"], "/admin/videos");
  const rows = new Map((await db.select().from(lessonVideos)).map((r) => [r.lessonId, r]));
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[#e4e6e9] bg-white p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Admin · <Link href="/admin" className="hover:underline">back</Link></p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-ink">Lesson videos</h1>
        <p className="mt-1 text-[13.5px] leading-[1.6] text-[#4b5058]">Upload a video, poster and captions for any lesson, add chapters and publish. Files are stored privately and reach learners only through short lived signed links.</p>
      </div>
      {CURRICULUM.map((t) => (
        <section key={t.id} className="rounded-2xl border border-[#e4e6e9] bg-white">
          <h2 className="border-b border-[#eef0f2] px-5 py-3 text-[15px] font-semibold text-ink">{t.name}</h2>
          {t.chapters.flatMap((c) => c.lessons).map((l) => {
            const r = rows.get(l.id);
            return (
              <details key={l.id} className="border-t border-[#f1f2f4] first:border-t-0">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3 text-[13.5px] text-ink">
                  <span>{l.title}</span>
                  <span className={`font-mono text-[11px] ${r?.published ? "text-[#1b6b4a]" : "text-muted-ink"}`}>{r?.published ? `published${r.durationS ? ` · ${fmt(r.durationS)}` : ""}` : r?.videoFile ? "uploaded, not published" : "no video"}</span>
                </summary>
                <div className="px-5 pb-5">
                  <VideoUploader
                    lessonId={l.id}
                    files={{ video: r?.videoFile ?? undefined, poster: r?.posterFile ?? undefined, captions: r?.captionsFile ?? undefined }}
                    chapters={(r?.chapters ?? []).map((c) => `${fmt(c.t)} ${c.title}`).join("\n")}
                    duration={r?.durationS ?? null}
                    published={Boolean(r?.published)}
                  />
                </div>
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
}

export default function AdminVideosPage() {
  return (
    <SiteShell wide>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Videos />
      </Suspense>
    </SiteShell>
  );
}
