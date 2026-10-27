"use client";

import { PLC_TERMINALS, WIRES } from "@/data/teach";
import { TAGS } from "@/rigs/motorStarter";
import { useSim } from "@/store/sim";
import { readInputs } from "@/rigs/motorStarter";
import { Legend, TERMINAL_DOT, TerminalChip, toneFor, usedTerminals } from "./Terminal";

const TAG_SHORT: Record<string, string> = {
  Start_PB: "START",
  Stop_PB: "STOP",
  Overload_OK: "OL OK",
  EStop_OK: "E-STOP",
  Motor_Run: "K1",
  Run_Lamp: "RUN",
  Fault_Lamp: "FAULT",
};

export function IoPinout({ wires, between }: { wires: number[]; between: string[] }) {
  const used = usedTerminals(wires);
  const memory = useSim((s) => s.memory);
  const physical = useSim((s) => s.physical);
  const faults = useSim((s) => s.faults);
  const rigOptions = useSim((s) => s.rigOptions);
  const inputs = readInputs(physical, faults, rigOptions);
  const inputsCol = PLC_TERMINALS.filter((t) => t.kind === "input" || t.id === "24V");
  const outputsCol = PLC_TERMINALS.filter((t) => t.kind === "output" || t.id === "0V");

  const live = (id: string) => {
    const tag = TAGS.find((t) => t.address === id);
    if (!tag) return false;
    return tag.kind === "input" ? Boolean(inputs[tag.tag]) : Boolean(memory[tag.tag]);
  };
  const nameFor = (id: string) => {
    const tag = TAGS.find((t) => t.address === id)?.tag;
    const w = WIRES.find((x) => x.plc === id && wires.includes(x.n));
    if (!w) return null;
    return tag ? TAG_SHORT[tag] ?? tag : id === "24V" ? "COM" : "A2";
  };

  const Row = ({ id, label, side }: { id: string; label: string; side: "left" | "right" }) => {
    const tone = toneFor(id, used);
    const name = nameFor(id);
    const on = live(id);
    const dot = (
      <span className={`relative h-[11px] w-[11px] shrink-0 rounded-full ring-2 ring-[#2b313a] ${TERMINAL_DOT[tone]} ${tone === "safe" ? "opacity-60" : ""}`}>
        {on && <span className="absolute -inset-[3px] rounded-full ring-2 ring-[#3ee08a] animate-pulse" />}
      </span>
    );
    return (
      <div className={`flex h-[22px] items-center gap-1.5 ${side === "right" ? "flex-row-reverse" : ""}`}>
        <span className={`flex w-[66px] shrink-0 items-center gap-1 ${side === "right" ? "flex-row-reverse" : ""}`}>
          {name ? <TerminalChip id={id} tone={tone} label={name} /> : null}
          {name && <span className="h-px flex-1 border-t border-dashed border-[#c9cdd2]" />}
        </span>
        <span className={`w-9 font-mono text-[10px] ${side === "right" ? "text-left" : "text-right"} ${name ? "font-semibold text-ink" : "text-muted-ink"}`}>
          {label.replace("L+ ", "").replace("M ", "")}
        </span>
        {dot}
      </div>
    );
  };

  return (
    <aside className="rounded-2xl border border-[#e4e6e9] bg-white p-4 shadow-[0_1px_2px_rgba(27,36,48,0.05)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-ink">PLC1 · signal board</p>
      <div className="mt-3 flex items-stretch justify-center gap-1">
        <div className="flex flex-col justify-between py-3">
          {inputsCol.map((t) => (
            <Row key={t.id} id={t.id} label={t.label} side="left" />
          ))}
        </div>
        <div className="relative w-[64px] shrink-0 rounded-xl bg-[#262c34] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_18px_-10px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-x-2 top-2 rounded-md bg-[#1b2027] px-1 py-1.5 text-center">
            <p className="font-display text-[9px] font-bold tracking-[0.12em] text-[#e9ecef]">SETPOINT</p>
            <p className="font-mono text-[7px] text-[#7f8995]">DI 6 · DQ 4</p>
          </div>
          <div className="absolute bottom-2 left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-full bg-accent" />
        </div>
        <div className="flex flex-col justify-between py-3">
          {outputsCol.map((t) => (
            <Row key={t.id} id={t.id} label={t.label} side="right" />
          ))}
        </div>
      </div>
      <Legend className="mt-4" />
      <details className="mt-4 border-t border-[#eceef0] pt-3" open>
        <summary className="cursor-pointer font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink">Between lessons</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12.5px] leading-[1.5] text-[#4b5058]">
          {between.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ol>
      </details>
    </aside>
  );
}
