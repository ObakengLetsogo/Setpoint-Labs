// One program, seven controller families. Translates a ladder program into the notation each
// vendor's own software uses: Siemens STL, Allen Bradley rung text, Schneider IL, Mitsubishi,
// Omron and Delta mnemonics, and IEC structured text. Addresses follow each family's convention.
// It is a study guide: instruction names are the common ones, but a real project should be
// checked against the manual for the exact controller.

import type { CompareOp, ContactNode, LogicNode, OutputNode, Program } from "./ladder";
import { ladderToST } from "./translate";

export type PlatformId = "iec" | "siemens" | "rockwell" | "schneider" | "mitsubishi" | "omron" | "delta";

export interface PlatformInfo {
  id: PlatformId;
  name: string;
  /** Typical controllers. */
  family: string;
  software: string;
  /** The notation shown in the translation. */
  notation: string;
  addressing: string;
}

export const PLATFORMS: PlatformInfo[] = [
  { id: "iec", name: "IEC 61131-3", family: "Any compliant controller", software: "CODESYS, and every vendor tool", notation: "Structured text", addressing: "Named variables, %IX0.0 and %QX0.0 for direct I/O" },
  { id: "siemens", name: "Siemens", family: "S7-300, S7-1500", software: "TIA Portal, STEP 7", notation: "STL statement list", addressing: "%I0.0 inputs, %Q0.0 outputs, %M markers, %MW words, T and C" },
  { id: "rockwell", name: "Allen Bradley", family: "CompactLogix, ControlLogix", software: "Studio 5000 Logix Designer", notation: "Rung text", addressing: "Named tags aliased to Local:slot:I.Data.bit" },
  { id: "schneider", name: "Schneider Electric", family: "Modicon M221, M241", software: "EcoStruxure Machine Expert", notation: "Instruction list", addressing: "%I0.0 inputs, %Q0.0 outputs, %M bits, %MW words, %TM timers, %C counters" },
  { id: "mitsubishi", name: "Mitsubishi", family: "FX3U, FX5U", software: "GX Works", notation: "Instruction list", addressing: "X000 inputs and Y000 outputs in octal, M relays, D registers, T and C" },
  { id: "omron", name: "Omron", family: "CP1, CJ2", software: "CX-Programmer, Sysmac Studio", notation: "Mnemonics", addressing: "0.00 inputs, 100.00 outputs, W work bits, D data memory, TIM and CNT" },
  { id: "delta", name: "Delta", family: "DVP-ES2, DVP-SS2", software: "ISPSoft, WPLSoft", notation: "Instruction list", addressing: "X0 inputs and Y0 outputs in octal, M relays, D registers, T and C" },
];

export interface IoTag {
  tag: string;
  address: string;
  kind: "input" | "output" | "marker";
  analog?: boolean;
}

export interface MapRow {
  tag: string;
  address: string;
  /** What the tag is in this program. */
  role: string;
}

export interface Translation {
  lines: string[];
  map: MapRow[];
}

type Role = "input" | "output" | "analog in" | "analog out" | "bit" | "word" | "timer" | "counter" | "edge";

const CMP_SYM: Record<CompareOp, string> = { GRT: ">", LES: "<", EQU: "=", NEQ: "<>", GEQ: ">=", LEQ: "<=" };
const isNum = (a: string) => /^-?\d+$/.test(a);

