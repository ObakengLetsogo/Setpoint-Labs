"use client";

import { useEffect, useState } from "react";
import { CURRICULUM, STAGES, type Track } from "@/data/curriculum";
import { LEVEL_NAMES, LEVELS, type Level } from "@/config/plans";
import { catalog as lessons } from "@/data/catalog";
import type { LessonIcon } from "@/data/types";
import { useSim } from "@/store/sim";
import { IconCheck, IconChevronDown, IconLock } from "@/components/ui/icons";

export const LESSON_RENDER: Record<LessonIcon, string> = {
  contacts: "pushbuttons",
  seal: "contactor",
  overload: "overload",
  interlock: "contactor",
  reverse: "motor",
  timer: "plc",
  stardelta: "motor",
  counter: "plc",
  compare: "plc",
  edge: "plc",
  tank: "terminals",
  conveyor: "motor",
  latch: "contactor",
  lamp: "pushbuttons",
  safety: "estop",
  estop: "estop",
  jog: "pushbuttons",
  sequence: "plc",
  fault: "breaker",
};

type Status = "done" | "runs" | "built" | "planned";

const STATUS_LABEL: Record<Status, string> = {
  done: "done by you",
  runs: "runs on the sim",
  built: "built, not run",
  planned: "planned",
};

function StatusDot({ status }: { status: Status }) {
  if (status === "done")
    return (
      <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-run text-white ring-2 ring-white">
        <IconCheck size={10} strokeWidth={3} />
      </span>
    );
  if (status === "runs") return <span className="block h-[14px] w-[14px] rounded-full border-[3px] border-run bg-white ring-2 ring-white" />;
  if (status === "built") return <span className="block h-[14px] w-[14px] rounded-full border-[3px] border-[#e08a3c] bg-white ring-2 ring-white" />;
  return <span className="block h-[14px] w-[14px] rounded-full border-[1.5px] border-dashed border-[#a9afb6] bg-white ring-2 ring-white" />;
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10.5px] text-[#5b6068]">
      {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <StatusDot status={s} />
          {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

interface Node {
  id: string;
  chip: string;
  title: string;
  icon: LessonIcon;
  status: Status;
  open: boolean;
  /** Needs a plan the learner does not have. */
  members: boolean;
}

function LessonNode({ n, active, onOpen }: { n: Node; active: boolean; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      disabled={!n.open}
      onClick={() => onOpen(n.id)}
      className="group flex w-[78px] shrink-0 flex-col items-center gap-1 disabled:cursor-default"
      title={`${n.chip} ${n.title} · ${STATUS_LABEL[n.status]}`}
    >
      <span
        className={`relative flex h-[58px] w-[58px] items-center justify-center rounded-[14px] transition ${
          n.status === "planned"
            ? "border-[1.5px] border-dashed border-[#c5cad0] bg-[#fafbfb]"
            : active
              ? "border-2 border-run bg-[#e8f5ef] shadow-[0_0_0_3px_rgba(31,157,107,0.15)]"
              : "border border-[#d9dde1] bg-[#f3f5f6] group-hover:-translate-y-0.5 group-hover:border-[#b9c0c7]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/parts/labs/${n.id}.png`}
          onError={(e) => {
            const img = e.currentTarget;
            const fallback = `/parts/${LESSON_RENDER[n.icon]}.png`;
            if (!img.src.endsWith(fallback)) img.src = fallback;
          }}
          alt=""
          width={44}
          height={44}
          className={`h-11 w-11 object-contain ${n.status === "planned" ? "opacity-45 grayscale" : ""}`}
        />
        <span className="absolute -bottom-1.5 -right-1.5">
          <StatusDot status={n.status} />
        </span>
        {n.members && (
          <span className="absolute -left-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-[#8a9097] ring-1 ring-[#e4e6e9]" aria-label="members">
            <IconLock size={10} />
          </span>
        )}
      </span>
      <span className={`font-mono text-[10.5px] font-bold ${n.status === "planned" ? "text-muted-ink" : "text-[#d9591a]"}`}>{n.chip}</span>
      <span className={`text-center text-[11px] leading-[1.25] ${n.status === "planned" ? "text-muted-ink" : "font-medium text-ink"}`}>{n.title}</span>
    </button>
  );
}

function Ring({ pct, color, label }: { pct: number; color: string; label: string }) {
  const r = 19;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#eceef0" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
      </svg>
      <span className="font-display text-[19px] font-bold leading-none" style={{ color }}>
        {label}
      </span>
    </span>
  );
}

function TrackSection({ track, nodes, activeId, open, onToggle, onOpen }: { track: Track; nodes: Node[]; activeId: string; open: boolean; onToggle: () => void; onOpen: (id: string) => void }) {
  const working = nodes.filter((n) => n.status === "done" || n.status === "runs").length;
  const ready = nodes.filter((n) => n.open).length;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <div id={`track-${track.id}`} className="relative scroll-mt-4 overflow-hidden rounded-2xl border border-[#e4e6e9] bg-white">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: track.ring }} />
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-4 pl-5 text-left">
        <Ring pct={nodes.length ? working / nodes.length : 0} color={track.ring} label={track.code} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[18px] font-bold uppercase leading-none tracking-[0.06em] text-ink">{track.name}</p>
          <p className="mt-1 text-[12.5px] text-[#5b6068]">{track.blurb}</p>
        </div>
        <div className="hidden shrink-0 text-right sm:block">
          <p className="font-mono text-[11px] text-muted-ink">
            <span className="font-display text-[18px] font-bold text-ink">{working}</span>/{nodes.length} working
          </p>
          <p className="font-mono text-[10.5px] text-muted-ink">
            {ready} open · {track.chapters.length} chapters
          </p>
        </div>
        <IconChevronDown size={18} className={`shrink-0 text-muted-ink transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-x-6 gap-y-4 border-t border-[#eceef0] px-5 pb-4 pt-4 lg:grid-cols-2">
          {track.chapters.map((ch, i) => (
            <div key={ch.id} className="min-w-0">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-ink">
                {track.id === "platforms" ? `Chapter ${i + 1}` : `Stage ${ch.stage}`} · <span className="text-ink">{ch.title}</span>
              </p>
              <p className="mt-0.5 text-[12px] text-[#6b6f76]">{ch.blurb}</p>
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1 pt-1.5">
                {ch.lessons.map((ref) => {
                  const n = byId.get(ref.id)!;
                  return <LessonNode key={n.id} n={n} active={n.id === activeId} onOpen={onOpen} />;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A stable empty list: a new [] on every render would make the store selector loop. */
const NO_LEVELS: Level[] = [];

export function LabTrack({ onOpen }: { onOpen: (id: string) => void }) {
  const completed = useSim((s) => s.completed);
  const ran = useSim((s) => s.ranLessons);
  const levels = useSim((s) => s.account?.levels ?? NO_LEVELS);
  const lessonId = useSim((s) => s.lessonId);
  const activeTrack = lessons.find((l) => l.id === lessonId)?.trackId;
  const [openTracks, setOpenTracks] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => openTracks[id] ?? id === activeTrack;

  // The track pills link to #track-<id>; open that track when one is followed.
  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace("#track-", "");
      if (CURRICULUM.some((t) => t.id === id)) setOpenTracks((o) => ({ ...o, [id]: true }));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const node = (id: string): Node => {
    const l = lessons.find((x) => x.id === id)!;
    return {
      id: l.id,
      chip: l.chip,
      title: l.title,
      icon: l.icon,
      open: !l.locked,
      members: !l.locked && !l.free && !levels.includes(CURRICULUM.find((t) => t.id === l.trackId)?.level ?? "F"),
      status: l.locked ? "planned" : completed[l.id] ? "done" : ran[l.id] ? "runs" : "built",
    };
  };

  return (
    <section id="labs" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-[22px] font-bold uppercase tracking-[0.08em] text-ink">All labs</h2>
        <StatusLegend />
      </div>
      {LEVELS.map((lv, li) => {
        const stages = STAGES.filter((st) => st.level === lv);
        return (
          <div key={lv} className="flex flex-col gap-3">
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#e4e6e9] pb-2">
              <h3 className="font-display text-[17px] font-bold uppercase tracking-[0.08em] text-ink">Level {li + 1}: {LEVEL_NAMES[lv]}</h3>
              <p className="font-mono text-[11px] text-muted-ink">Stages {stages.map((st) => st.n).join(", ")}{levels.includes(lv) ? " · open" : ""}</p>
            </div>
            {CURRICULUM.filter((t) => t.level === lv).map((t) => (
              <TrackSection
                key={t.id}
                track={t}
                nodes={t.chapters.flatMap((c) => c.lessons.map((r) => node(r.id)))}
                activeId={lessonId}
                open={isOpen(t.id)}
                onToggle={() => setOpenTracks((o) => ({ ...o, [t.id]: !isOpen(t.id) }))}
                onOpen={onOpen}
              />
            ))}
            {stages.filter((st) => st.planned).map((st) => (
              <div key={st.n} className="rounded-2xl border border-dashed border-[#d9dce0] bg-white/60 px-5 py-4">
                <p className="font-display text-[16px] font-bold uppercase tracking-[0.06em] text-[#6b6f76]">Stage {st.n}: {st.name}</p>
                <p className="mt-1 text-[12.5px] text-muted-ink">Coming soon. Its lessons are planned in the curriculum.</p>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
