// Ladder text format, evaluated left to right like a rung is read:
//   RUNG 1: XIC(Start) OR XIC(Run) AND XIO(Stop) OTE(Run)
// means (Start OR Run) AND NOT Stop. Parentheses group branches, and two
// instructions written side by side are in series (implicit AND).

export type CompareOp = "GRT" | "LES" | "EQU" | "NEQ" | "GEQ" | "LEQ";
export type ContactOp = "XIC" | "XIO" | "ONS" | CompareOp;
export type OutputOp = "OTE" | "OTL" | "OTU" | "TON" | "TOF" | "CTU" | "CTD" | "RES" | "MOV" | "ADD" | "SUB" | "MUL" | "DIV";

export const COMPARE_OPS: CompareOp[] = ["GRT", "LES", "EQU", "NEQ", "GEQ", "LEQ"];
export const isCompare = (op: string): op is CompareOp => (COMPARE_OPS as string[]).includes(op);

export interface ContactNode {
  kind: "contact";
  id: string;
  op: ContactOp;
  /** The bit to test, the one shot storage bit, or the first operand of a compare. */
  tag: string;
  /** Second operand of a compare: a tag or a number. */
  b?: string;
}

export interface GroupNode {
  kind: "series" | "parallel";
  id: string;
  children: LogicNode[];
}

export type LogicNode = ContactNode | GroupNode;

export interface OutputNode {
  id: string;
  op: OutputOp;
  /** The bit, timer or counter written, or the destination of MOV, ADD and SUB. */
  tag: string;
  preset?: number;
  /** Source operands of MOV, ADD, SUB, MUL and DIV: tags or numbers. */
  src?: string[];
}

export interface Rung {
  number: number;
  line: number;
  logic: LogicNode | null;
  outputs: OutputNode[];
  comment?: string;
}

export interface Program {
  rungs: Rung[];
}

export class LadderError extends Error {
  constructor(
    public line: number,
    message: string,
  ) {
    super(`Line ${line}: ${message}`);
  }
}

const CONTACTS = new Set<string>(["XIC", "XIO", "ONS", ...COMPARE_OPS]);
const OUTPUTS = new Set<string>(["OTE", "OTL", "OTU", "TON", "TOF", "CTU", "CTD", "RES", "MOV", "ADD", "SUB", "MUL", "DIV"]);
const TAG_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)?$/;
const NUM_RE = /^-?\d+(\.\d+)?$/;
const isOperand = (a: string | undefined): a is string => Boolean(a && (TAG_RE.test(a) || NUM_RE.test(a)));
const SOURCES: Partial<Record<OutputOp, number>> = { MOV: 1, ADD: 2, SUB: 2, MUL: 2, DIV: 2 };

type Token =
  | { t: "instr"; op: string; args: string[]; col: number }
  | { t: "op"; v: "AND" | "OR"; col: number }
  | { t: "lp"; col: number }
  | { t: "rp"; col: number };

