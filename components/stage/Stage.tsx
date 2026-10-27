"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSim } from "@/store/sim";
import { ANNOTATIONS, contactorClosed, type Annotation, type PartId } from "@/rigs/motorStarter";
import { markerScreen } from "./annotationBus";
import { PartPopover } from "./PartPopover";
import { Sheet } from "@/components/shell/Sheet";
import { IconCrosshair, IconRotateLeft, IconRotateRight, IconZoomIn, IconZoomOut } from "@/components/ui/icons";

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-mono text-[11px] uppercase tracking-[0.24em] text-muted-ink">Setting up the bench</div>
  ),
});

const LAB_ICON: Record<string, string> = { F1: "pushbuttons", F2: "contactor", F3: "overload", F16: "estop" };

type Tone = "run" | "warn" | "fault" | "idle";
interface Live {
  text: string | null;
  ring: Tone | null;
}

/** Live state for a part, shown in its card and as a ring around its marker, never floating in the scene. */
function useLive(part: PartId): Live {
  return useSim(
    useShallow((s): Live => {
    const p = s.physical;
    switch (part) {
      case "motor":
        return p.motorSpeed > 0.02
          ? { text: `${Math.round(p.motorSpeed * 1420)} rpm · ${p.current.toFixed(1)} A`, ring: p.current > 4 ? "warn" : "run" }
          : { text: null, ring: null };
      case "overload":
        if (p.overloadTripped) return { text: "tripped", ring: "fault" };
        return p.heat > 0.03 ? { text: `${Math.round(p.heat * 100)} % thermal`, ring: "warn" } : { text: null, ring: null };
      case "contactor":
        return s.running && contactorClosed(s.memory, p) ? { text: "closed · coil on", ring: "run" } : { text: null, ring: null };
      case "plc":
        return s.running ? { text: `run · scan ${s.scanCount}`, ring: "run" } : { text: "stop", ring: null };
      case "estop":
        return p.estopPressed ? { text: "pressed", ring: "fault" } : { text: null, ring: null };
      case "start":
        return p.startPressed || s.faults.stuckStart ? { text: "start pressed", ring: "run" } : p.stopPressed ? { text: "stop pressed", ring: "warn" } : { text: null, ring: null };
      default:
        return { text: null, ring: null };
    }
    }),
  );
}

const LIVE_CHIP: Record<Tone, string> = {
  run: "bg-run/10 text-run",
  warn: "bg-[#fdf0e4] text-[#c2531a]",
  fault: "bg-fault/10 text-fault",
  idle: "bg-[#eef0f2] text-muted-ink",
};

const RING: Record<Tone, string> = {
  run: "0 0 0 3px #ffffff, 0 0 0 5.5px #1f9d6b, 0 0 14px 4px rgba(31,157,107,0.35)",
  warn: "0 0 0 3px #ffffff, 0 0 0 5.5px #f08a2c",
  fault: "0 0 0 3px #ffffff, 0 0 0 5.5px #d64545",
  idle: "",
};

export function LabChip({ code }: { code: string }) {
  const icon = LAB_ICON[code] ?? "plc";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#e3e5e8] bg-white py-[3px] pl-1 pr-2 font-mono text-[10.5px] font-semibold text-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/parts/${icon}.png`} alt="" width={16} height={16} className="h-4 w-4 object-contain" />
      {code}
    </span>
  );
}

