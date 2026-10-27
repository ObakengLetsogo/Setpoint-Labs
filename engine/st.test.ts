import { describe, expect, it } from "vitest";
import { parseProgram } from "./ladder";
import { scan, type Memory } from "./scan";
import { parseST, runST, StError } from "./st";
import { ladderToST } from "./translate";
import { lessons } from "@/data/lessons";
import { rigFor } from "@/rigs";

const st = (src: string, steps: Memory[], dt = 100) => {
  const prog = parseST(src);
  let mem: Memory = {};
  return steps.map((s) => (mem = runST(prog, { ...mem, ...s }, dt).memory));
};

describe("structured text", () => {
  it("assigns boolean expressions with IEC precedence", () => {
    const h = st("Run := (Start OR Run) AND NOT Stop;", [{ Start: true }, { Start: false }, { Stop: true }]);
    expect(h.map((m) => m.Run)).toEqual([true, true, false]);
  });

  it("runs IF, ELSIF, ELSE and CASE", () => {
    const src = `
      IF Level < 30 THEN Fill := TRUE;
      ELSIF Level >= 75 THEN Fill := FALSE;
      END_IF;
      CASE Step OF
        1: Light := 1;
        2, 3: Light := 2;
      ELSE Light := 0;
      END_CASE;`;
    const h = st(src, [{ Level: 20, Step: 1 }, { Level: 50, Step: 3 }, { Level: 80, Step: 9 }]);
    expect(h.map((m) => [m.Fill, m.Light])).toEqual([
      [true, 1],
      [true, 2],
      [false, 0],
    ]);
  });

  it("does integer and real arithmetic", () => {
    const h = st("Pct := Raw * 100 / 27648; Half := 7 / 2; R := 7 MOD 3; F := 1.5 * 2;", [{ Raw: 13824 }]);
    expect(h[0]).toMatchObject({ Pct: 50, Half: 3, R: 1, F: 3 });
  });

  it("runs TON with T# literals and reads .Q and .ET", () => {
    const src = "VAR T1 : TON; END_VAR\nT1(IN := Go, PT := T#300ms);\nDone := T1.Q;\nEt := T1.ET;";
    const h = st(src, [{ Go: true }, {}, {}, { Go: false }]);
    expect(h.map((m) => [m.Done, m.Et])).toEqual([
      [false, 100],
      [false, 200],
      [true, 300],
      [false, 0],
    ]);
  });

  it("counts edges with CTU and R_TRIG", () => {
    const src = "VAR C : CTU; E : R_TRIG; END_VAR\nE(CLK := Btn);\nC(CU := Btn, R := Rst, PV := 2);\nPulse := E.Q;";
    const h = st(src, [{ Btn: true }, { Btn: true }, { Btn: false }, { Btn: true }, { Rst: true }]);
    expect(h.map((m) => [m["C.ACC"], m["C.DN"], m.Pulse])).toEqual([
      [1, false, true],
      [1, false, false],
      [1, false, false],
      [2, true, true],
      [0, false, false],
    ]);
  });

  it("reports friendly errors with line numbers", () => {
    expect(() => parseST("A := ;")).toThrow(StError);
    expect(() => parseST("IF A THEN B := 1;")).toThrow(/END_IF/);
    expect(() => parseST("A := 1")).toThrow(/Line 1/);
  });
});

// Deterministic pseudo random numbers so failures repeat.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("every lesson behaves the same in ladder and in translated ST", () => {
  for (const lesson of lessons.filter((l) => !l.locked)) {
    it(lesson.id, () => {
      const rig = rigFor(lesson.rig);
      const ladder = parseProgram(lesson.code.join("\n"));
      const text = ladderToST(ladder);
      const prog = parseST(text);
      const holds = rig.controls.filter((c) => c.kind === "hold").map((c) => (c.kind === "hold" ? c.key : ""));
      const outputs = rig.tags.filter((t) => t.kind === "output").map((t) => t.tag);
      let pa = { ...rig.initial };
      let pb = { ...rig.initial };
      let ma: Memory = {};
      let mb: Memory = {};
      const rand = rng(7);
      for (let i = 0; i < 600; i++) {
        // Press a random button now and then, release it a little later.
        if (i % 7 === 0) {
          const patch: Record<string, boolean> = {};
          for (const k of holds) patch[k] = rand() < 0.25;
          pa = { ...pa, ...patch };
          pb = { ...pb, ...patch };
        }
        const options = lesson.rigOptions ?? {};
        ma = scan(ladder, { ...ma, ...rig.readInputs(pa, {}, options) }, 100).memory;
        mb = runST(prog, { ...mb, ...rig.readInputs(pb, {}, options) }, 100).memory;
        for (const o of outputs) expect(Boolean(mb[o]), `${o} at scan ${i}\n${text}`).toBe(Boolean(ma[o]));
        pa = rig.step(pa, {}, ma, 100);
        pb = rig.step(pb, {}, mb, 100);
      }
    });
  }
});
