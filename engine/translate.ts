// Ladder to structured text. Each rung becomes one or a few ST statements that behave the
// same scan for scan, so a lesson's ladder program also runs, and is marked, as ST.

import type { LogicNode, OutputNode, Program } from "./ladder";
import type { FbType } from "./st";

const CMP: Record<string, string> = { GRT: ">", LES: "<", EQU: "=", NEQ: "<>", GEQ: ">=", LEQ: "<=" };

/** IEC member names for the ladder storage suffixes. */
function memberName(tag: string, fbs: Record<string, FbType>) {
  const dot = tag.indexOf(".");
  if (dot < 0) return tag;
  const base = tag.slice(0, dot);
  const member = tag.slice(dot + 1);
  const type = fbs[base];
  if (!type) return tag;
  if (member === "DN") return `${base}.Q`;
  if (member === "ACC") return `${base}.${type === "CTU" || type === "CTD" ? "CV" : "ET"}`;
  return tag;
}

export function ladderToST(program: Program, header?: string): string {
  const fbs: Record<string, FbType> = {};
  // Collect function block instances first so contacts on .DN read as .Q.
  const walkOns = (n: LogicNode | null) => {
    if (!n) return;
    if (n.kind === "contact") {
      if (n.op === "ONS") fbs[n.tag] = "R_TRIG";
    } else n.children.forEach(walkOns);
  };
  for (const r of program.rungs) {
    walkOns(r.logic);
    for (const o of r.outputs) if (o.op === "TON" || o.op === "TOF" || o.op === "CTU" || o.op === "CTD") fbs[o.tag] = o.op;
  }

  const name = (t: string) => memberName(t, fbs);
  const operand = (a: string) => (/^-?\d/.test(a) ? a : name(a));
  const out: string[] = [];
  if (header) out.push(`// ${header}`);
  if (Object.keys(fbs).length) {
    out.push("VAR");
    for (const [n, t] of Object.entries(fbs)) out.push(`  ${n} : ${t};`);
    out.push("END_VAR");
  }

  for (const rung of program.rungs) {
    const pre: string[] = [];
    // Returns an ST expression; one shots emit their R_TRIG call into `pre` and read .Q.
    const expr = (n: LogicNode, incoming: string | null, top: boolean): string => {
      if (n.kind === "contact") {
        let own: string;
        if (n.op === "ONS") {
          pre.push(`${n.tag}(CLK := ${incoming ?? "TRUE"});`);
          return `${n.tag}.Q`;
        }
        if (n.b !== undefined) own = `(${operand(n.tag)} ${CMP[n.op]} ${operand(n.b)})`;
        else own = n.op === "XIO" ? `NOT ${name(n.tag)}` : name(n.tag);
        return incoming ? `${incoming} AND ${own}` : own;
      }
      if (n.kind === "series") {
        let acc = incoming;
        for (const c of n.children) acc = expr(c, acc, false);
        return acc ?? "TRUE";
      }
      const branches = n.children.map((c) => expr(c, null, false));
      const joined = branches.map((b) => (b.includes(" AND ") ? `(${b})` : b)).join(" OR ");
      const grouped = top ? joined : `(${joined})`;
      return incoming ? `${incoming} AND ${grouped}` : grouped;
    };
    const cond = rung.logic ? expr(rung.logic, null, true) : "TRUE";
    out.push(`// Rung ${rung.number}`);
    out.push(...pre);
    // Ladder solves the rung once, then writes every output. Several outputs must not see each
    // other's writes in their condition, so share one IF block, or a rung bit when they mix types.
    const conditional = (o: OutputNode) => !["OTE", "TON", "TOF", "CTU", "CTD"].includes(o.op);
    if (rung.outputs.length > 1 && cond !== "TRUE" && rung.outputs.every(conditional)) {
      out.push(`IF ${cond} THEN`);
      for (const o of rung.outputs) out.push(...output(o, "TRUE", name, operand).map((l) => `  ${l}`));
      out.push("END_IF;");
      continue;
    }
    let c = cond;
    if (rung.outputs.length > 1 && cond !== "TRUE" && /[A-Za-z]/.test(cond) && cond.includes(" ")) {
      out.push(`Rung_${rung.number} := ${cond};`);
      c = `Rung_${rung.number}`;
    }
    for (const o of rung.outputs) out.push(...output(o, c, name, operand));
  }
  return out.join("\n");
}

function output(o: OutputNode, cond: string, name: (t: string) => string, operand: (a: string) => string): string[] {
  const when = (body: string) => (cond === "TRUE" ? [body] : [`IF ${cond} THEN ${body} END_IF;`]);
  switch (o.op) {
    case "OTE":
      return [`${o.tag} := ${cond};`];
    case "OTL":
      return when(`${o.tag} := TRUE;`);
    case "OTU":
      return when(`${o.tag} := FALSE;`);
    case "TON":
    case "TOF":
      return [`${o.tag}(IN := ${cond}, PT := T#${o.preset}ms);`];
    case "CTU":
      return [`${o.tag}(CU := ${cond}, PV := ${o.preset});`];
    case "CTD":
      return [`${o.tag}(CD := ${cond}, PV := ${o.preset});`];
    case "RES":
      return when(`${name(`${o.tag}.ACC`)} := 0;`);
    case "MOV":
      return when(`${name(o.tag)} := ${operand(o.src![0])};`);
    case "ADD":
      return when(`${name(o.tag)} := ${operand(o.src![0])} + ${operand(o.src![1])};`);
    case "SUB":
      return when(`${name(o.tag)} := ${operand(o.src![0])} - ${operand(o.src![1])};`);
    case "MUL":
      return when(`${name(o.tag)} := ${operand(o.src![0])} * ${operand(o.src![1])};`);
    case "DIV":
      return when(`${name(o.tag)} := ${operand(o.src![0])} / ${operand(o.src![1])};`);
  }
}
