"use client";

import type { ReactNode } from "react";
import type { LogicNode, OutputNode, Program } from "@/engine/ladder";
import type { Memory, NodeTrace, RungTrace } from "@/engine/scan";
import { useRig } from "@/store/sim";

const CW = 76;
const RH = 64;
const OUT_W = 104;
const LEFT = 14;
const PAD_TOP = 22;
const INK = "#1b2430";
const LIVE = "#2e9e5b";
const DIM = "#9aa0a8";

interface Size {
  w: number;
  h: number;
}

function measure(node: LogicNode): Size {
  if (node.kind === "contact") return { w: 1, h: 1 };
  const sizes = node.children.map(measure);
  return node.kind === "series"
    ? { w: sizes.reduce((a, s) => a + s.w, 0), h: Math.max(...sizes.map((s) => s.h)) }
    : { w: Math.max(...sizes.map((s) => s.w)), h: sizes.reduce((a, s) => a + s.h, 0) };
}

function Seg({ x1, y1, x2, y2, live }: { x1: number; y1: number; x2: number; y2: number; live: boolean }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={live ? LIVE : INK} strokeWidth={live ? 2.2 : 1.4} strokeLinecap="round" />
      {live && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8ef0b4" strokeWidth={1.2} strokeLinecap="round" className="ladder-flow" />}
    </g>
  );
}

const CMP_SIGN: Record<string, string> = { GRT: ">", LES: "<", EQU: "=", NEQ: "≠", GEQ: "≥", LEQ: "≤" };

/** Box style input instruction: one shot and compares. */
function InputBox({ x, y, op, tag, b, t, mem }: { x: number; y: number; op: string; tag: string; b?: string; t?: NodeTrace; mem: Memory }) {
  const pin = Boolean(t?.powerIn);
  const pout = Boolean(t?.powerOut);
  const color = pout ? LIVE : INK;
  const val = (a: string) => (/^-?\d/.test(a) ? a : String(Number(mem[a] ?? 0)));
  return (
    <g>
      <Seg x1={x} y1={y} x2={x + 6} y2={y} live={pin} />
      <Seg x1={x + CW - 6} y1={y} x2={x + CW} y2={y} live={pout} />
      <rect x={x + 6} y={y - 19} width={CW - 12} height={38} rx={4} fill={pout ? "#e7f5ec" : "#fffdf9"} stroke={color} strokeWidth={1.5} />
      <text x={x + CW / 2} y={y - 6} textAnchor="middle" className="ladder-box-title">
        {op}
      </text>
      <text x={x + CW / 2} y={y + 7} textAnchor="middle" className="ladder-addr" fill={INK}>
        {b === undefined ? tag : `${tag} ${CMP_SIGN[op]} ${b}`}
      </text>
      {b !== undefined && (
        <text x={x + CW / 2} y={y + 16} textAnchor="middle" className="ladder-addr" fill={pout ? LIVE : DIM}>
          {val(tag)} {CMP_SIGN[op]} {val(b)}
        </text>
      )}
    </g>
  );
}

function Contact({ x, y, op, tag, t }: { x: number; y: number; op: string; tag: string; t?: NodeTrace }) {
  const pin = Boolean(t?.powerIn);
  const pout = Boolean(t?.powerOut);
  const closed = op === "XIC" ? Boolean(t?.value) : !t?.value;
  const cx = x + CW / 2;
  const plate = pout ? LIVE : INK;
  const addr = useRig().tags.find((t) => t.tag === tag)?.address;
  return (
    <g>
      <Seg x1={x} y1={y} x2={cx - 8} y2={y} live={pin} />
      <Seg x1={cx + 8} y1={y} x2={x + CW} y2={y} live={pout} />
      {closed && pin && <rect x={cx - 8} y={y - 11} width={16} height={22} fill={LIVE} opacity={0.14} rx={2} />}
      <line x1={cx - 8} y1={y - 12} x2={cx - 8} y2={y + 12} stroke={plate} strokeWidth={2} />
      <line x1={cx + 8} y1={y - 12} x2={cx + 8} y2={y + 12} stroke={plate} strokeWidth={2} />
      {op === "XIO" && <line x1={cx - 12} y1={y + 12} x2={cx + 12} y2={y - 12} stroke={plate} strokeWidth={1.6} />}
      <text x={cx} y={y - 18} textAnchor="middle" className="ladder-tag">
        {tag}
      </text>
      <text x={cx} y={y + 25} textAnchor="middle" className="ladder-addr" fill={t?.value ? LIVE : DIM}>
        {addr ? `${addr} · ` : ""}
        {t?.value ? "1" : "0"}
      </text>
    </g>
  );
}

