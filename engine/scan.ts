import type { LogicNode, Program } from "./ladder";

export type Memory = Record<string, boolean | number>;

export interface NodeTrace {
  powerIn: boolean;
  powerOut: boolean;
  value?: boolean;
}

export interface RungTrace {
  number: number;
  line: number;
  power: boolean;
  nodes: Record<string, NodeTrace>;
}

export interface ScanResult {
  memory: Memory;
  trace: RungTrace[];
}

export const bool = (mem: Memory, tag: string) => Boolean(mem[tag]);
const num = (mem: Memory, tag: string) => Number(mem[tag] ?? 0);
/** An operand is a number literal or a tag holding a number (or a bit, read as 0 or 1). */
export const operand = (mem: Memory, a: string) => (/^-?\d/.test(a) ? Number(a) : num(mem, a));

const COMPARE: Record<string, (a: number, b: number) => boolean> = {
  GRT: (a, b) => a > b,
  LES: (a, b) => a < b,
  EQU: (a, b) => a === b,
  NEQ: (a, b) => a !== b,
  GEQ: (a, b) => a >= b,
  LEQ: (a, b) => a <= b,
};

function evaluate(node: LogicNode, powerIn: boolean, mem: Memory, nodes: Record<string, NodeTrace>): boolean {
  if (node.kind === "contact") {
    let passes: boolean;
    let value: boolean;
    if (node.op === "ONS") {
      // One shot: passes for a single scan on the rising edge of its rung-in power.
      value = bool(mem, node.tag);
      passes = !value;
      mem[node.tag] = powerIn;
    } else if (node.b !== undefined) {
      passes = COMPARE[node.op](operand(mem, node.tag), operand(mem, node.b));
      value = passes;
    } else {
      value = bool(mem, node.tag);
      passes = node.op === "XIC" ? value : !value;
    }
    const powerOut = powerIn && passes;
    nodes[node.id] = { powerIn, powerOut, value };
    return powerOut;
  }
  let out: boolean;
  if (node.kind === "series") {
    let p = powerIn;
    for (const child of node.children) p = evaluate(child, p, mem, nodes);
    out = p;
  } else {
    out = false;
    for (const child of node.children) out = evaluate(child, powerIn, mem, nodes) || out;
  }
  nodes[node.id] = { powerIn, powerOut: out };
  return out;
}

/**
 * One PLC scan: rungs execute top to bottom and each rung writes memory
 * immediately, so later rungs see values written earlier in the same scan.
 */
export function scan(program: Program, input: Memory, dtMs: number): ScanResult {
  const mem: Memory = { ...input };
  const trace: RungTrace[] = [];

  for (const rung of program.rungs) {
    const nodes: Record<string, NodeTrace> = {};
    const power = rung.logic ? evaluate(rung.logic, true, mem, nodes) : true;

    for (const out of rung.outputs) {
      const t = out.tag;
      switch (out.op) {
        case "OTE":
          mem[t] = power;
          break;
        case "OTL":
          if (power) mem[t] = true;
          break;
        case "OTU":
          if (power) mem[t] = false;
          break;
        case "TON": {
          const preset = out.preset!;
          if (power) {
            const acc = Math.min(preset, num(mem, `${t}.ACC`) + dtMs);
            mem[`${t}.ACC`] = acc;
            mem[`${t}.EN`] = true;
            mem[`${t}.DN`] = acc >= preset;
            mem[`${t}.TT`] = acc < preset;
          } else {
            mem[`${t}.ACC`] = 0;
            mem[`${t}.EN`] = false;
            mem[`${t}.DN`] = false;
            mem[`${t}.TT`] = false;
          }
          mem[`${t}.PRE`] = preset;
          break;
        }
        case "TOF": {
          const preset = out.preset!;
          if (power) {
            mem[`${t}.ACC`] = 0;
            mem[`${t}.EN`] = true;
            mem[`${t}.DN`] = true;
            mem[`${t}.TT`] = false;
          } else {
            mem[`${t}.EN`] = false;
            if (bool(mem, `${t}.DN`)) {
              const acc = Math.min(preset, num(mem, `${t}.ACC`) + dtMs);
              mem[`${t}.ACC`] = acc;
              mem[`${t}.DN`] = acc < preset;
              mem[`${t}.TT`] = acc < preset;
            }
          }
          mem[`${t}.PRE`] = preset;
          break;
        }
        case "CTU": {
          const preset = out.preset!;
          if (power && !bool(mem, `${t}.CU`)) mem[`${t}.ACC`] = num(mem, `${t}.ACC`) + 1;
          mem[`${t}.CU`] = power;
          mem[`${t}.DN`] = num(mem, `${t}.ACC`) >= preset;
          mem[`${t}.PRE`] = preset;
          break;
        }
        case "CTD": {
          const preset = out.preset!;
          if (power && !bool(mem, `${t}.CD`)) mem[`${t}.ACC`] = num(mem, `${t}.ACC`) - 1;
          mem[`${t}.CD`] = power;
          mem[`${t}.DN`] = num(mem, `${t}.ACC`) >= preset;
          mem[`${t}.PRE`] = preset;
          break;
        }
        case "MOV":
          if (power) mem[t] = operand(mem, out.src![0]);
          break;
        case "ADD":
          if (power) mem[t] = operand(mem, out.src![0]) + operand(mem, out.src![1]);
          break;
        case "SUB":
          if (power) mem[t] = operand(mem, out.src![0]) - operand(mem, out.src![1]);
          break;
        case "RES":
          if (power) {
            mem[`${t}.ACC`] = 0;
            mem[`${t}.DN`] = false;
            mem[`${t}.TT`] = false;
          }
          break;
      }
    }

    trace.push({ number: rung.number, line: rung.line, power, nodes });
  }

  return { memory: mem, trace };
}