function tokenize(src: string, line: number): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ t: "lp", col: i });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ t: "rp", col: i });
      i++;
      continue;
    }
    const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (!word) throw new LadderError(line, `Unexpected character "${ch}".`);
    const w = word[0];
    const upper = w.toUpperCase();
    if (upper === "AND" || upper === "OR") {
      tokens.push({ t: "op", v: upper, col: i });
      i += w.length;
      continue;
    }
    if (!CONTACTS.has(upper) && !OUTPUTS.has(upper)) {
      throw new LadderError(line, `Unknown instruction "${w}". Try XIC, XIO, ONS, GRT, EQU, OTE, OTL, OTU, TON, TOF, CTU, RES or MOV.`);
    }
    const rest = src.slice(i + w.length);
    const call = /^\s*\(([^()]*)\)/.exec(rest);
    if (!call) throw new LadderError(line, `${upper} needs a tag in brackets, for example ${upper}(Start_PB).`);
    const args = call[1].split(",").map((a) => a.trim()).filter(Boolean);
    tokens.push({ t: "instr", op: upper, args, col: i });
    i += w.length + call[0].length;
  }
  return tokens;
}

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}${idCounter++}`;

function combine(kind: "series" | "parallel", a: LogicNode, b: LogicNode): GroupNode {
  const children: LogicNode[] = [];
  for (const n of [a, b]) {
    if (n.kind === kind) children.push(...n.children);
    else children.push(n);
  }
  return { kind, id: nextId("g"), children };
}

function parseLogic(tokens: Token[], line: number): LogicNode {
  let pos = 0;

  function parseExpr(): LogicNode {
    let acc = parseTerm();
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.t === "rp") break;
      let op: "AND" | "OR" = "AND";
      if (tok.t === "op") {
        op = tok.v;
        pos++;
      }
      const rhs = parseTerm();
      acc = combine(op === "AND" ? "series" : "parallel", acc, rhs);
    }
    return acc;
  }

  function parseTerm(): LogicNode {
    const tok = tokens[pos];
    if (!tok) throw new LadderError(line, "The rung ends before its logic is complete.");
    if (tok.t === "lp") {
      pos++;
      const inner = parseExpr();
      if (tokens[pos]?.t !== "rp") throw new LadderError(line, "A bracket is opened but never closed.");
      pos++;
      return inner;
    }
    if (tok.t === "instr") {
      pos++;
      if (OUTPUTS.has(tok.op)) throw new LadderError(line, `${tok.op} is an output and goes at the end of the rung.`);
      if (isCompare(tok.op)) {
        const [a, b] = tok.args;
        if (!isOperand(a) || !isOperand(b)) throw new LadderError(line, `${tok.op} compares two values, for example ${tok.op}(Tank_Level, 80).`);
        return { kind: "contact", id: nextId("c"), op: tok.op, tag: a, b };
      }
      const tag = tok.args[0];
      if (!tag || !TAG_RE.test(tag)) throw new LadderError(line, `${tok.op} has an invalid tag "${tag ?? ""}".`);
      return { kind: "contact", id: nextId("c"), op: tok.op as ContactOp, tag };
    }
    if (tok.t === "rp") throw new LadderError(line, "A closing bracket has no matching opening bracket.");
    throw new LadderError(line, `"${tok.v}" needs a contact on both sides.`);
  }

  const node = parseExpr();
  if (pos !== tokens.length) throw new LadderError(line, "A closing bracket has no matching opening bracket.");
  return node;
}

export function parseRung(text: string, line: number, number: number): Rung {
  const tokens = tokenize(text, line);
  const firstOutput = tokens.findIndex((t) => t.t === "instr" && OUTPUTS.has(t.op));
  if (firstOutput === -1) throw new LadderError(line, "Every rung needs an output, for example OTE(Motor_Run).");

  const logicTokens = tokens.slice(0, firstOutput);
  const outputTokens = tokens.slice(firstOutput);
  const outputs: OutputNode[] = outputTokens.map((tok) => {
    if (tok.t !== "instr" || !OUTPUTS.has(tok.op)) {
      throw new LadderError(line, "Outputs go at the end of the rung. Move contacts before the first output.");
    }
    const sources = SOURCES[tok.op as OutputOp];
    if (sources) {
      const src = tok.args.slice(0, sources);
      const dest = tok.args[sources];
      const example = tok.op === "MOV" ? "MOV(0, Count)" : `${tok.op}(Count, 1, Count)`;
      if (tok.args.length !== sources + 1 || !src.every(isOperand) || !dest || !TAG_RE.test(dest)) {
        throw new LadderError(line, `${tok.op} takes ${sources === 1 ? "a source" : "two values"} and a destination tag, for example ${example}.`);
      }
      return { id: nextId("o"), op: tok.op as OutputOp, tag: dest, src };
    }
    const [tag, presetRaw] = tok.args;
    if (!tag || !TAG_RE.test(tag)) throw new LadderError(line, `${tok.op} has an invalid tag "${tag ?? ""}".`);
    const out: OutputNode = { id: nextId("o"), op: tok.op as OutputOp, tag };
    if (tok.op === "TON" || tok.op === "TOF" || tok.op === "CTU" || tok.op === "CTD") {
      const preset = Number(presetRaw);
      if (!presetRaw || !Number.isFinite(preset) || preset <= 0) {
        const counter = tok.op === "CTU" || tok.op === "CTD";
        throw new LadderError(line, `${tok.op}(${tag}, ...) needs a preset ${counter ? "count" : "time in ms"}, for example ${tok.op}(${tag}, ${counter ? 5 : 3000}).`);
      }
      out.preset = preset;
    }
    return out;
  });

  return {
    number,
    line,
    logic: logicTokens.length ? parseLogic(logicTokens, line) : null,
    outputs,
  };
}

export function parseProgram(source: string): Program {
  const rungs: Rung[] = [];
  source.split("\n").forEach((raw, idx) => {
    const line = idx + 1;
    const text = raw.replace(/\/\/.*$/, "").trim();
    if (!text) return;
    const m = /^RUNG\s+(\d+)\s*:\s*(.*)$/i.exec(text);
    if (!m) throw new LadderError(line, 'Start each rung with "RUNG n:", for example RUNG 1: XIC(Start_PB) OTE(Motor_Run).');
    rungs.push(parseRung(m[2], line, Number(m[1])));
  });
  return { rungs };
}

export function collectTags(program: Program): string[] {
  const tags = new Set<string>();
  const add = (a?: string) => a && TAG_RE.test(a) && tags.add(a);
  const walk = (n: LogicNode | null) => {
    if (!n) return;
    if (n.kind === "contact") {
      add(n.tag);
      add(n.b);
    } else n.children.forEach(walk);
  };
  for (const r of program.rungs) {
    walk(r.logic);
    r.outputs.forEach((o) => {
      add(o.tag);
      o.src?.forEach(add);
    });
  }
  return [...tags];
}