/** Works out what every tag in the program is and where it lives on the chosen platform. */
function allocate(platform: PlatformId, program: Program, io: IoTag[]) {
  const roles = new Map<string, Role>();
  const ioOf = new Map(io.map((t) => [t.tag, t]));
  const set = (tag: string, role: Role) => {
    if (!roles.has(tag) || role === "timer" || role === "counter" || role === "edge") roles.set(tag, role);
  };
  const base = (t: string) => t.split(".")[0];
  const touch = (t: string | undefined, word = false) => {
    if (!t || isNum(t)) return;
    const b = base(t);
    if (b !== t) return; // a timer or counter member, allocated with its block
    const known = ioOf.get(t);
    if (known) set(t, known.analog ? (known.kind === "output" ? "analog out" : "analog in") : known.kind === "output" ? "output" : known.kind === "input" ? "input" : "bit");
    else set(t, word ? "word" : "bit");
  };
  const walk = (n: LogicNode | null) => {
    if (!n) return;
    if (n.kind === "contact") {
      if (n.op === "ONS") set(n.tag, "edge");
      else if (n.b !== undefined) {
        touch(n.tag, true);
        touch(n.b, true);
      } else touch(n.tag);
    } else n.children.forEach(walk);
  };
  for (const r of program.rungs) {
    walk(r.logic);
    for (const o of r.outputs) {
      if (o.op === "TON" || o.op === "TOF") set(o.tag, "timer");
      else if (o.op === "CTU" || o.op === "CTD") set(o.tag, "counter");
      else if (o.op === "RES") continue;
      else if (o.src) {
        touch(o.tag, true);
        o.src.forEach((s) => touch(s, true));
      } else touch(o.tag);
    }
  }

  const counters = { bit: 0, word: 0, timer: 0, counter: 0, ain: 0, aout: 0 };
  const addr = new Map<string, string>();
  const phys = (t: IoTag) => {
    const m = /^([IQM])(\d+)\.(\d+)$/.exec(t.address);
    return m ? { area: m[1], byte: Number(m[2]), bit: Number(m[3]) } : null;
  };
  const octal = (n: number, pad: number) => n.toString(8).padStart(pad, "0");

  for (const [tag, role] of roles) {
    const known = ioOf.get(tag);
    const p = known ? phys(known) : null;
    let a = tag;
    switch (role) {
      case "input":
      case "output": {
        const n = p ? p.byte * 8 + p.bit : 0;
        const inp = role === "input";
        a = {
          iec: `%${inp ? "I" : "Q"}X${p?.byte ?? 0}.${p?.bit ?? 0}`,
          siemens: `%${inp ? "I" : "Q"}${p?.byte ?? 0}.${p?.bit ?? 0}`,
          rockwell: `Local:${inp ? 1 : 2}:${inp ? "I" : "O"}.Data.${n}`,
          schneider: `%${inp ? "I" : "Q"}0.${n}`,
          mitsubishi: `${inp ? "X" : "Y"}${octal(n, 3)}`,
          omron: `${(inp ? 0 : 100) + (p?.byte ?? 0)}.${String(p?.bit ?? 0).padStart(2, "0")}`,
          delta: `${inp ? "X" : "Y"}${octal(n, 1)}`,
        }[platform];
        break;
      }
      case "analog in":
      case "analog out": {
        const inp = role === "analog in";
        const k = inp ? counters.ain++ : counters.aout++;
        a = {
          iec: `%${inp ? "I" : "Q"}W${64 + k * 2}`,
          siemens: known?.address.startsWith("IW") || known?.address.startsWith("QW") ? `%${known.address}` : `%${inp ? "I" : "Q"}W${64 + k * 2}`,
          rockwell: `Local:${inp ? 3 : 4}:${inp ? "I" : "O"}.Ch${k}Data`,
          schneider: `%${inp ? "I" : "Q"}W0.${k}`,
          mitsubishi: `D${(inp ? 8260 : 8262) + k * 2}`,
          omron: `${(inp ? 200 : 210) + k}`,
          delta: `D${(inp ? 1110 : 1116) + k}`,
        }[platform];
        break;
      }
      case "bit":
      case "edge": {
        if (known && p?.area === "M" && platform === "siemens") {
          a = `%M${p.byte}.${p.bit}`;
          break;
        }
        const k = counters.bit++;
        a = {
          iec: tag,
          siemens: `%M${10 + Math.floor(k / 8)}.${k % 8}`,
          rockwell: tag,
          schneider: `%M${k}`,
          mitsubishi: `M${k}`,
          omron: `W${Math.floor(k / 16)}.${String(k % 16).padStart(2, "0")}`,
          delta: `M${k}`,
        }[platform];
        break;
      }
      case "word": {
        const k = counters.word++;
        a = { iec: tag, siemens: `%MW${20 + k * 2}`, rockwell: tag, schneider: `%MW${k}`, mitsubishi: `D${k}`, omron: `D${k}`, delta: `D${k}` }[platform];
        break;
      }
      case "timer": {
        const k = counters.timer++;
        a = { iec: tag, siemens: `T${k}`, rockwell: tag, schneider: `%TM${k}`, mitsubishi: `T${k}`, omron: `T${String(k).padStart(4, "0")}`, delta: `T${k}` }[platform];
        break;
      }
      case "counter": {
        const k = counters.counter++;
        a = { iec: tag, siemens: `C${k}`, rockwell: tag, schneider: `%C${k}`, mitsubishi: `C${k}`, omron: `C${String(k).padStart(4, "0")}`, delta: `C${k}` }[platform];
        break;
      }
    }
    addr.set(tag, a);
  }
  return { roles, addr };
}

