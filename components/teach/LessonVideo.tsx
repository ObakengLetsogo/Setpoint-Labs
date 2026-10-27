"use client";

import { useEffect, useRef, useState } from "react";
import type { LessonVideo as Video } from "@/data/videos";
import { IconPlay } from "@/components/ui/icons";

interface Cue {
  start: number;
  end: number;
  text: string;
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

function parseVtt(text: string): Cue[] {
  const toS = (v: string) => {
    const [h, m, s] = v.replace(",", ".").split(":").map(Number);
    return s === undefined ? h * 60 + m : h * 3600 + m * 60 + s;
  };
  const cues: Cue[] = [];
  for (const block of text.replace(/\r/g, "").split("\n\n")) {
    const lines = block.split("\n").filter(Boolean);
    const at = lines.findIndex((l) => l.includes("-->"));
    if (at < 0) continue;
    const [a, b] = lines[at].split("-->").map((x) => x.trim().split(" ")[0]);
    cues.push({ start: toS(a), end: toS(b), text: lines.slice(at + 1).join(" ") });
  }
  return cues;
}

/** Video lecture with chapter markers and a transcript that follows playback. */
export function LessonVideo({ video, title }: { video: Video | undefined; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(0);
  const [cues, setCues] = useState<Cue[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (!video?.captions) return;
    let alive = true;
    fetch(video.captions)
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => alive && setCues(parseVtt(t)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [video?.captions]);

  if (!video) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-[#d5d9de] bg-white px-5 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3f4f5] text-muted-ink">
          <IconPlay size={16} />
        </span>
        <div>
          <p className="text-[14px] font-semibold text-ink">Video lecture</p>
          <p className="text-[12.5px] text-[#5b6068]">The lecture for this lesson is on its way. The lab below works without it.</p>
        </div>
      </div>
    );
  }

  const seek = (t: number) => {
    if (!ref.current) return;
    ref.current.currentTime = t;
    void ref.current.play();
  };
  const chapterIndex = video.chapters.reduce((idx, c, i) => (now >= c.t ? i : idx), 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e6e9] bg-white">
      <video
        ref={ref}
        src={video.src}
        poster={video.poster}
        controls
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
        onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
        className="aspect-video w-full bg-[#11161c]"
        aria-label={`${title} video lecture`}
      >
        {video.captions && <track kind="captions" src={video.captions} srcLang="en" label="English" default />}
      </video>
      {video.chapters.length > 0 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-[#eceef0] px-3 py-2.5">
          {video.chapters.map((c, i) => (
            <button
              key={c.t}
              type="button"
              onClick={() => seek(c.t)}
              className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition ${i === chapterIndex ? "border-accent/50 bg-accent/[0.06] text-ink" : "border-[#e4e6e9] text-[#4b5058] hover:border-[#c9ced4]"}`}
            >
              <span className="mr-1.5 font-mono text-[10.5px] text-muted-ink">{fmt(c.t)}</span>
              {c.title}
            </button>
          ))}
        </div>
      )}
      {cues.length > 0 && (
        <div className="border-t border-[#eceef0] px-4 py-2.5">
          <button type="button" onClick={() => setShowTranscript((v) => !v)} className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-ink hover:text-ink">
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript && (
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-2">
              {cues.map((c) => {
                const on = now >= c.start && now < c.end;
                return (
                  <button
                    key={c.start}
                    type="button"
                    onClick={() => seek(c.start)}
                    className={`block w-full rounded-md px-2 py-1 text-left text-[13px] leading-[1.5] ${on ? "bg-run/10 text-ink" : "text-[#4b5058] hover:bg-[#f6f7f8]"}`}
                  >
                    <span className="mr-2 font-mono text-[10.5px] text-muted-ink">{fmt(c.start)}</span>
                    {c.text}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
