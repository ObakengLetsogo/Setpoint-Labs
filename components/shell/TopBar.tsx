"use client";

import { LogoMark } from "@/components/Logo";
import { IconBook, IconCode, IconKeyboard, IconLanguage, IconSliders } from "@/components/ui/icons";
import { CURRICULUM } from "@/data/curriculum";
import { lessons } from "@/data/lessons";
import { useRig, useSim } from "@/store/sim";

export function TopBar({ onOpen }: { onOpen: (sheet: "reference" | "settings" | "components" | "language") => void }) {
  const lessonId = useSim((s) => s.lessonId);
  const running = useSim((s) => s.running);
  const lesson = lessons.find((l) => l.id === lessonId);
  const rig = useRig();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e6e9] bg-white shadow-[0_1px_2px_rgba(27,36,48,0.06)]">
          <LogoMark className="h-7 w-7" />
        </span>
        <div className="leading-none">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-ink">Setpoint labs</p>
          <p className="mt-1 font-display text-[22px] font-bold tracking-[0.01em] text-ink">
            {rig.name} <span className="text-accent">guide</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full bg-ink py-1.5 pl-3 pr-3.5 font-mono text-[10.5px] text-[#d6dae0] md:inline-flex">
          <span className={`h-2 w-2 rounded-full ${running ? "bg-run shadow-[0_0_0_3px_rgba(31,157,107,0.3)]" : "bg-[#7c838c]"}`} />
          On the bench now
          <span className="rounded-full bg-[#2c3644] px-2 py-0.5 text-[#7ee2b5]">
            {lesson ? `${lesson.chip} ${lesson.title.toLowerCase()}` : "sandbox"}
          </span>
        </span>
        <nav className="flex items-center rounded-full border border-[#e4e6e9] bg-white p-1 text-[12.5px] font-medium">
          <a href="#labs" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-white">
            <IconBook size={14} /> Labs
          </a>
          <a href="#sandbox" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[#3d434a] hover:text-ink">
            <IconCode size={14} /> <span className="hidden sm:inline">Sandbox</span>
          </a>
          <button type="button" onClick={() => onOpen("reference")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[#3d434a] hover:text-ink">
            <IconKeyboard size={14} /> <span className="hidden sm:inline">Controls</span>
          </button>
          <button type="button" onClick={() => onOpen("settings")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[#3d434a] hover:text-ink">
            <IconSliders size={14} /> <span className="hidden sm:inline">Settings</span>
          </button>
          <button type="button" aria-label="Language" onClick={() => onOpen("language")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[#3d434a] hover:text-ink">
            <IconLanguage size={14} /> <span className="hidden sm:inline">EN</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

export function TrackPills() {
  const completed = useSim((s) => s.completed);
  const lessonId = useSim((s) => s.lessonId);
  const current = lessons.find((l) => l.id === lessonId)?.trackId;
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {CURRICULUM.map((t) => {
        const inTrack = lessons.filter((l) => l.trackId === t.id);
        const done = inTrack.filter((l) => completed[l.id]).length;
        const open = inTrack.filter((l) => !l.locked).length;
        const active = t.id === current;
        return (
          <a
            key={t.id}
            href={`#track-${t.id}`}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-[12.5px] font-medium transition hover:border-ink/30 ${
              active ? "border-accent/60 bg-white text-ink shadow-[0_0_0_3px_rgba(242,107,29,0.1)]" : "border-[#e4e6e9] bg-white text-[#4b5058]"
            }`}
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full font-display text-[12px] font-bold text-white" style={{ background: t.ring }}>
              {t.code}
            </span>
            {t.name}
            <span className="flex gap-[2px]">
              {Array.from({ length: 10 }, (_, k) => (
                <span key={k} className={`h-3 w-[3px] rounded-full ${k < Math.round((done / inTrack.length) * 10) ? "bg-run" : "bg-[#dfe2e6]"}`} />
              ))}
            </span>
            <span className="font-mono text-[10.5px] text-muted-ink">
              {open === 0 ? "soon" : `${done}/${inTrack.length}`}
            </span>
          </a>
        );
      })}
    </div>
  );
}

export function Hero({ onReadCode }: { onReadCode: () => void }) {
  const completed = useSim((s) => s.completed);
  const done = Object.values(completed).filter(Boolean).length;
  const ready = lessons.filter((l) => !l.locked).length;
  const rig = useRig();
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-[56px] font-extrabold uppercase leading-[0.9] tracking-[0.01em] text-ink sm:text-[76px]">
          {rig.headline[0]} <span className="text-accent">{rig.headline[1]}</span>
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-ink">{rig.tagline}</p>
      </div>
      <div className="flex items-stretch gap-3">
        <div className="flex divide-x divide-[#e4e6e9] rounded-2xl border border-[#e4e6e9] bg-white shadow-[0_1px_2px_rgba(27,36,48,0.05)]">
          {[
            [rig.annotations.length, "on the rig", "text-run"],
            [done, "done by you", "text-accent"],
            [ready, "ready to try", "text-ink"],
          ].map(([n, label, tone]) => (
            <div key={label as string} className="px-5 py-3">
              <p className={`font-display text-[30px] font-bold leading-none ${tone}`}>{n}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-ink">{label}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onReadCode}
          className="hidden items-center gap-2 self-center rounded-xl border border-[#e4e6e9] bg-white px-4 py-3 text-[13px] font-semibold text-ink shadow-[0_1px_2px_rgba(27,36,48,0.05)] hover:border-ink/30 sm:inline-flex"
        >
          <span className="font-mono text-[12px]">&lt;/&gt;</span> Read its code
        </button>
      </div>
    </div>
  );
}