function CardBody({ a }: { a: Annotation }) {
  const live = useLive(a.part);
  return (
    <>
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/parts/${a.icon}.png`} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
        </span>
        <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-run font-mono text-[10.5px] font-bold text-white">{a.n}</span>
        <span className="font-display text-[15px] font-bold uppercase leading-[1.1] tracking-[0.06em] text-ink">{a.title}</span>
      </div>
      <p className="mt-2 text-[12.5px] leading-[1.45] text-[#4b5058]">{a.text}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {a.labs.map((l) => (
          <LabChip key={l} code={l} />
        ))}
        <span className="font-mono text-[10.5px] text-muted-ink">+{a.more} labs</span>
        {live.text && (
          <span className={`ml-auto rounded-full px-2 py-[3px] font-mono text-[10px] font-semibold ${LIVE_CHIP[live.ring ?? "idle"]}`}>{live.text}</span>
        )}
      </div>
    </>
  );
}

function Card({ a, cardRef }: { a: Annotation; cardRef?: (el: HTMLDivElement | null) => void }) {
  const active = useSim((s) => s.hovered === a.part || s.selected === a.part);
  const hover = useSim((s) => s.hover);
  const focusPart = useSim((s) => s.focusPart);
  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onMouseEnter={() => hover(a.part)}
      onMouseLeave={() => hover(null)}
      onFocus={() => hover(a.part)}
      onBlur={() => hover(null)}
      onClick={() => focusPart(a.part)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && focusPart(a.part)}
      className={`pointer-events-auto w-full cursor-pointer rounded-xl border bg-white p-3 text-left outline-none transition-all duration-200 ${
        active
          ? "border-run/60 shadow-[0_0_0_3px_rgba(31,157,107,0.14),0_10px_28px_-14px_rgba(27,36,48,0.35)]"
          : "border-[#e4e6e9] shadow-[0_1px_2px_rgba(27,36,48,0.05),0_8px_22px_-16px_rgba(27,36,48,0.3)] hover:border-[#cfd3d8]"
      }`}
    >
      <CardBody a={a} />
    </div>
  );
}

function Marker({ a, setRef, onTap }: { a: Annotation; setRef: (el: HTMLButtonElement | null) => void; onTap: () => void }) {
  const hovered = useSim((s) => s.hovered === a.part);
  const hover = useSim((s) => s.hover);
  const live = useLive(a.part);
  return (
    <button
      ref={setRef}
      type="button"
      aria-label={`${a.n}. ${a.title}`}
      onMouseEnter={() => hover(a.part)}
      onMouseLeave={() => hover(null)}
      onClick={onTap}
      className={`absolute left-0 top-0 z-[8] flex h-[22px] w-[22px] items-center justify-center rounded-full font-mono text-[11px] font-bold text-white transition-[background,box-shadow] ${
        hovered ? "bg-[#178a5c]" : "bg-run"
      } ${live.ring === "run" ? "marker-live" : ""}`}
      style={{ opacity: 0, boxShadow: live.ring ? RING[live.ring] : hovered ? "0 0 0 2px #fff, 0 0 0 7px rgba(31,157,107,0.22)" : "0 0 0 2px #fff, 0 2px 6px rgba(27,36,48,0.3)" }}
    >
      {a.n}
    </button>
  );
}

function Markers({
  bodyRef,
  canvasRef,
  cards,
  onTap,
}: {
  bodyRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  cards: React.RefObject<Record<number, HTMLDivElement | null>>;
  onTap: (a: Annotation) => void;
}) {
  const markers = useRef<Record<number, HTMLButtonElement | null>>({});
  const lines = useRef<Record<number, SVGLineElement | null>>({});
  const dots = useRef<Record<number, SVGCircleElement | null>>({});
  const hovered = useSim((s) => s.hovered);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const body = bodyRef.current;
      const canvas = canvasRef.current;
      if (!body || !canvas) return;
      const b = body.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      const wide = b.width >= 1024;
      const vh = window.innerHeight;
      for (const a of ANNOTATIONS) {
        const p = markerScreen[a.n];
        const m = markers.current[a.n];
        const line = lines.current[a.n];
        const dot = dots.current[a.n];
        if (!p || !m) continue;
        const x = p.x + c.left - b.left;
        const y = p.y + c.top - b.top;
        const inCanvas = p.visible && p.x > 6 && p.x < c.width - 6 && p.y > 6 && p.y < c.height - 6;
        m.style.transform = `translate(${x - 11}px, ${y - 11}px)`;
        m.style.opacity = inCanvas ? "1" : "0";
        m.style.pointerEvents = inCanvas ? "auto" : "none";
        if (!line || !dot) continue;
        const card = cards.current[a.n];
        const r = card?.getBoundingClientRect();
        const cardOnScreen = !!r && r.width > 0 && r.bottom > 0 && r.top < vh;
        const markerOnScreen = c.top + p.y > 0 && c.top + p.y < vh;
        if (!card || !r || !wide || !inCanvas || !cardOnScreen || !markerOnScreen) {
          line.style.opacity = "0";
          dot.style.opacity = "0";
          continue;
        }
        const cx = (a.side === "left" ? r.right : r.left) - b.left;
        const cy = r.top + Math.min(30, r.height / 2) - b.top;
        line.setAttribute("x1", String(cx));
        line.setAttribute("y1", String(cy));
        line.setAttribute("x2", String(x));
        line.setAttribute("y2", String(y));
        dot.setAttribute("cx", String(cx));
        dot.setAttribute("cy", String(cy));
        line.style.opacity = "1";
        dot.style.opacity = "1";
      }
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [bodyRef, canvasRef, cards]);

  return (
    <>
      <svg className="pointer-events-none absolute inset-0 z-[6] h-full w-full overflow-visible" aria-hidden="true">
        {ANNOTATIONS.map((a) => (
          <g key={a.n}>
            <line
              ref={(el) => {
                lines.current[a.n] = el;
              }}
              stroke={hovered === a.part ? "#1f9d6b" : "#8fa79c"}
              strokeWidth={hovered === a.part ? 1.4 : 1}
              strokeDasharray="3 4"
              style={{ opacity: 0, transition: "opacity 0.25s" }}
            />
            <circle
              ref={(el) => {
                dots.current[a.n] = el;
              }}
              r={2.5}
              fill="#1f9d6b"
              style={{ opacity: 0 }}
            />
          </g>
        ))}
      </svg>
      {ANNOTATIONS.map((a) => (
        <Marker
          key={a.n}
          a={a}
          setRef={(el) => {
            markers.current[a.n] = el;
          }}
          onTap={() => onTap(a)}
        />
      ))}
    </>
  );
}

function Toolbar() {
  const rotate = useSim((s) => s.rotate);
  const zoomBy = useSim((s) => s.zoomBy);
  const resetView = useSim((s) => s.resetView);
  const btn = "flex h-8 w-8 items-center justify-center rounded-full text-[#3d434a] transition hover:bg-[#f0f1f3] hover:text-ink";
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-[#e3e5e8] bg-white/95 px-1.5 py-1 shadow-[0_6px_18px_-10px_rgba(27,36,48,0.35)] backdrop-blur">
      <button type="button" aria-label="Rotate left" title="Rotate left (Q)" onClick={() => rotate(-1)} className={btn}>
        <IconRotateLeft size={15} />
      </button>
      <button type="button" aria-label="Rotate right" title="Rotate right (E)" onClick={() => rotate(1)} className={btn}>
        <IconRotateRight size={15} />
      </button>
      <span className="mx-1 h-4 w-px bg-[#e3e5e8]" />
      <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => zoomBy(1 / 1.25)} className={btn}>
        <IconZoomOut size={15} />
      </button>
      <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => zoomBy(1.25)} className={btn}>
        <IconZoomIn size={15} />
      </button>
      <span className="mx-1 h-4 w-px bg-[#e3e5e8]" />
      <button type="button" aria-label="Recentre" title="Recentre (R)" onClick={resetView} className={btn}>
        <IconCrosshair size={15} />
      </button>
    </div>
  );
}

function RunPill() {
  const running = useSim((s) => s.running);
  const toggleRun = useSim((s) => s.toggleRun);
  return (
    <button
      type="button"
      onClick={toggleRun}
      className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#e3e5e8] bg-white/95 py-1 pl-2.5 pr-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink shadow-[0_6px_18px_-12px_rgba(27,36,48,0.35)] backdrop-blur"
    >
      <span className={`h-2 w-2 rounded-full ${running ? "bg-run shadow-[0_0_0_3px_rgba(31,157,107,0.2)]" : "bg-[#c6cacf]"}`} />
      PLC {running ? "running" : "stopped"}
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold text-white ${running ? "bg-fault" : "bg-ink"}`}>{running ? "Stop" : "Run"}</span>
    </button>
  );
}

