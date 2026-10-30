// Structured text (IEC 61131-3 style) for the same memory model as the ladder engine.
// Supported: VAR blocks for function block instances, :=, IF / ELSIF / ELSE, CASE,
// NOT AND OR XOR, = <> < > <= >=, + - * / MOD, TRUE / FALSE, numbers and T#..ms/s literals,
// and the function blocks TON, TOF, CTU, CTD, R_TRIG, F_TRIG and PID.
// Timers and counters store their state under the same names as ladder (.ACC, .DN, .PRE),
// so .Q and .ET / .CV are read as aliases and lessons can be marked the same way in either language.

import { pidStep, type Memory } from "./scan";

export class StError extends Error {
  constructor(
    public line: number,
    message: string,
  ) {
    super(`Line ${line}: ${message}`);
  }
}

type Tok = { t: "id" | "num" | "op" | "kw"; v: string; line: number };

const KEYWORDS = new Set([
  "IF", "THEN", "ELSIF", "ELSE", "END_IF", "CASE", "OF", "END_CASE", "VAR", "END_VAR", "VAR_INPUT", "VAR_OUTPUT",
  "AND", "OR", "XOR", "NOT", "MOD", "TRUE", "FALSE",
]);

export type FbType = "TON" | "TOF" | "CTU" | "CTD" | "R_TRIG" | "F_TRIG" | "PID";
const FB_TYPES = new Set<string>(["TON", "TOF", "CTU", "CTD", "R_TRIG", "F_TRIG", "PID"]);

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  let line = 1;
  while (i < src.length) {
    const c = src[i];
    if (c === "\n") {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (src.startsWith("//", i)) {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (src.startsWith("(*", i)) {
      const end = src.indexOf("*)", i + 2);
      const stop = end < 0 ? src.length : end + 2;
      for (let k = i; k < stop; k++) if (src[k] === "\n") line++;
      i = stop;
      continue;
    }
    const time = /^T#(\d+(?:\.\d+)?)(ms|s|m)\b/i.exec(src.slice(i));
    if (time) {
      const n = Number(time[1]);
      const unit = time[2].toLowerCase();
      const ms = unit === "ms" ? n : unit === "s" ? n * 1000 : n * 60000;
      out.push({ t: "num", v: String(Math.round(ms)), line });
      i += time[0].length;
      continue;
    }
    const num = /^\d+(\.\d+)?/.exec(src.slice(i));
    if (num) {
      out.push({ t: "num", v: num[0], line });
      i += num[0].length;
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?/.exec(src.slice(i));
    if (id) {
      const upper = id[0].toUpperCase();
      if (KEYWORDS.has(upper)) out.push({ t: "kw", v: upper, line });
      else out.push({ t: "id", v: id[0], line });
      i += id[0].length;
      continue;
    }
    const op = /^(:=|<>|<=|>=|[=<>+\-*/():;,])/.exec(src.slice(i));
    if (op) {
      out.push({ t: "op", v: op[0], line });
      i += op[0].length;
      continue;
    }
    throw new StError(line, `Unexpected character "${c}".`);
  }
  return out;
}

export type Expr =
  | { k: "num"; v: number }
  | { k: "bool"; v: boolean }
  | { k: "var"; name: string }
  | { k: "not"; e: Expr }
  | { k: "neg"; e: Expr }
  | { k: "bin"; op: string; a: Expr; b: Expr };

export type Stmt =
  | { k: "assign"; line: number; name: string; e: Expr }
  | { k: "if"; line: number; arms: { line: number; cond: Expr; body: Stmt[] }[]; otherwise: Stmt[] | null; elseLine: number | null }
  | { k: "case"; line: number; e: Expr; arms: { line: number; labels: number[]; body: Stmt[] }[]; otherwise: Stmt[] | null }
  | { k: "call"; line: number; name: string; args: Record<string, Expr> };

export interface StProgram {
  fbs: Record<string, FbType>;
  body: Stmt[];
  lines: number[];
}

export function parseST(src: string): StProgram {
  const toks = tokenize(src);
  let p = 0;
  const fbs: Record<string, FbType> = {};
  const lines = new Set<number>();
  const peek = () => toks[p];
  const lastLine = () => toks[toks.length - 1]?.line ?? 1;
  const is = (t: Tok["t"], v?: string) => peek()?.t === t && (v === undefined || peek().v === v);
  const take = (t: Tok["t"], v?: string, what?: string): Tok => {
    const tok = peek();
    if (!tok || tok.t !== t || (v !== undefined && tok.v !== v)) {
      throw new StError(tok?.line ?? lastLine(), `Expected ${what ?? v ?? t}${tok ? `, found "${tok.v}"` : " before the end"}.`);
    }
    p++;
    return tok;
  };
  const optionalSemi = () => {
    if (is("op", ";")) p++;
  };

  function primary(): Expr {
    const tok = peek();
    if (!tok) throw new StError(lastLine(), "The expression ends too early.");
    if (tok.t === "num") {
      p++;
      return { k: "num", v: Number(tok.v) };
    }
    if (tok.t === "kw" && (tok.v === "TRUE" || tok.v === "FALSE")) {
      p++;
      return { k: "bool", v: tok.v === "TRUE" };
    }
    if (tok.t === "id") {
      p++;
      return { k: "var", name: tok.v };
    }
    if (tok.t === "op" && tok.v === "(") {
      p++;
      const e = expr();
      take("op", ")", '")"');
      return e;
    }
    throw new StError(tok.line, `"${tok.v}" cannot start an expression.`);
  }
  function unary(): Expr {
    if (is("kw", "NOT")) {
      p++;
      return { k: "not", e: unary() };
    }
    if (is("op", "-")) {
      p++;
      return { k: "neg", e: unary() };
    }
    return primary();
  }
  function binary(next: () => Expr, ops: string[], kind: Tok["t"] = "op"): () => Expr {
    return () => {
      let a = next();
      while (peek() && (peek().t === kind || (kind === "op" && peek().t === "kw" && peek().v === "MOD")) && ops.includes(peek().v)) {
        const op = toks[p++].v;
        a = { k: "bin", op, a, b: next() };
      }
      return a;
    };
  }
  const mul = binary(unary, ["*", "/", "MOD"]);
  const add = binary(mul, ["+", "-"]);
  const cmp = binary(add, ["=", "<>", "<", ">", "<=", ">="]);
  const and = binary(cmp, ["AND"], "kw");
  const xor = binary(and, ["XOR"], "kw");
  const expr = binary(xor, ["OR"], "kw");

  function block(ends: string[]): Stmt[] {
    const out: Stmt[] = [];
    while (peek() && !(peek().t === "kw" && ends.includes(peek().v))) {
      if (is("op", ";")) {
        p++;
        continue;
      }
      out.push(statement());
    }
    return out;
  }

  function statement(): Stmt {
    const tok = peek();
    if (tok.t === "kw" && tok.v === "IF") {
      p++;
      const arms: { line: number; cond: Expr; body: Stmt[] }[] = [];
      const cond = expr();
      take("kw", "THEN");
      arms.push({ line: tok.line, cond, body: block(["ELSIF", "ELSE", "END_IF"]) });
      lines.add(tok.line);
      let otherwise: Stmt[] | null = null;
      let elseLine: number | null = null;
      while (is("kw", "ELSIF")) {
        const l = toks[p++].line;
        const c = expr();
        take("kw", "THEN");
        arms.push({ line: l, cond: c, body: block(["ELSIF", "ELSE", "END_IF"]) });
        lines.add(l);
      }
      if (is("kw", "ELSE")) {
        elseLine = toks[p++].line;
        otherwise = block(["END_IF"]);
      }
      take("kw", "END_IF", "END_IF");
      optionalSemi();
      return { k: "if", line: tok.line, arms, otherwise, elseLine };
    }
    if (tok.t === "kw" && tok.v === "CASE") {
      p++;
      const e = expr();
      take("kw", "OF");
      lines.add(tok.line);
      const arms: { line: number; labels: number[]; body: Stmt[] }[] = [];
      let otherwise: Stmt[] | null = null;
      while (peek() && !is("kw", "END_CASE")) {
        if (is("kw", "ELSE")) {
          p++;
          otherwise = block(["END_CASE"]);
          break;
        }
        const l = peek().line;
        const labels: number[] = [];
        do {
          if (is("op", ",")) p++;
          const neg = is("op", "-") ? (p++, -1) : 1;
          labels.push(neg * Number(take("num", undefined, "a case number").v));
        } while (is("op", ","));
        take("op", ":", '":"');
        lines.add(l);
        arms.push({ line: l, labels, body: blockUntilCaseLabel() });
      }
      take("kw", "END_CASE", "END_CASE");
      optionalSemi();
      return { k: "case", line: tok.line, e, arms, otherwise };
    }
    if (tok.t === "id") {
      p++;
      lines.add(tok.line);
      if (is("op", ":=")) {
        p++;
        const e = expr();
        take("op", ";", '";" at the end of the statement');
        return { k: "assign", line: tok.line, name: tok.v, e };
      }
      if (is("op", "(")) {
        p++;
        const args: Record<string, Expr> = {};
        while (!is("op", ")")) {
          const name = take("id", undefined, "a parameter name").v.toUpperCase();
          take("op", ":=", '":="');
          args[name] = expr();
          if (is("op", ",")) p++;
          else break;
        }
        take("op", ")", '")"');
        take("op", ";", '";" after the call');
        if (!fbs[tok.v]) fbs[tok.v] = inferFb(args, tok.line);
        return { k: "call", line: tok.line, name: tok.v, args };
      }
      throw new StError(tok.line, `Expected ":=" or "(" after ${tok.v}.`);
    }
    throw new StError(tok.line, `"${tok.v}" cannot start a statement.`);
  }

  // Inside CASE, a statement list ends at the next "number :" label, ELSE or END_CASE.
  function blockUntilCaseLabel(): Stmt[] {
    const out: Stmt[] = [];
    while (peek() && !is("kw", "END_CASE") && !is("kw", "ELSE")) {
      const save = p;
      if (is("num") || is("op", "-")) {
        let q = p + (is("op", "-") ? 1 : 0);
        while (toks[q] && (toks[q].t === "num" || (toks[q].t === "op" && toks[q].v === ","))) q++;
        if (toks[q]?.t === "op" && toks[q].v === ":") {
          p = save;
          break;
        }
      }
      if (is("op", ";")) {
        p++;
        continue;
      }
      out.push(statement());
    }
    return out;
  }

  function inferFb(args: Record<string, Expr>, line: number): FbType {
    if ("CLK" in args) return "R_TRIG";
    if ("CU" in args) return "CTU";
    if ("CD" in args) return "CTD";
    if ("IN" in args) return "TON";
    throw new StError(line, "Declare this function block in a VAR block, for example Name : TON;");
  }

  // Declarations.
  while (is("kw", "VAR") || is("kw", "VAR_INPUT") || is("kw", "VAR_OUTPUT")) {
    p++;
    while (!is("kw", "END_VAR")) {
      const name = take("id", undefined, "a variable name");
      take("op", ":", '":"');
      const type = take("id", undefined, "a type");
      const upper = type.v.toUpperCase();
      if (FB_TYPES.has(upper)) fbs[name.v] = upper as FbType;
      while (peek() && !is("op", ";")) p++;
      take("op", ";", '";"');
    }
    take("kw", "END_VAR");
  }
  const body = block([]);
  if (p < toks.length) throw new StError(toks[p].line, `Unexpected "${toks[p].v}".`);
  return { fbs, body, lines: [...lines].sort((a, b) => a - b) };
}

/* -------------------------------------------------------------- execution */

export interface StLineTrace {
  ran: boolean;
  /** For IF / ELSIF lines, whether the condition was true. For assignments, the value written. */
  value?: boolean | number;
}

export interface StResult {
  memory: Memory;
  lines: Record<number, StLineTrace>;
}

/** .Q / .ET / .CV are IEC names for the ladder style .DN / .ACC storage. */
function resolveName(name: string, fbs: Record<string, FbType>) {
  const dot = name.indexOf(".");
  if (dot < 0) return name;
  const base = name.slice(0, dot);
  const member = name.slice(dot + 1).toUpperCase();
  const type = fbs[base];
  if (type === "PID") return `${base}.${name.slice(dot + 1)}`;
  if (type === "R_TRIG" || type === "F_TRIG") return `${base}.Q`;
  if (member === "Q") return `${base}.DN`;
  if (member === "ET" || member === "CV") return `${base}.ACC`;
  if (member === "PT" || member === "PV") return `${base}.PRE`;
  return `${base}.${name.slice(dot + 1)}`;
}

export function runST(prog: StProgram, input: Memory, dtMs: number): StResult {
  const mem: Memory = { ...input };
  const lines: Record<number, StLineTrace> = {};
  const read = (name: string): boolean | number => mem[resolveName(name, prog.fbs)] ?? 0;
  const num = (v: boolean | number) => (typeof v === "boolean" ? (v ? 1 : 0) : v);
  const bool = (v: boolean | number) => Boolean(v);

  function ev(e: Expr): boolean | number {
    switch (e.k) {
      case "num":
        return e.v;
      case "bool":
        return e.v;
      case "var":
        return read(e.name);
      case "not":
        return !bool(ev(e.e));
      case "neg":
        return -num(ev(e.e));
      case "bin": {
        const a = ev(e.a);
        const b = ev(e.b);
        switch (e.op) {
          case "AND":
            return bool(a) && bool(b);
          case "OR":
            return bool(a) || bool(b);
          case "XOR":
            return bool(a) !== bool(b);
          case "=":
            return num(a) === num(b);
          case "<>":
            return num(a) !== num(b);
          case "<":
            return num(a) < num(b);
          case ">":
            return num(a) > num(b);
          case "<=":
            return num(a) <= num(b);
          case ">=":
            return num(a) >= num(b);
          case "+":
            return num(a) + num(b);
          case "-":
            return num(a) - num(b);
          case "*":
            return num(a) * num(b);
          case "/": {
            const d = num(b);
            if (d === 0) return 0;
            const q = num(a) / d;
            return Number.isInteger(num(a)) && Number.isInteger(d) ? Math.trunc(q) : q;
          }
          case "MOD": {
            const d = num(b);
            return d === 0 ? 0 : num(a) % d;
          }
        }
      }
    }
    return 0;
  }

  function call(name: string, type: FbType, args: Record<string, Expr>) {
    const t = name;
    const arg = (k: string, fallback: boolean | number) => (k in args ? ev(args[k]) : fallback);
    switch (type) {
      case "TON": {
        const on = bool(arg("IN", false));
        const pre = num(arg("PT", num(mem[`${t}.PRE`] ?? 0)));
        if (on) {
          const acc = Math.min(pre, num(mem[`${t}.ACC`] ?? 0) + dtMs);
          Object.assign(mem, { [`${t}.ACC`]: acc, [`${t}.EN`]: true, [`${t}.DN`]: acc >= pre, [`${t}.TT`]: acc < pre });
        } else Object.assign(mem, { [`${t}.ACC`]: 0, [`${t}.EN`]: false, [`${t}.DN`]: false, [`${t}.TT`]: false });
        mem[`${t}.PRE`] = pre;
        break;
      }
      case "TOF": {
        const on = bool(arg("IN", false));
        const pre = num(arg("PT", num(mem[`${t}.PRE`] ?? 0)));
        if (on) Object.assign(mem, { [`${t}.ACC`]: 0, [`${t}.EN`]: true, [`${t}.DN`]: true, [`${t}.TT`]: false });
        else {
          mem[`${t}.EN`] = false;
          if (mem[`${t}.DN`]) {
            const acc = Math.min(pre, num(mem[`${t}.ACC`] ?? 0) + dtMs);
            Object.assign(mem, { [`${t}.ACC`]: acc, [`${t}.DN`]: acc < pre, [`${t}.TT`]: acc < pre });
          }
        }
        mem[`${t}.PRE`] = pre;
        break;
      }
      case "CTU":
      case "CTD": {
        const up = type === "CTU";
        const clk = bool(arg(up ? "CU" : "CD", false));
        const pre = num(arg("PV", num(mem[`${t}.PRE`] ?? 0)));
        if (bool(arg(up ? "R" : "LD", false))) mem[`${t}.ACC`] = up ? 0 : pre;
        else if (clk && !mem[`${t}.CU`]) mem[`${t}.ACC`] = num(mem[`${t}.ACC`] ?? 0) + (up ? 1 : -1);
        mem[`${t}.CU`] = clk;
        mem[`${t}.PRE`] = pre;
        mem[`${t}.DN`] = up ? num(mem[`${t}.ACC`] ?? 0) >= pre : num(mem[`${t}.ACC`] ?? 0) <= 0;
        break;
      }
      case "PID": {
        // PID(AUTO, PV, SP, CV): CV is the output's present value, followed in manual; the result is .OUT.
        pidStep(mem, t, num(arg("PV", 0)), num(arg("SP", 0)), num(arg("CV", 0)), bool(arg("AUTO", true)), dtMs);
        break;
      }
      case "R_TRIG":
      case "F_TRIG": {
        const clk = bool(arg("CLK", false));
        const prev = Boolean(mem[`${t}.M`]);
        mem[`${t}.Q`] = type === "R_TRIG" ? clk && !prev : !clk && prev;
        mem[`${t}.M`] = clk;
        break;
      }
    }
  }

  function exec(list: Stmt[]) {
    for (const s of list) {
      if (s.k === "assign") {
        const v = ev(s.e);
        mem[resolveName(s.name, prog.fbs)] = v;
        lines[s.line] = { ran: true, value: v };
      } else if (s.k === "call") {
        call(s.name, prog.fbs[s.name], s.args);
        lines[s.line] = { ran: true, value: Boolean(mem[`${s.name}.DN`] ?? mem[`${s.name}.Q`]) };
      } else if (s.k === "if") {
        let done = false;
        for (const arm of s.arms) {
          const c = bool(ev(arm.cond));
          lines[arm.line] = { ran: true, value: c };
          if (c) {
            exec(arm.body);
            done = true;
            break;
          }
        }
        if (!done && s.otherwise) {
          if (s.elseLine) lines[s.elseLine] = { ran: true, value: true };
          exec(s.otherwise);
        }
      } else if (s.k === "case") {
        const v = num(ev(s.e));
        lines[s.line] = { ran: true, value: v };
        const arm = s.arms.find((a) => a.labels.includes(v));
        if (arm) {
          lines[arm.line] = { ran: true, value: true };
          exec(arm.body);
        } else if (s.otherwise) exec(s.otherwise);
      }
    }
  }

  exec(prog.body);
  return { memory: mem, lines };
}

/** Every variable name the program reads or writes, for the scan monitor. */
export function stTags(prog: StProgram): string[] {
  const out = new Set<string>();
  const walkE = (e: Expr) => {
    if (e.k === "var") out.add(resolveName(e.name, prog.fbs));
    else if (e.k === "not" || e.k === "neg") walkE(e.e);
    else if (e.k === "bin") {
      walkE(e.a);
      walkE(e.b);
    }
  };
  const walk = (list: Stmt[]) => {
    for (const s of list) {
      if (s.k === "assign") {
        out.add(resolveName(s.name, prog.fbs));
        walkE(s.e);
      } else if (s.k === "call") Object.values(s.args).forEach(walkE);
      else if (s.k === "if") {
        s.arms.forEach((a) => {
          walkE(a.cond);
          walk(a.body);
        });
        if (s.otherwise) walk(s.otherwise);
      } else if (s.k === "case") {
        walkE(s.e);
        s.arms.forEach((a) => walk(a.body));
        if (s.otherwise) walk(s.otherwise);
      }
    }
  };
  walk(prog.body);
  return [...out];
}