const ROLE_LABEL: Record<Role, string> = {
  input: "Input",
  output: "Output",
  "analog in": "Analog input",
  "analog out": "Analog output",
  bit: "Internal bit",
  word: "Word",
  timer: "Timer",
  counter: "Counter",
  edge: "Edge memory",
};

export function translateProgram(platform: PlatformId, program: Program, io: IoTag[], header?: string): Translation {
  const { roles, addr } = allocate(platform, program, io);
  const map: MapRow[] = [...roles].map(([tag, role]) => ({ tag, address: addr.get(tag) ?? tag, role: ROLE_LABEL[role] }));
  if (platform === "iec") return { lines: ladderToST(program, header).split("\n"), map };
  const emit = { siemens: siemensLines, rockwell: rockwellLines, schneider: schneiderLines, mitsubishi: fxLines, omron: omronLines, delta: fxLines }[platform];
  return { lines: emit(program, { platform, roles, addr }), map };
}

interface Ctx {
  platform: PlatformId;
  roles: Map<string, Role>;
  addr: Map<string, string>;
}

/** Address of a tag or member, e.g. Run_T.DN becomes T0 on Mitsubishi. */
function ref(ctx: Ctx, tag: string): string {
  const [b, member] = tag.split(".");
  const a = ctx.addr.get(b) ?? b;
  if (!member) return a;
  const role = ctx.roles.get(b);
  const p = ctx.platform;
  if (p === "rockwell" || p === "iec") return `${a}.${member}`;
  if (member === "DN") return p === "schneider" ? (role === "counter" ? `${a}.D` : `${a}.Q`) : a;
  if (member === "ACC") return p === "schneider" ? `${a}.V` : a;
  if (member === "PRE") return p === "schneider" ? `${a}.P` : a;
  return `${a}.${member}`;
}

/** A numeric constant in each family's notation. */
function konst(p: PlatformId, n: string) {
  return { iec: n, siemens: n, rockwell: n, schneider: n, mitsubishi: `K${n}`, omron: `&${n}`, delta: `K${n}` }[p];
}
const operand = (ctx: Ctx, a: string) => (isNum(a) ? konst(ctx.platform, a) : ref(ctx, a));

const tenths = (ms: number) => Math.max(1, Math.round(ms / 100));

function s5time(ms: number) {
  if (ms % 1000 === 0) return `S5T#${ms / 1000}S`;
  return `S5T#${ms}MS`;
}

// ── Mitsubishi and Delta ───────────────────────────────────────────────────

function stackLogic(ctx: Ctx, n: LogicNode, words: { ld: string; ldn: string; and: string; andn: string; or: string; orn: string; andBlock: string; orBlock: string; pulse: (c: ContactNode) => string[]; always: string; cmp: (pre: "LD" | "AND" | "OR", c: ContactNode) => string }): string[] {
  const out: string[] = [];
  const contact = (c: ContactNode, mode: "LD" | "AND" | "OR") => {
    if (c.op === "ONS") {
      if (mode === "AND") out.push(...words.pulse(c));
      else {
        out.push(`${words.ld} ${words.always}`, ...words.pulse(c));
        if (mode === "OR") out.push(words.orBlock);
      }
      return;
    }
    if (c.b !== undefined) return void out.push(words.cmp(mode, c));
    const neg = c.op === "XIO";
    const op = mode === "LD" ? (neg ? words.ldn : words.ld) : mode === "AND" ? (neg ? words.andn : words.and) : neg ? words.orn : words.or;
    out.push(`${op} ${ref(ctx, c.tag)}`);
  };
  const load = (x: LogicNode) => {
    if (x.kind === "contact") return contact(x, "LD");
    if (x.kind === "series") {
      load(x.children[0]);
      x.children.slice(1).forEach(and);
      return;
    }
    load(x.children[0]);
    for (const c of x.children.slice(1)) {
      if (c.kind === "contact" && c.op !== "ONS") contact(c, "OR");
      else {
        load(c);
        out.push(words.orBlock);
      }
    }
  };
  const and = (x: LogicNode) => {
    if (x.kind === "contact") return contact(x, "AND");
    if (x.kind === "series") return x.children.forEach(and);
    load(x);
    out.push(words.andBlock);
  };
  load(n);
  return out;
}