function drawLogic(node: LogicNode, col: number, row: number, nodes: Record<string, NodeTrace>, out: ReactNode[], mem: Memory): Size {
  const size = measure(node);
  const x = LEFT + col * CW;
  const y = PAD_TOP + row * RH + RH / 2;
  if (node.kind === "contact") {
    if (node.op === "XIC" || node.op === "XIO") out.push(<Contact key={node.id} x={x} y={y} op={node.op} tag={node.tag} t={nodes[node.id]} />);
    else out.push(<InputBox key={node.id} x={x} y={y} op={node.op} tag={node.tag} b={node.b} t={nodes[node.id]} mem={mem} />);
    return size;
  }
  if (node.kind === "series") {
    let c = col;
    for (const child of node.children) c += drawLogic(child, c, row, nodes, out, mem).w;
    return size;
  }
  const t = nodes[node.id];
  let r = row;
  const rows: number[] = [];
  for (const child of node.children) {
    const s = drawLogic(child, col, r, nodes, out, mem);
    const cy = PAD_TOP + r * RH + RH / 2;
    rows.push(cy);
    if (s.w < size.w) {
      const childOut = Boolean(nodes[child.id]?.powerOut);
      out.push(<Seg key={`${child.id}-pad`} x1={x + s.w * CW} y1={cy} x2={x + size.w * CW} y2={cy} live={childOut} />);
    }
    r += s.h;
  }
  const last = rows[rows.length - 1];
  out.push(<Seg key={`${node.id}-l`} x1={x} y1={y} x2={x} y2={last} live={Boolean(t?.powerIn)} />);
  out.push(<Seg key={`${node.id}-r`} x1={x + size.w * CW} y1={y} x2={x + size.w * CW} y2={last} live={Boolean(t?.powerOut)} />);
  return size;
}

