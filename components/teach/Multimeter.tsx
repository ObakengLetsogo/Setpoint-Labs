"use client";

import { useMemo, useState } from "react";
import { potentials, probePoints } from "@/rigs/meter";
import { useRig, useSim } from "@/store/sim";

function Probe({ label, tone, value, onChange, points }: { label: string; tone: string; value: string; onChange: (v: string) => void; points: ReturnType<typeof probePoints> }) {
  const groups = [...new Set(points.map((p) => p.group))];
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-ink">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone }} />
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#dfe2e6] bg-white px-2.5 py-2 font-mono text-[12px] text-ink outline-none focus:border-ink/40"
      >
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {points
              .filter((p) => p.group === g)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

/** A DC voltmeter on the rig's control wiring. */
export function Multimeter() {
  const rig = useRig();
  const points = useMemo(() => probePoints(rig), [rig]);
  const [red, setRed] = useState(() => points.find((p) => p.id.startsWith("I"))?.id ?? points[0].id);
  const [black, setBlack] = useState(() => points.find((p) => p.id === "0V")?.id ?? points[1].id);
  const physical = useSim((s) => s.physical);
  const faults = useSim((s) => s.faults);
  const options = useSim((s) => s.rigOptions);
  const memory = useSim((s) => s.memory);
  const running = useSim((s) => s.running);
  const pot = potentials(rig, physical, faults, options, memory, running);
  const redId = points.some((p) => p.id === red) ? red : points[0].id;
  const blackId = points.some((p) => p.id === black) ? black : points[1].id;
  const volts = (pot[redId] ?? 0) - (pot[blackId] ?? 0);

  return (
    <div className="rounded-2xl border border-[#e4e6e9] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="flex w-full shrink-0 flex-col items-center justify-center rounded-xl bg-[#e3b52b] p-2.5 sm:w-[190px]">
          <div className="flex w-full flex-col items-end rounded-lg bg-[#c8d3b9] px-3 py-2 shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]">
            <span className="font-mono text-[9px] font-semibold tracking-[0.2em] text-[#3d4a35]">DC V</span>
            <span className="font-mono text-[34px] font-bold leading-none tabular-nums text-[#1d2618]">{volts.toFixed(1)}</span>
          </div>
          <span className="mt-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#4a3b0c]">Multimeter</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-[13px] leading-[1.6] text-[#4b5058]">
            Touch the probes anywhere on the control wiring. Black on 0 V and red on a terminal reads that point. Readings follow the rig live, faults included.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Probe label="Red probe" tone="#d23c3c" value={redId} onChange={setRed} points={points} />
            <Probe label="Black probe" tone="#1b2430" value={blackId} onChange={setBlack} points={points} />
          </div>
        </div>
      </div>
    </div>
  );
}
