"use client";

import { useEffect, useMemo, useState } from "react";
import { useInputs, useRig, useSim } from "@/store/sim";
import type { PlcTerminal } from "@/rigs/types";
import { IconChevronLeft, IconChevronRight, IconPause, IconPlay } from "@/components/ui/icons";
import { DeviceGlyph } from "./DeviceGlyph";
import { TERMINAL_FILL, TerminalChip, toneFor, usedTerminals } from "./Terminal";

const W = 694;
const CARD_W = 230;
const PLC_X = 182;
const DEV_X = 448;
const ROW = 25;
const TOP = 46;
const CARD_H = 44;
const CARD_GAP = 8;

function plcY(id: string, terminals: PlcTerminal[]) {
  const i = terminals.findIndex((t) => t.id === id);
  return TOP + i * ROW;
}

function deviceLayout(devices: string[]) {
  const map: Record<string, number> = {};
  devices.forEach((d, i) => (map[d] = 30 + i * (CARD_H + CARD_GAP)));
  return map;
}

export function WiringView({ wires }: { wires: number[] }) {
  const rig = useRig();
  const list = useMemo(() => rig.wiring.wires.filter((w) => wires.includes(w.n)), [wires, rig.wiring.wires]);
  const devices = useMemo(() => rig.wiring.devices.filter((d) => list.some((w) => w.device === d.id)), [list, rig.wiring.devices]);
  const dy = deviceLayout(devices.map((d) => d.id));
  const used = usedTerminals(wires, rig.wiring);
  const [step, setStep] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [signals, setSignals] = useState(false);
  const memory = useSim((s) => s.memory);
  const reduce = useSim((s) => s.settings.reduceMotion);
  const inputs = useInputs();
  const total = list.length;
  const current = list[Math.min(step, total) - 1];
  const height = Math.max(TOP + rig.wiring.terminals.length * ROW, 30 + devices.length * (CARD_H + CARD_GAP)) + 10;

  useEffect(() => {
    if (!playing || reduce) return;
    const id = setTimeout(() => setStep((s) => (s >= total ? s : s + 1)), 2600);
    return () => clearTimeout(id);
  }, [playing, step, total, reduce]);

  const liveOf = (signal?: string) => {
    if (!signal) return false;
    return signal in inputs ? Boolean(inputs[signal]) : Boolean(memory[signal]);
  };

  const devTermY = (device: string, terminal: string) => {
    const d = rig.wiring.devices.find((x) => x.id === device)!;
    const j = d.terminals.indexOf(terminal);
    return dy[device] + 15 + j * 16;
  };

  const btn = "inline-flex items-center gap-1 rounded-lg border border-[#e1e4e8] bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink hover:border-[#c9ced4] disabled:opacity-40";

  return (
    <div className="rounded-2xl border border-[#e4e6e9] bg-[#fafbfb] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={btn} disabled={step <= 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
            <IconChevronLeft size={13} /> Prev
          </button>
          <button type="button" className={btn} onClick={() => setPlaying((p) => !p)}>
            {playing ? <IconPause size={12} /> : <IconPlay size={11} />} {playing ? "Pause" : "Play"}
          </button>
          <button type="button" className={btn} disabled={step >= total} onClick={() => setStep((s) => Math.min(total, s + 1))}>
            Next <IconChevronRight size={13} />
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              setStep(total);
              setPlaying(false);
            }}
          >
            Show all
          </button>
          <button type="button" className={`${btn} ${signals ? "!border-run !bg-run/10 !text-run" : ""}`} onClick={() => setSignals((s) => !s)}>
            <span className={`h-1.5 w-1.5 rounded-full ${signals ? "bg-run" : "bg-[#b9bec4]"}`} /> Signals
          </button>
        </div>
        <span className="font-mono text-[10.5px] text-muted-ink">
          {Math.min(step, total)} / {total} wires
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${height}`} className="block w-full min-w-[560px]" role="img" aria-label="Wiring diagram">
          <text x={44} y={22} className="wiring-kicker">
            PLC1 · SIGNAL BOARD
          </text>
          <rect x={40} y={30} width={142} height={rig.wiring.terminals.length * ROW + 8} rx={10} fill="#262c34" />
          {rig.wiring.terminals.map((t) => {
            const y = plcY(t.id, rig.wiring.terminals);
            const tone = toneFor(t.id, used, rig.wiring);
            const isUsed = list.some((w) => w.plc === t.id);
            return (
              <g key={t.id}>
                <text x={58} y={y + 3.5} className="wiring-term" fill={isUsed ? "#eef1f4" : "#7d8792"}>
                  {t.label}
                </text>
                <circle cx={PLC_X - 14} cy={y} r={5} fill={TERMINAL_FILL[tone]} opacity={isUsed ? 1 : 0.45} />
              </g>
            );
          })}

          <text x={DEV_X} y={22} className="wiring-kicker">
            FIELD DEVICES
          </text>
          {devices.map((d) => (
            <g key={d.id}>
              <rect x={DEV_X} y={dy[d.id]} width={CARD_W} height={CARD_H} rx={8} fill="#ffffff" stroke="#e1e4e8" />
              <rect x={DEV_X} y={dy[d.id]} width={4} height={CARD_H} rx={2} fill={d.tone} />
              <text x={DEV_X + 46} y={dy[d.id] + 26} className="wiring-device">
                {d.name}
              </text>
              <DeviceGlyph id={d.id} x={DEV_X + CARD_W - 22} y={dy[d.id] + CARD_H / 2} live={liveOf(rig.wiring.wires.find((w) => w.device === d.id && w.signal)?.signal)} />
              {d.terminals.map((term, j) => (
                <g key={term}>
                  <circle cx={DEV_X + 14} cy={dy[d.id] + 15 + j * 16} r={4.5} fill="#ffffff" stroke="#8d949c" strokeWidth={1.4} />
                  <text x={DEV_X + 24} y={dy[d.id] + 18.5 + j * 16} className="wiring-pin">
                    {term}
                  </text>
                </g>
              ))}
            </g>
          ))}

          {list.map((w, i) => {
            const shown = i < step;
            if (!shown) return null;
            const y1 = plcY(w.plc, rig.wiring.terminals);
            const y2 = devTermY(w.device, w.terminal);
            const x1 = PLC_X - 14;
            const x2 = DEV_X + 14;
            const d = `M ${x1} ${y1} C ${x1 + 130} ${y1}, ${x2 - 130} ${y2}, ${x2} ${y2}`;
            const isCurrent = i === step - 1 && step <= total && !signals;
            const on = liveOf(w.signal) || (signals && (w.plc === "24V" || w.plc === "0V"));
            const stroke = signals ? (on ? "#1f9d6b" : "#c3c8ce") : w.color;
            return (
              <g key={`${w.n}-${isCurrent ? step : "x"}`}>
                <path d={d} fill="none" stroke="#ffffff" strokeWidth={isCurrent ? 7 : 5} strokeLinecap="round" opacity={0.9} />
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={isCurrent ? 3.2 : 2.2}
                  strokeLinecap="round"
                  pathLength={1}
                  className={isCurrent && !reduce ? "wire-draw" : ""}
                  opacity={!signals && !isCurrent && step <= total && i < step - 1 ? 0.55 : 1}
                />
                {signals && on && <path d={d} fill="none" stroke="#9af0c5" strokeWidth={1.4} strokeLinecap="round" className="ladder-flow" />}
                <circle cx={x1} cy={y1} r={3} fill={stroke} />
                <circle cx={x2} cy={y2} r={3} fill={stroke} />
              </g>
            );
          })}
        </svg>
      </div>

      {current && (
        <div key={current.n} className="mt-3 flex items-start gap-2.5 animate-fade-up">
          <span className="mt-[3px] h-3 w-3 shrink-0 rounded-[3px]" style={{ background: current.color }} />
          <div>
            <p className="font-mono text-[12.5px] font-semibold text-ink">
              Wire {current.n}: {current.title}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[#4b5058]">{current.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function WiringTable({ wires }: { wires: number[] }) {
  const rig = useRig();
  const used = usedTerminals(wires, rig.wiring);
  const list = rig.wiring.wires.filter((w) => wires.includes(w.n));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[460px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-ink">
            <th className="pb-2 font-medium">Device terminal</th>
            <th className="pb-2 font-medium">PLC terminal</th>
            <th className="pb-2 font-medium">Role</th>
          </tr>
        </thead>
        <tbody>
          {list.map((w) => {
            const d = rig.wiring.devices.find((x) => x.id === w.device)!;
            return (
              <tr key={w.n} className="border-t border-[#eceef0]">
                <td className="py-2.5 text-ink">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: d.tone }} />
                  {d.name.split(" ").slice(0, -1).join(" ")} <span className="font-mono text-[11.5px] text-muted-ink">{w.terminal}</span>
                </td>
                <td className="py-2.5">
                  <TerminalChip id={w.plc} tone={toneFor(w.plc, used, rig.wiring)} />
                </td>
                <td className="py-2.5 text-[#4b5058]">{w.role}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