export function MeetTheRig() {
  const body = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const cards = useRef<Record<number, HTMLDivElement | null>>({});
  const [sheet, setSheet] = useState<Annotation | null>(null);
  const focusPart = useSim((s) => s.focusPart);
  const hover = useSim((s) => s.hover);
  const resetView = useSim((s) => s.resetView);
  const left = ANNOTATIONS.filter((a) => a.side === "left");
  const right = ANNOTATIONS.filter((a) => a.side === "right");
  const setRef = (n: number) => (el: HTMLDivElement | null) => {
    cards.current[n] = el;
  };

  const onTap = (a: Annotation) => {
    // Phones zoom to the part and open its card in a sheet; desktop cards are already on screen.
    focusPart(a.part);
    if (window.innerWidth < 1024) {
      hover(a.part);
      setSheet(a);
      const top = (canvas.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 8;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e4e6e9] bg-[#f4f4f5] shadow-[0_1px_2px_rgba(27,36,48,0.04)]">
      <div className="flex flex-col gap-2 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <h2 className="font-display text-[22px] font-bold uppercase tracking-[0.08em] text-ink">Meet the rig</h2>
        <p className="max-w-[440px] text-[13px] leading-[1.5] text-[#4b5058] sm:text-right">
          Six parts you will use lesson after lesson. Drag the rig to turn it; pick a part to light it up and see which labs use it.
        </p>
      </div>

      <div ref={body} className="relative bg-[linear-gradient(#ebecee_1px,transparent_1px),linear-gradient(90deg,#ebecee_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="relative lg:grid lg:min-h-[620px] lg:grid-cols-[250px_minmax(0,1fr)_250px] lg:gap-6 lg:px-6 lg:py-6">
          <div ref={canvas} className="relative h-[440px] sm:h-[480px] lg:absolute lg:inset-0 lg:h-auto">
            <Scene />
          </div>

          <div className="pointer-events-none relative z-10 hidden flex-col justify-center gap-4 lg:flex">
            {left.map((a) => (
              <Card key={a.n} a={a} cardRef={setRef(a.n)} />
            ))}
          </div>
          <div className="pointer-events-none relative z-10 hidden lg:block">
            <p className="pt-1 text-right font-mono text-[10.5px] text-muted-ink">drag to turn · pinch to zoom</p>
            <div className="pointer-events-auto absolute left-0 top-8">
              <PartPopover />
            </div>
          </div>
          <div className="pointer-events-none relative z-10 hidden flex-col justify-center gap-4 lg:flex">
            {right.map((a) => (
              <Card key={a.n} a={a} cardRef={setRef(a.n)} />
            ))}
          </div>

          <div className="absolute left-4 top-3 z-10 lg:left-[300px] lg:top-6">
            <RunPill />
          </div>
          <p className="absolute bottom-[68px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-ink lg:hidden">drag to turn · pinch to zoom</p>
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <Toolbar />
          </div>
        </div>
        <Markers bodyRef={body} canvasRef={canvas} cards={cards} onTap={onTap} />

        <div className="lg:hidden">
          <div className="px-4 pb-1 pt-3">
            <PartPopover />
          </div>
          <div className="grid gap-3 px-4 pb-5 pt-2 sm:grid-cols-2">
            {ANNOTATIONS.map((a) => (
              <Card key={a.n} a={a} />
            ))}
          </div>
        </div>
      </div>

      <Sheet
        title="On the rig"
        clear
        subtitle={sheet ? `Marker ${sheet.n} of ${ANNOTATIONS.length}` : ""}
        open={!!sheet}
        onClose={() => {
          setSheet(null);
          hover(null);
        }}
      >
        {sheet && (
          <div>
            <CardBody a={sheet} />
            <button
              type="button"
              onClick={() => {
                resetView();
                setSheet(null);
                hover(null);
              }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[13px] font-semibold text-white"
            >
              <IconCrosshair size={14} /> Back to the whole rig
            </button>
          </div>
        )}
      </Sheet>
    </section>
  );
}
