"use client";

import { useActionState, useState } from "react";
import { saveVideoDetails } from "@/app/actions/admin";
import { buttonClass } from "./SiteShell";

type Kind = "video" | "poster" | "captions";
const ACCEPT: Record<Kind, string> = { video: "video/mp4,video/webm", poster: "image/jpeg,image/png,image/webp", captions: ".vtt,text/vtt" };
const LABEL: Record<Kind, string> = { video: "Video, MP4", poster: "Poster image", captions: "Captions, WebVTT" };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** Uploads a lesson's files straight to disk with progress, then saves chapters and publishes. */
export function VideoUploader({ lessonId, files, chapters, duration, published }: { lessonId: string; files: Partial<Record<Kind, string>>; chapters: string; duration: number | null; published: boolean }) {
  const [progress, setProgress] = useState<Partial<Record<Kind, string>>>({});
  const [dur, setDur] = useState<number | null>(duration);
  const [state, run, pending] = useActionState(saveVideoDetails, {});

  const upload = (kind: Kind, file: File) => {
    if (kind === "video") {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => setDur(Math.round(v.duration));
      v.src = URL.createObjectURL(file);
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/admin/videos/${lessonId}?kind=${kind}&name=${encodeURIComponent(file.name)}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress((p) => ({ ...p, [kind]: `${Math.round((e.loaded / e.total) * 100)} %` }));
    xhr.onload = () => setProgress((p) => ({ ...p, [kind]: xhr.status === 200 ? "uploaded" : (JSON.parse(xhr.responseText || "{}").error ?? "failed") }));
    xhr.onerror = () => setProgress((p) => ({ ...p, [kind]: "failed" }));
    xhr.send(file);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-3">
        {(Object.keys(LABEL) as Kind[]).map((k) => (
          <label key={k} className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-ink">
              {LABEL[k]} <span className="font-mono text-[11px] text-muted-ink">{progress[k] ?? files[k] ?? "none"}</span>
            </span>
            <input type="file" accept={ACCEPT[k]} onChange={(e) => e.target.files?.[0] && upload(k, e.target.files[0])} className="text-[12.5px] file:mr-3 file:rounded-lg file:border-0 file:bg-[#f3f4f5] file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium" />
          </label>
        ))}
      </div>
      <form action={run} className="flex flex-col gap-3">
        <input type="hidden" name="lessonId" value={lessonId} />
        <input type="hidden" name="duration" value={dur ?? ""} />
        <label className="flex flex-col gap-1">
          <span className="text-[12.5px] font-medium text-ink">Chapters <span className="font-mono text-[11px] text-muted-ink">one per line, e.g. 1:05 The seal-in{dur ? ` · length ${fmt(dur)}` : ""}</span></span>
          <textarea name="chapters" defaultValue={chapters} rows={5} className="rounded-lg border border-[#dfe2e6] p-2.5 font-mono text-[12.5px] outline-none focus:border-ink/40" />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" name="published" defaultChecked={published} /> Published, visible to learners who can open the lesson
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={buttonClass}>Save</button>
          {state.error && <span className="text-[12.5px] text-[#9b2c2c]">{state.error}</span>}
          {state.ok && <span className="text-[12.5px] text-[#1b6b4a]">{state.ok}</span>}
        </div>
      </form>
    </div>
  );
}