function fxLines(program: Program, ctx: Ctx): string[] {
  const delta = ctx.platform === "delta";
  const always = delta ? "M1000" : "M8000";
  const words = {
    ld: "LD", ldn: "LDI", and: "AND", andn: "ANI", or: "OR", orn: "ORI", andBlock: "ANB", orBlock: "ORB", always,
    // FX3U and FX5U pulse the result with MEP; DVP writes a pulse relay with PLS and reads it back.
    pulse: (c: ContactNode) => (delta ? [`PLS ${ref(ctx, c.tag)}`, `LD ${ref(ctx, c.tag)}`] : ["MEP"]),
    cmp: (pre: "LD" | "AND" | "OR", c: ContactNode) => `${pre}${CMP_SYM[c.op as CompareOp]} ${operand(ctx, c.tag)} ${operand(ctx, c.b!)}`,
  };
  const lines: string[] = [];
  for (const r of program.rungs) {
    lines.push(`; Rung ${r.number}`);
    lines.push(...(r.logic ? stackLogic(ctx, r.logic, words) : [`LD ${always}`]));
    // Outputs one after another all take the same rung result.
    for (const o of r.outputs) lines.push(...fxOutput(o, ctx));
  }
  lines.push("END");
  return lines;
}

function fxOutput(o: OutputNode, ctx: Ctx): string[] {
  const t = ref(ctx, o.tag);
  const src = (o.src ?? []).map((s) => operand(ctx, s));
  switch (o.op) {
    case "OTE":
      return [`OUT ${t}`];
    case "OTL":
      return [`SET ${t}`];
    case "OTU":
      return [`RST ${t}`];
    case "TON":
      return [`${ctx.platform === "delta" ? "TMR" : "OUT"} ${t} K${tenths(o.preset ?? 0)}`];
    case "TOF":
      return [`; off delay: ${t} times while the input is off`, `${ctx.platform === "delta" ? "TMR" : "OUT"} ${t} K${tenths(o.preset ?? 0)}`];
    case "CTU":
      return [`${ctx.platform === "delta" ? "CNT" : "OUT"} ${t} K${o.preset ?? 0}`];
    case "CTD":
      return [`; count down`, `DCNT ${t} K${o.preset ?? 0}`];
    case "RES":
      return [`RST ${t}`];
    case "MOV":
      return [`MOV ${src[0]} ${t}`];
    case "ADD":
      return [`ADD ${src[0]} ${src[1]} ${t}`];
    case "SUB":
      return [`SUB ${src[0]} ${src[1]} ${t}`];
    case "MUL":
      return [`MUL ${src[0]} ${src[1]} ${t}`];
    case "DIV":
      return [`DIV ${src[0]} ${src[1]} ${t}`];
  }
}

// ── Omron ──────────────────────────────────────────────────────────────────

function omronLines(program: Program, ctx: Ctx): string[] {
  const words = {
    ld: "LD", ldn: "LD NOT", and: "AND", andn: "AND NOT", or: "OR", orn: "OR NOT", andBlock: "AND LD", orBlock: "OR LD", pulse: () => ["UP(521)"], always: "P_On",
    cmp: (pre: "LD" | "AND" | "OR", c: ContactNode) => `${pre}${CMP_SYM[c.op as CompareOp]} ${operand(ctx, c.tag)} ${operand(ctx, c.b!)}`,
  };
  const lines: string[] = [];
  for (const r of program.rungs) {
    lines.push(`' Rung ${r.number}`);
    lines.push(...(r.logic ? stackLogic(ctx, r.logic, words) : ["LD P_On"]));
    for (const o of r.outputs) {
      const t = ref(ctx, o.tag);
      const src = (o.src ?? []).map((s) => operand(ctx, s));
      const num = t.replace(/^[TC]/, "");
      lines.push(
        {
          OTE: `OUT ${t}`,
          OTL: `SET ${t}`,
          OTU: `RSET ${t}`,
          TON: `TIM ${num} #${tenths(o.preset ?? 0)}`,
          TOF: `TIMX(550) ${num} #${tenths(o.preset ?? 0)}`,
          CTU: `CNTR(012) ${num} #${o.preset ?? 0}`,
          CTD: `CNT ${num} #${o.preset ?? 0}`,
          RES: `CNR(545) ${t} ${t}`,
          MOV: `MOV(021) ${src[0]} ${t}`,
          ADD: `+(400) ${src[0]} ${src[1]} ${t}`,
          SUB: `-(410) ${src[0]} ${src[1]} ${t}`,
          MUL: `*(420) ${src[0]} ${src[1]} ${t}`,
          DIV: `/(430) ${src[0]} ${src[1]} ${t}`,
        }[o.op],
      );
    }
  }
  lines.push("END(001)");
  return lines;
}

