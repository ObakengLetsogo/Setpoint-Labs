"use client";

import { useEffect, useRef } from "react";
import { useSim } from "@/store/sim";
import { IconTrash } from "@/components/ui/icons";

const SCAN_TIMES = [10, 50, 100, 250, 500];

function stamp(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = Math.floor(ms % 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(r).padStart(3, "0")}`;
}

const KIND = {
  info: "text-[#5b6068]",
  change: "text-ink",
  fault: "text-[#c2531a]",
  error: "text-fault",
  success: "font-semibold text-run",
};

export function ScanMonitor() {
  const running = useSim((s) => s.running);
  const log = useSim((s) => s.log);
  const scanCount = useSim((s) => s.scanCount);
  const scanMs = useSim((s) => s.scanMs);
  const setScanMs = useSim((s) => s.setScanMs);
  const clearLog = useSim((s) => s.clearLog);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <div className="m-3 mt-0 overflow-hidden rounded-xl border border-[#e1e4e8] bg-[#fbfcfc]">
      <div className="flex items-center justify-between border-b border-[#eceef0] bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[11px]">
          <span className="text-[#9aa1a9]">$</span>
          <span className="truncate text-ink">setpoint monitor --rig trainer-01</span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${running ? "bg-run/10 text-run" : "bg-[#eef0f2] text-muted-ink"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-run" : "bg-[#b9bec4]"}`} />
            {running ? "Running" : "Stopped"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[10px] text-muted-ink">scan {scanCount}</span>
          <label className="sr-only" htmlFor="scan-time">
            Scan time
          </label>
          <select
            id="scan-time"
            value={scanMs}
            onChange={(e) => setScanMs(Number(e.target.value))}
            className="rounded-md border border-[#e1e4e8] bg-white px-1.5 py-0.5 font-mono text-[10px] text-ink outline-none"
          >
            {SCAN_TIMES.map((t) => (
              <option key={t} value={t}>
                {t} ms
              </option>
            ))}
          </select>
          <button type="button" aria-label="Clear monitor" title="Clear" onClick={clearLog} className="rounded p-0.5 text-muted-ink hover:text-ink">
            <IconTrash size={13} />
          </button>
        </div>
      </div>
      <div ref={box} className="h-[150px] overflow-y-auto px-3 py-2 font-mono text-[11.5px] leading-[19px]" aria-live="polite">
        {log.length === 0 ? (
          <p className="text-muted-ink">
            <span className="text-[#9aa1a9]">›</span> waiting · press Run, then press Start on the rig. Every tag change lands here.
          </p>
        ) : (
          log.map((l) => (
            <div key={l.id} className="flex gap-2">
              <span className="shrink-0 text-[#a9afb6]">{stamp(l.t)}</span>
              <span className="shrink-0 text-[#c5cad0]">›</span>
              <span className={`whitespace-pre ${KIND[l.kind]}`}>{l.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
