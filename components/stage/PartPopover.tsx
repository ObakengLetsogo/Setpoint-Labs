"use client";

import type { ReactNode } from "react";
import { useSim } from "@/store/sim";
import { TAGS, contactorClosed, partById, readInputs } from "@/rigs/motorStarter";
import { Segmented, Toggle } from "@/components/ui/controls";
import { IconCrosshair, IconX } from "@/components/ui/icons";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[12.5px] text-ink">{label}</span>
      {children}
    </div>
  );
}

function Meter({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ece8df]">
      <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${Math.round(value * 100)}%`, background: tone }} />
    </div>
  );
}

function HoldButton({ label, onDown, onUp, tone }: { label: string; onDown: () => void; onUp: () => void; tone: string }) {
  return (
    <button
      type="button"
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onKeyDown={(e) => e.key === "Enter" && onDown()}
      onKeyUp={(e) => e.key === "Enter" && onUp()}
      className="w-full select-none rounded-lg py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition active:scale-[0.98]"
      style={{ background: tone }}
    >
      {label}
    </button>
  );
}

function Body({ id }: { id: string }) {
  const s = useSim();
  const inputs = readInputs(s.physical, s.faults, s.rigOptions);

  switch (id) {
    case "start":
      return (
        <>
          <HoldButton label="Hold to press" tone="#2e9e5b" onDown={() => s.press("start", true)} onUp={() => s.press("start", false)} />
          <Row label="Inject fault: stuck closed">
            <Toggle label="Start stuck closed" checked={s.faults.stuckStart} onChange={(v) => s.setFault("stuckStart", v)} />
          </Row>
        </>
      );
    case "stop":
      return (
        <>
          <HoldButton label="Hold to press" tone="#d64545" onDown={() => s.press("stop", true)} onUp={() => s.press("stop", false)} />
          <Row label="Inject fault: broken wire">
            <Toggle label="Stop wire broken" checked={s.faults.brokenStop} onChange={(v) => s.setFault("brokenStop", v)} />
          </Row>
        </>
      );
    case "aux":
      return <HoldButton label="Hold to press" tone="#3d434a" onDown={() => s.press("aux", true)} onUp={() => s.press("aux", false)} />;
    case "beacon":
      return (
        <Row label="Q0.3 Beacon">
          <span className="font-mono text-[12px]">{s.memory.Beacon ? "on" : "off"}</span>
        </Row>
      );
    case "estop":
      return (
        <Row label="Mushroom head">
          <Segmented
            size="sm"
            value={s.physical.estopPressed ? "in" : "out"}
            options={[
              { value: "out", label: "Released" },
              { value: "in", label: "Pressed" },
            ]}
            onChange={(v) => (v === "in") !== s.physical.estopPressed && s.toggleEstop()}
          />
        </Row>
      );
    case "overload":
      return (
        <>
          <div className="py-1.5">
            <div className="mb-1.5 flex justify-between text-[12.5px]">
              <span>Thermal load</span>
              <span className="font-mono text-[11px] text-muted-ink">{Math.round(s.physical.heat * 100)} %</span>
            </div>
            <Meter value={s.physical.heat} tone={s.physical.heat > 0.7 ? "#d64545" : "#f26b1d"} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={s.tripOverload} className="rounded-lg border border-border py-1.5 text-[12px] font-medium hover:border-fault hover:text-fault">
              Trip
            </button>
            <button type="button" onClick={s.resetOverload} className="rounded-lg bg-ink py-1.5 text-[12px] font-medium text-white">
              Reset
            </button>
          </div>
        </>
      );
    case "motor":
      return (
        <>
          <div className="py-1.5">
            <div className="mb-1.5 flex justify-between text-[12.5px]">
              <span>Speed</span>
              <span className="font-mono text-[11px] text-muted-ink">{Math.round(s.physical.motorSpeed * 1420)} rpm</span>
            </div>
            <Meter value={s.physical.motorSpeed} tone="#2457a6" />
          </div>
          <Row label="Current">
            <span className="font-mono text-[12px]">{s.physical.current.toFixed(2)} A</span>
          </Row>
          <Row label="Inject fault: jam the shaft">
            <Toggle label="Jam shaft" checked={s.faults.jam} onChange={(v) => s.setFault("jam", v)} />
          </Row>
        </>
      );
    case "plc":
      return (
        <>
          <Row label="Mode">
            <Segmented
              size="sm"
              value={s.running ? "run" : "stop"}
              options={[
                { value: "stop", label: "Stop" },
                { value: "run", label: "Run" },
              ]}
              onChange={(v) => s.setRunning(v === "run")}
            />
          </Row>
          <Row label="Scans completed">
            <span className="font-mono text-[12px]">{s.scanCount}</span>
          </Row>
        </>
      );
    case "io":
      return (
        <div className="grid grid-cols-1 gap-1 py-1">
          {TAGS.filter((t) => t.kind !== "marker").map((t) => {
            const on = t.kind === "input" ? Boolean(inputs[t.tag]) : Boolean(s.memory[t.tag]);
            return (
              <div key={t.tag} className="flex items-center gap-2 font-mono text-[11.5px]">
                <span className={`h-2 w-2 rounded-full ${on ? (t.kind === "input" ? "bg-[#45d483]" : "bg-[#5aa2ff]") : "bg-[#d5d1c7]"}`} />
                <span className="w-9 text-muted-ink">{t.address}</span>
                <span className="text-ink">{t.tag}</span>
              </div>
            );
          })}
        </div>
      );
    case "contactor":
      return (
        <Row label="Main contacts">
          <span className={`font-mono text-[11px] font-semibold uppercase tracking-[0.15em] ${s.running && contactorClosed(s.memory, s.physical) ? "text-energised" : "text-muted-ink"}`}>
            {s.running && contactorClosed(s.memory, s.physical) ? "Closed" : "Open"}
          </span>
        </Row>
      );
    default:
      return null;
  }
}

export function PartPopover() {
  const selected = useSim((s) => s.selected);
  const select = useSim((s) => s.select);
  const focusPart = useSim((s) => s.focusPart);
  const part = selected ? partById(selected) : null;
  if (!part) return null;

  return (
    <div key={part.id} className="animate-fade-up pointer-events-auto w-[264px] rounded-xl border border-border bg-surface/95 p-3.5 shadow-[0_12px_32px_-12px_rgba(27,36,48,0.28)] backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-[17px] font-bold uppercase leading-none tracking-[0.04em] text-ink">{part.name}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-ink">{part.kicker}</p>
        </div>
        <button type="button" aria-label="Close" onClick={() => select(null)} className="-mr-1 -mt-1 rounded-md p-1 text-muted-ink hover:bg-background hover:text-ink">
          <IconX size={15} />
        </button>
      </div>
      <p className="mt-2 border-b border-border pb-2.5 text-[12.5px] leading-relaxed text-muted-ink">{part.description}</p>
      <div className="pt-1.5">
        <Body id={part.id} />
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
        <button
          type="button"
          onClick={() => focusPart(part.id)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink hover:border-ink/40"
        >
          <IconCrosshair size={12} /> Zoom to it
        </button>
        <span className="text-[11px] text-primary">or click it in the scene</span>
      </div>
    </div>
  );
}
