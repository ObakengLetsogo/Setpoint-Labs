"use client";

import { LogoMark } from "@/components/Logo";
import { IconBook, IconKeyboard, IconLanguage, IconSliders } from "@/components/ui/icons";
import { lessons } from "@/data/lessons";
import { useSim } from "@/store/sim";

const TRACKS = [
  { id: "foundations", name: "Foundations", total: 20, icon: "pushbuttons" },
  { id: "process", name: "Process control", total: 10, icon: "motor", soon: true },
  { id: "wiring", name: "Wiring & commissioning", total: 10, icon: "terminals", soon: true },
  { id: "advanced", name: "Advanced", total: 10, icon: "plc", soon: true },
];

export function TopBar({ onOpen }: { onOpen: (sheet: "reference" | "settings" | "components" | "language") => void }) {
  const lessonId = useSim((s) => s.lessonId);
  const running = useSim((s) => s.running);
  const lesson = lessons.find((l) => l.id === lessonId)!;
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e6e9] bg-white shadow-[0_1px_2px_rgba(27,36,48,0.06)]">
          <LogoMark className="h-7 w-7" />
        </span>
        <div className="leading-none">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-ink">Setpoint labs</p>
          <p className="mt-1 font-display text-[22px] font-bold tracking-[0.01em] text-ink">
            Motor control <span className="text-accent">bench guide</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full bg-ink py-1.5 pl-3 pr-3.5 font-mono text-[10.5px] text-[#d6dae0] md:inline-flex">
          <span className={`h-2 w-2 rounded-full ${running ? "bg-run shadow-[0_0_0_3px_rgba(31,157,107,0.3)]" : "bg-[#7c838c]"}`} />
          On the bench now
          <span className="rounded-full bg-[#2c3644] px-2 py-0.5 text-[#7ee2b5]">
            {String(lesson.number).padStart(2, "0")} {lesson.title.toLowerCase()}
          </span>
        </span>
        <nav className="flex items-center rounded-full border border-[#e4e6e9] bg-white p-1 text-[12.5px] font-medium">
          <a href="#labs" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-white">
            <IconBook size={14} /> Labs
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
  const done = lessons.filter((l) => l.trackId === "foundations" && completed[l.id]).length;
  return (
    <div className="flex flex-wrap gap-2 py-1">
      {TRACKS.map((t, i) => {
        const count = i === 0 ? done : 0;
        const active = i === 0;
        return (
          <span
            key={t.id}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 text-[12.5px] font-medium ${
              active ? "border-accent/60 bg-white text-ink shadow-[0_0_0_3px_rgba(242,107,29,0.1)]" : "border-[#e4e6e9] bg-white text-[#4b5058]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/parts/${t.icon}.png`} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
            {t.name}
            {t.soon ? (
              <span className="font-mono text-[10px] text-muted-ink">soon</span>
            ) : (
              <>
                <span className="flex gap-[2px]">
                  {Array.from({ length: 10 }, (_, k) => (
                    <span key={k} className={`h-3 w-[3px] rounded-full ${k < Math.round((count / t.total) * 10) ? "bg-run" : "bg-[#dfe2e6]"}`} />
                  ))}
                </span>
                <span className="font-mono text-[10.5px] text-muted-ink">
                  {count}/{t.total}
                </span>
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function Hero({ onReadCode }: { onReadCode: () => void }) {
  const completed = useSim((s) => s.completed);
  const done = Object.values(completed).filter(Boolean).length;
  const ready = lessons.filter((l) => !l.locked).length;
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-[56px] font-extrabold uppercase leading-[0.9] tracking-[0.01em] text-ink sm:text-[76px]">
          Start <span className="text-accent">stop</span>
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-ink">Wire · Run · Watch · Read the code</p>
      </div>
      <div className="flex items-stretch gap-3">
        <div className="flex divide-x divide-[#e4e6e9] rounded-2xl border border-[#e4e6e9] bg-white shadow-[0_1px_2px_rgba(27,36,48,0.05)]">
          {[
            [6, "on the rig", "text-run"],
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