// ── Siemens STL ────────────────────────────────────────────────────────────

function siemensLines(program: Program, ctx: Ctx): string[] {
  const lines: string[] = [];
  let label = 0;
  const STL_CMP: Record<CompareOp, string> = { GRT: ">I", LES: "<I", EQU: "==I", NEQ: "<>I", GEQ: ">=I", LEQ: "<=I" };
  const cmp = (c: ContactNode, op: "A" | "O") => [`${op}(`, `L ${stlOperand(c.tag)}`, `L ${stlOperand(c.b!)}`, STL_CMP[c.op as CompareOp], ")"];
  function stlOperand(a: string) {
    if (isNum(a)) return a;
    const [b, member] = a.split(".");
    const role = ctx.roles.get(b);
    if (member === "ACC" || (role === "counter" && !member)) return ctx.addr.get(b) ?? b;
    return ref(ctx, a);
  }
  // A counter's done bit is a comparison of its value with the preset.
  const presets = new Map<string, number>();
  for (const r of program.rungs) for (const o of r.outputs) if (o.op === "CTU" || o.op === "CTD") presets.set(o.tag, o.preset ?? 0);

  const contact = (c: ContactNode, op: "A" | "O") => {
    if (c.op === "ONS") return [`FP ${ref(ctx, c.tag)}`];
    if (c.b !== undefined) return cmp(c, op);
    const [b, member] = c.tag.split(".");
    if (member === "DN" && ctx.roles.get(b) === "counter") {
      const up = presets.get(b) !== undefined;
      return [`${op}(`, `L ${ref(ctx, b)}`, `L ${up ? presets.get(b) : 0}`, `${up ? ">=" : "<="}I`, ")"];
    }
    return [`${op}${c.op === "XIO" ? "N" : ""} ${ref(ctx, c.tag)}`];
  };
  const and = (n: LogicNode): string[] => {
    if (n.kind === "contact") return contact(n, "A");
    if (n.kind === "series") return n.children.flatMap(and);
    const out = ["A("];
    n.children.forEach((ch, i) => {
      if (i === 0) out.push(...and(ch));
      else if (ch.kind === "contact") out.push(...contact(ch, "O"));
      else out.push("O", ...and(ch));
    });
    out.push(")");
    return out;
  };

  for (const r of program.rungs) {
    lines.push(`NETWORK ${r.number}`);
    const logic = r.logic ? and(r.logic) : [];
    const conditional = (body: string[]) => {
      if (!r.logic) return body;
      const l = `M${String(++label).padStart(3, "0")}`;
      return [...logic, `JNB ${l}`, ...body, `${l}: NOP 0`];
    };
    const bits: string[] = [];
    const words: string[] = [];
    for (const o of r.outputs) {
      const t = ref(ctx, o.tag);
      const src = (o.src ?? []).map(stlOperand);
      switch (o.op) {
        case "OTE":
          bits.push(`= ${t}`);
          break;
        case "OTL":
          bits.push(`S ${t}`);
          break;
        case "OTU":
          bits.push(`R ${t}`);
          break;
        case "TON":
          bits.push(`L ${s5time(o.preset ?? 0)}`, `SD ${t}`);
          break;
        case "TOF":
          bits.push(`L ${s5time(o.preset ?? 0)}`, `SF ${t}`);
          break;
        case "CTU":
          bits.push(`CU ${t}`);
          break;
        case "CTD":
          bits.push(`CD ${t}`);
          break;
        case "RES":
          bits.push(`R ${t}`);
          break;
        case "MOV":
          words.push(`L ${src[0]}`, `T ${t}`);
          break;
        default:
          words.push(`L ${src[0]}`, `L ${src[1]}`, `${{ ADD: "+", SUB: "-", MUL: "*", DIV: "/" }[o.op]}I`, `T ${t}`);
      }
    }
    if (bits.length) lines.push(...(r.logic ? logic : ["SET"]), ...bits);
    if (words.length) lines.push(...conditional(words));
  }
  return lines;
}

// ── Schneider IL ───────────────────────────────────────────────────────────

