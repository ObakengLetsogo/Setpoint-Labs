"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AutomationApi } from "@/components/AutomationApi";
import { LogoMark, Wordmark } from "@/components/Logo";
import { LadderDiagram } from "@/components/ladder/LadderDiagram";
import { lessons } from "@/data/lessons";
import { TAGS, readInputs } from "@/rigs/motorStarter";
import { useRecord } from "@/store/record";
import { useSim } from "@/store/sim";

const Scene = dynamic(() => import("@/components/stage/Scene"), { ssr: false });

/** Keep this much of the frame clear at the bottom for burned in captions. */
const CAPTION_SAFE = { landscape: 150, portrait: 300 };

/**
 * Clean, chrome free layout for lesson videos. The recorder drives it through window.setpointLabs
 * with a fake clock, so nothing here may depend on CSS animation timing.
 */
export function RecordStage({ lessonId }: { lessonId: string }) {
  const params = useSearchParams();
  const hideChrome = params.get("hideChrome") === "1";
  const card = params.get("card");
  const manual = params.get("manual") === "1";
  const lesson = lessons.find((l) => l.id === lessonId) ?? lessons[0];
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    useSim.getState().setLesson(lessonId);
    const fit = () => setPortrait(window.innerHeight > window.innerWidth);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [lessonId]);

  if (card === "intro" || card === "outro") return <TitleCard kind={card} title={lesson.title} number={lesson.number} />;

  const safe = portrait ? CAPTION_SAFE.portrait : CAPTION_SAFE.landscape;

  return (
    <div className="record-mode fixed inset-0 overflow-hidden bg-[#f4f5f6] bg-[linear-gradient(#e9ebed_1px,transparent_1px),linear-gradient(90deg,#e9ebed_1px,transparent_1px)] bg-[size:32px_32px]">
      <AutomationApi />
      {portrait ? (
        <div className="flex h-full flex-col" style={{ paddingBottom: safe }}>
          <Header lessonNumber={lesson.number} title={lesson.title} portrait />
          <div className="relative min-h-0 flex-1">
            <Scene framing="full" manual={manual} />
            <LabelChip />
            <RunPill />
          </div>
          <div className="px-10 pb-4">
            <LadderPanel portrait />
          </div>
        </div>
      ) : (
        <div className="grid h-full grid-cols-[minmax(0,1fr)_600px]" style={{ paddingBottom: safe }}>
          <div className="relative flex min-h-0 flex-col">
            <Header lessonNumber={lesson.number} title={lesson.title} />
            <div className="relative min-h-0 flex-1">
              <Scene framing="full" manual={manual} />
              <LabelChip />
              <RunPill />
            </div>
          </div>
          <div className="flex min-h-0 flex-col justify-center pr-14 pt-10">
            <LadderPanel />
          </div>
        </div>
      )}
      {!hideChrome && <PreviewControls />}
    </div>
  );
}

function Header({ lessonNumber, title, portrait }: { lessonNumber: number; title: string; portrait?: boolean }) {
  return (
    <div className={`flex items-center gap-4 ${portrait ? "px-10 pt-16" : "px-14 pt-12"}`}>
      <LogoMark className={portrait ? "h-14 w-14" : "h-12 w-12"} />
      <div>
        <p className="font-mono text-[15px] font-semibold uppercase tracking-[0.22em] text-[#d9591a]">
          Setpoint Labs · Lesson {lessonNumber}
        </p>
        <h1 className={`mt-1 font-display font-bold uppercase leading-none tracking-[0.04em] text-ink ${portrait ? "text-[52px]" : "text-[46px]"}`}>{title}</h1>
      </div>
    </div>
  );
}

function LabelChip() {
  const label = useRecord((s) => s.label);
  if (!label) return null;
  return (
    <div className="absolute left-14 top-6 z-10 rounded-2xl border border-[#e4e6e9] bg-white/95 px-6 py-4 shadow-[0_18px_40px_-20px_rgba(27,36,48,0.45)]">
      {label.kicker && <p className="font-mono text-[14px] font-semibold uppercase tracking-[0.2em] text-[#1f9d6b]">{label.kicker}</p>}
      <p className="mt-1 font-display text-[34px] font-bold uppercase leading-none tracking-[0.04em] text-ink">{label.title}</p>
    </div>
  );
}