function fmtMs(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function Output({ o, x, y, live, mem }: { o: OutputNode; x: number; y: number; live: boolean; mem: Memory }) {
  const color = live ? LIVE : INK;
  const addr = useRig().tags.find((t) => t.tag === o.tag)?.address;
  if (o.op === "MOV" || o.op === "ADD" || o.op === "SUB" || o.op === "MUL" || o.op === "DIV" || o.op === "PID") {
    const sign = { ADD: "+", SUB: "−", MUL: "×", DIV: "÷" }[o.op as "ADD"];
    const expr = o.op === "MOV" ? o.src![0] : o.op === "PID" ? `${o.src![0]} → ${o.src![2]}` : `${o.src![0]} ${sign} ${o.src![1]}`;
    return (
      <g>
        <Seg x1={x} y1={y} x2={x + 10} y2={y} live={live} />
        <rect x={x + 10} y={y - 21} width={OUT_W - 22} height={42} rx={4} fill="#fffdf9" stroke={color} strokeWidth={1.6} />
        <text x={x + 16} y={y - 8} className="ladder-box-title">
          {o.op === "PID" ? `PID ${o.tag}` : o.op}
        </text>
        <text x={x + 16} y={y + 4} className="ladder-addr" fill={INK}>
          {expr}
        </text>
        <text x={x + 16} y={y + 15} className="ladder-addr" fill={live ? LIVE : DIM}>
          → {o.tag} {Number(mem[o.tag] ?? 0)}
        </text>
      </g>
    );
  }
  if (o.op === "TON" || o.op === "TOF" || o.op === "CTU" || o.op === "CTD") {
    const isTimer = o.op === "TON" || o.op === "TOF";
    const acc = Number(mem[`${o.tag}.ACC`] ?? 0);
    const done = Boolean(mem[`${o.tag}.DN`]);
    return (
      <g>
        <Seg x1={x} y1={y} x2={x + 10} y2={y} live={live} />
        <rect x={x + 10} y={y - 21} width={OUT_W - 22} height={42} rx={4} fill={done ? "#e7f5ec" : "#fffdf9"} stroke={color} strokeWidth={1.6} />
        <text x={x + 16} y={y - 8} className="ladder-box-title">
          {o.op} {o.tag}
        </text>
        <text x={x + 16} y={y + 4} className="ladder-addr" fill={INK}>
          {isTimer ? `PT ${fmtMs(o.preset!)}` : `PV ${o.preset}`}
        </text>
        <text x={x + 16} y={y + 15} className="ladder-addr" fill={done ? LIVE : DIM}>
          {isTimer ? `ET ${fmtMs(acc)}` : `CV ${acc}`}
          {done ? " · DN" : ""}
        </text>
      </g>
    );
  }
  const cx = x + OUT_W / 2 - 4;
  const mark = { OTE: "", OTL: "L", OTU: "U", RES: "R" }[o.op as "OTE" | "OTL" | "OTU" | "RES"];
  const on = Boolean(mem[o.tag]);
  return (
    <g>
      <Seg x1={x} y1={y} x2={cx - 13} y2={y} live={live} />
      <Seg x1={cx + 13} y1={y} x2={x + OUT_W - 6} y2={y} live={live} />
      {on && <circle cx={cx} cy={y} r={15} fill={LIVE} opacity={0.14} />}
      <path d={`M ${cx - 7} ${y - 13} Q ${cx - 15} ${y} ${cx - 7} ${y + 13}`} fill="none" stroke={on ? LIVE : color} strokeWidth={2} />
      <path d={`M ${cx + 7} ${y - 13} Q ${cx + 15} ${y} ${cx + 7} ${y + 13}`} fill="none" stroke={on ? LIVE : color} strokeWidth={2} />
      {mark && (
        <text x={cx} y={y + 4} textAnchor="middle" className="ladder-box-title" fill={on ? LIVE : INK}>
          {mark}
        </text>
      )}
      <text x={cx} y={y - 19} textAnchor="middle" className="ladder-tag">
        {o.tag}
      </text>
      <text x={cx} y={y + 26} textAnchor="middle" className="ladder-addr" fill={on ? LIVE : DIM}>
        {addr ? `${addr} · ` : ""}
        {on ? "1" : "0"}
      </text>
    </g>
  );
}

export function LadderDiagram({
  program,
  trace,
  memory,
  activeLine,
}: {
  program: Program;
  trace: RungTrace[];
  memory: Memory;
  activeLine?: number | null;
}) {
  if (program.rungs.length === 0) {
    return <p className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-ink">No rungs yet</p>;
  }
  return (
    <div className="space-y-2">
      {program.rungs.map((rung, i) => {
        const t = trace[i];
        const nodes = t?.nodes ?? {};
        const size = rung.logic ? measure(rung.logic) : { w: 0, h: 1 };
        const rows = Math.max(size.h, rung.outputs.length);
        const logicW = Math.max(size.w, 1);
        const outX = LEFT + logicW * CW + 10;
        const width = outX + OUT_W + 10;
        const height = PAD_TOP + rows * RH + 6;
        const power = Boolean(t?.power);
        const elements: ReactNode[] = [];
        if (rung.logic) drawLogic(rung.logic, 0, 0, nodes, elements, memory);
        const y0 = PAD_TOP + RH / 2;
        const highlighted = activeLine === rung.line;

        return (
          <div
            key={`${rung.number}-${i}`}
            className={`relative rounded-lg border pt-4 transition-colors ${
              highlighted ? "border-accent/50 bg-accent/[0.04]" : power ? "border-energised/25 bg-energised/[0.035]" : "border-transparent"
            }`}
          >
            <span className="absolute left-2 top-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em] text-muted-ink">
              Rung {rung.number}
            </span>
            <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" style={{ maxHeight: height * 1.15 }} role="img" aria-label={`Rung ${rung.number}, ${power ? "energised" : "not energised"}`}>
              <Seg x1={4} y1={6} x2={4} y2={height - 4} live />
              <line x1={width - 4} y1={6} x2={width - 4} y2={height - 4} stroke={INK} strokeWidth={2.2} />
              <Seg x1={4} y1={y0} x2={LEFT} y2={y0} live />
              {elements}
              {!rung.logic && <Seg x1={LEFT} y1={y0} x2={LEFT + CW} y2={y0} live />}
              <Seg x1={LEFT + (rung.logic ? size.w : 1) * CW} y1={y0} x2={outX} y2={y0} live={power} />
              {rung.outputs.length > 1 && (
                <Seg x1={outX} y1={y0} x2={outX} y2={PAD_TOP + (rung.outputs.length - 1) * RH + RH / 2} live={power} />
              )}
              {rung.outputs.map((o, k) => (
                <Output key={o.id} o={o} x={outX} y={PAD_TOP + k * RH + RH / 2} live={power} mem={memory} />
              ))}
              {rung.outputs.map((o, k) => (
                <line
                  key={`${o.id}-rr`}
                  x1={outX + OUT_W - 6}
                  y1={PAD_TOP + k * RH + RH / 2}
                  x2={width - 4}
                  y2={PAD_TOP + k * RH + RH / 2}
                  stroke={INK}
                  strokeWidth={1.4}
                />
              ))}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