function schneiderLines(program: Program, ctx: Ctx): string[] {
  const lines: string[] = [];
  let edge = 100;
  const contact = (c: ContactNode, op: "LD" | "AND" | "OR"): string[] => {
    if (c.op === "ONS") {
      const m = `%M${edge++}`;
      return op === "LD" ? ["LD TRUE", `ST ${m}`, `LDR ${m}`] : [`ST ${m}`, `LDR ${m}`];
    }
    if (c.b !== undefined) return [`${op} [${operand(ctx, c.tag)} ${CMP_SYM[c.op as CompareOp]} ${operand(ctx, c.b)}]`];
    return [`${op}${c.op === "XIO" ? "N" : ""} ${ref(ctx, c.tag)}`];
  };
  // Opens a bracket with the first operand of a branch, as in AND( %I0.1.
  const bracket = (op: "AND" | "OR", n: LogicNode): string[] => {
    const inner = load(n);
    const first = inner[0].replace(/^LD/, "");
    return [`${op}(${first}`, ...inner.slice(1), ")"];
  };
  const load = (n: LogicNode): string[] => {
    if (n.kind === "contact") return contact(n, "LD");
    if (n.kind === "series") return [...load(n.children[0]), ...n.children.slice(1).flatMap(and)];
    return [...load(n.children[0]), ...n.children.slice(1).flatMap((c) => (c.kind === "contact" && c.op !== "ONS" ? contact(c, "OR") : bracket("OR", c)))];
  };
  const and = (n: LogicNode): string[] => {
    if (n.kind === "contact") return contact(n, "AND");
    if (n.kind === "series") return n.children.flatMap(and);
    return bracket("AND", n);
  };

  for (const r of program.rungs) {
    lines.push(`(* Rung ${r.number} *)`);
    lines.push(...(r.logic ? load(r.logic) : ["LD TRUE"]));
    for (const o of r.outputs) {
      const t = ref(ctx, o.tag);
      const src = (o.src ?? []).map((s) => operand(ctx, s));
      const out = {
        OTE: [`ST ${t}`],
        OTL: [`S ${t}`],
        OTU: [`R ${t}`],
        TON: [`IN ${t}`, `(* ${t}: TON, TB 100 ms, preset ${tenths(o.preset ?? 0)} *)`],
        TOF: [`IN ${t}`, `(* ${t}: TOF, TB 100 ms, preset ${tenths(o.preset ?? 0)} *)`],
        CTU: [`CU ${t}`, `(* ${t}: preset ${o.preset ?? 0} *)`],
        CTD: [`CD ${t}`, `(* ${t}: preset ${o.preset ?? 0} *)`],
        RES: [`R ${t}`],
        MOV: [`[${t} := ${src[0]}]`],
        ADD: [`[${t} := ${src[0]} + ${src[1]}]`],
        SUB: [`[${t} := ${src[0]} - ${src[1]}]`],
        MUL: [`[${t} := ${src[0]} * ${src[1]}]`],
        DIV: [`[${t} := ${src[0]} / ${src[1]}]`],
      }[o.op];
      lines.push(...out);
    }
  }
  return lines;
}

// ── Allen Bradley rung text ────────────────────────────────────────────────

function rockwellLines(program: Program, ctx: Ctx): string[] {
  const logic = (n: LogicNode): string => {
    if (n.kind === "contact") {
      if (n.b !== undefined) return `${n.op}(${n.tag},${n.b})`;
      return `${n.op}(${n.tag})`;
    }
    if (n.kind === "series") return n.children.map(logic).join("");
    return `[${n.children.map(logic).join(",")}]`;
  };
  const out = (o: OutputNode) => {
    switch (o.op) {
      case "TON":
      case "TOF":
        return `${o.op}(${o.tag},${o.preset ?? 0},0)`;
      case "CTU":
      case "CTD":
        return `${o.op}(${o.tag},${o.preset ?? 0},0)`;
      case "MOV":
        return `MOV(${o.src![0]},${o.tag})`;
      case "ADD":
      case "SUB":
      case "MUL":
      case "DIV":
        return `${o.op}(${o.src![0]},${o.src![1]},${o.tag})`;
      default:
        return `${o.op}(${o.tag})`;
    }
  };
  void ctx;
  return program.rungs.map((r) => {
    const outs = r.outputs.map(out);
    const tail = outs.length > 1 ? `[${outs.join(",")}]` : outs[0];
    return `${r.logic ? logic(r.logic) : ""}${tail};`;
  });
}