function RunPill() {
  const running = useSim((s) => s.running);
  const motor = useSim((s) => Boolean(s.memory.Motor_Run));
  const text = !running ? "PLC stopped" : motor ? "Motor running" : "PLC running";
  return (
    <div className="absolute right-6 top-6 z-10 flex items-center gap-2.5 rounded-full border border-[#e4e6e9] bg-white px-5 py-2.5 shadow-sm">
      <span className={`block h-3 w-3 rounded-full ${motor ? "bg-[#1f9d6b]" : running ? "bg-[#2457a6]" : "bg-[#b9bec4]"}`} />
      <span className="font-mono text-[15px] font-semibold uppercase tracking-[0.16em] text-ink">{text}</span>
    </div>
  );
}

function LadderPanel({ portrait }: { portrait?: boolean }) {
  const program = useSim((s) => s.program);
  const trace = useSim((s) => s.trace);
  const memory = useSim((s) => s.memory);
  const physical = useSim((s) => s.physical);
  const faults = useSim((s) => s.faults);
  const rigOptions = useSim((s) => s.rigOptions);
  const highlight = useSim((s) => s.highlightRung);
  const inputs = readInputs(physical, faults, rigOptions);
  const activeLine = highlight ? program?.rungs[highlight - 1]?.line : null;

  return (
    <div className="rounded-3xl border border-[#e4e6e9] bg-white p-7 shadow-[0_24px_60px_-30px_rgba(27,36,48,0.35)]">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[14px] font-semibold uppercase tracking-[0.22em] text-muted-ink">Ladder · live</p>
        <p className="font-mono text-[13px] text-muted-ink">{program ? `${program.rungs.length} rungs` : ""}</p>
      </div>
      <div className="mt-3" style={{ zoom: portrait ? 1.9 : 1.45 }}>
        {program && <LadderDiagram program={program} trace={trace} memory={memory} activeLine={activeLine} />}
      </div>
      <div className={`mt-5 grid gap-x-6 gap-y-2.5 border-t border-[#eceef0] pt-5 ${portrait ? "grid-cols-4" : "grid-cols-2"}`}>
        {TAGS.filter((t) => t.kind !== "marker").map((t) => {
          const on = t.kind === "input" ? Boolean(inputs[t.tag]) : Boolean(memory[t.tag]);
          return (
            <div key={t.tag} className="flex items-center gap-2.5">
              <span className={`block h-3 w-3 shrink-0 rounded-full ${on ? "bg-[#1f9d6b]" : "bg-[#d5d9dd]"}`} />
              <span className="font-mono text-[14px] text-muted-ink">{t.address}</span>
              <span className={`truncate font-mono text-[14px] ${on ? "font-semibold text-ink" : "text-[#6b6f76]"}`}>{t.tag}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TitleCard({ kind, title, number }: { kind: "intro" | "outro"; title: string; number: number }) {
  return (
    <div className="record-mode fixed inset-0 flex flex-col items-center justify-center gap-8 bg-[#f4f5f6] bg-[linear-gradient(#e9ebed_1px,transparent_1px),linear-gradient(90deg,#e9ebed_1px,transparent_1px)] bg-[size:32px_32px] px-16 text-center">
      <div className="flex items-center gap-5">
        <LogoMark className="h-24 w-24" />
        <Wordmark className="text-[72px] leading-none" />
      </div>
      {kind === "intro" ? (
        <div>
          <p className="font-mono text-[22px] font-semibold uppercase tracking-[0.26em] text-[#d9591a]">Lesson {number}</p>
          <p className="mt-3 font-display text-[64px] font-bold uppercase leading-none tracking-[0.04em] text-ink">{title}</p>
        </div>
      ) : (
        <div>
          <p className="font-display text-[44px] font-bold uppercase leading-none tracking-[0.04em] text-ink">Now run it yourself</p>
          <p className="mt-4 font-mono text-[22px] tracking-[0.12em] text-muted-ink">setpointlabs.co.za</p>
        </div>
      )}
    </div>
  );
}

function PreviewControls() {
  const running = useSim((s) => s.running);
  const btn = "rounded-lg border border-[#e1e4e8] bg-white px-3 py-1.5 font-mono text-[12px] text-ink";
  return (
    <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-xl border border-[#e4e6e9] bg-white/90 p-2 shadow">
      <button type="button" className={btn} onClick={() => useSim.getState().toggleRun()}>
        {running ? "Stop PLC" : "Run PLC"}
      </button>
      <button type="button" className={btn} onPointerDown={() => useSim.getState().press("start", true)} onPointerUp={() => useSim.getState().press("start", false)}>
        Hold Start
      </button>
      <button type="button" className={btn} onPointerDown={() => useSim.getState().press("stop", true)} onPointerUp={() => useSim.getState().press("stop", false)}>
        Hold Stop
      </button>
      <span className="self-center px-2 font-mono text-[11px] text-muted-ink">add ?hideChrome=1 to hide</span>
    </div>
  );
}
