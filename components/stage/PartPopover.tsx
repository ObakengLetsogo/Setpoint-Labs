"use client";

import type { ReactNode } from "react";
import { useInputs, useRig, useSim } from "@/store/sim";
import type { Control } from "@/rigs/types";
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

function ControlRow({ c }: { c: Control }) {
  const s = useSim();
  const v = s.physical[("key" in c ? c.key : "") as string];
  switch (c.kind) {
    case "hold":
      return <HoldButton label={c.label} tone={c.tone} onDown={() => s.press(c.part, true)} onUp={() => s.press(c.part, false)} />;
    case "toggle":
      return (
        <Row label={c.label}>
          <Segmented
            size="sm"
            value={v ? "on" : "off"}
            options={[
              { value: "off", label: c.off },
              { value: "on", label: c.on },
            ]}
            onChange={(next) => (next === "on") !== Boolean(v) && s.act(c, next === "on")}
          />
        </Row>
      );
    case "slider":
      return (
        <div className="py-1.5">
          <div className="mb-1 flex justify-between text-[12.5px]">
            <span>{c.label}</span>
            <span className="font-mono text-[11px] text-muted-ink">
              {Number(v ?? 0)} {c.unit}
            </span>
          </div>
          <input
            type="range"
            min={c.min}
            max={c.max}
            step={c.step}
            value={Number(v ?? 0)}
            onChange={(e) => s.act(c, Number(e.target.value))}
            className="w-full accent-[#f26b1d]"
            aria-label={c.label}
          />
        </div>
      );
    case "meter": {
      const n = Number(v ?? 0);
      const shown = c.scale ? Math.round(n * c.scale) : n.toFixed(n < 10 ? 2 : 1);
      return (
        <div className="py-1.5">
          <div className="mb-1.5 flex justify-between text-[12.5px]">
            <span>{c.label}</span>
            <span className="font-mono text-[11px] text-muted-ink">
              {shown} {c.unit}
            </span>
          </div>
          <Meter value={Math.min(1, n / c.max)} tone={c.tone} />
        </div>
      );
    }
    case "action":
      return null;
    case "status": {
      const st = c.value(s.physical, s.memory, s.running);
      return (
        <Row label={c.label}>
          <span className={`font-mono text-[11px] font-semibold uppercase tracking-[0.15em] ${st.on ? "text-energised" : "text-muted-ink"}`}>{st.text}</span>
        </Row>
      );
    }
  }
}

function Body({ id }: { id: string }) {
  const s = useSim();
  const rig = useRig();
  const inputs = useInputs();
  const controls = rig.controls.filter((c) => c.part === id);
  const actions = controls.filter((c) => c.kind === "action");
  const faults = rig.faults.filter((f) => f.part === id);

  if (id === "plc")
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

  if (id === "io")
    return (
      <div className="grid grid-cols-1 gap-1 py-1">
        {rig.tags
          .filter((t) => t.kind !== "marker")
          .map((t) => {
            const raw = t.kind === "input" ? inputs[t.tag] : s.memory[t.tag];
            const on = Boolean(raw);
            return (
              <div key={t.tag} className="flex items-center gap-2 font-mono text-[11.5px]">
                <span className={`h-2 w-2 rounded-full ${on ? (t.kind === "input" ? "bg-[#45d483]" : "bg-[#5aa2ff]") : "bg-[#d5d1c7]"}`} />
                <span className="w-10 text-muted-ink">{t.address}</span>
                <span className="text-ink">{t.tag}</span>
                {t.analog && <span className="ml-auto text-muted-ink">{Number(raw ?? 0)}</span>}
              </div>
            );
          })}
      </div>
    );

  return (
    <>
      {controls.map((c, i) => (
        <ControlRow key={i} c={c} />
      ))}
      {actions.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {actions.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => s.act(c)}
              className={
                c.kind === "action" && c.danger
                  ? "rounded-lg border border-border py-1.5 text-[12px] font-medium hover:border-fault hover:text-fault"
                  : "rounded-lg bg-ink py-1.5 text-[12px] font-medium text-white"
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {faults.map((f) => (
        <Row key={f.key} label={`Inject fault: ${f.label.toLowerCase()}`}>
          <Toggle label={f.label} checked={Boolean(s.faults[f.key])} onChange={(v) => s.setFault(f.key, v)} />
        </Row>
      ))}
    </>
  );
}

export function PartPopover() {
  const selected = useSim((s) => s.selected);
  const select = useSim((s) => s.select);
  const focusPart = useSim((s) => s.focusPart);
  const rig = useRig();
  const part = selected ? rig.parts.find((p) => p.id === selected) : null;
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
