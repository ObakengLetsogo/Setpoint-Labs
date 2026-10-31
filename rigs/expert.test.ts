import { describe, expect, it } from "vitest";
import { parseST, runST } from "@/engine/st";
import type { Memory } from "@/engine/scan";
import { EXPERT_PROGRAMMING as E } from "@/data/lessons/expert";
import { conveyor } from "./conveyors";
import { mixer, pumps } from "./process";
import { reversing } from "./starters";
import type { FaultState, PhysicalState, RigDef } from "./types";

function play(rig: RigDef, id: string, act: (t: number, p: PhysicalState, f: FaultState) => void, secs: number, src = E[id].st!.join("\n")) {
  const prog = parseST(src);
  const cp = E[id].checkpoint!.steps;
  let p: PhysicalState = { ...rig.initial };
  const f: FaultState = {};
  let mem: Memory = {};
  let reached = 0;
  for (let k = 0; k < secs * 10; k++) {
    act(k / 10, p, f);
    const inputs = rig.readInputs(p, f, {});
    mem = runST(prog, { ...mem, ...inputs }, 100).memory;
    p = rig.step(p, f, mem, 100);
    if (reached < cp.length && cp[reached](mem, inputs, f)) reached++;
  }
  return { reached, mem, p };
}
const tap = (t: number, s: number) => t >= s && t < s + 0.5;

describe("Expert programming lessons", () => {
  it("e-structure walks the PackML states", () => {
    expect(play(conveyor, "e-structure", (t, p) => {
      p.startPressed = tap(t, 1) || tap(t, 20);
      p.stopPressed = tap(t, 8);
      p.estopPressed = t > 25 && t < 27;
    }, 30).reached).toBe(4);
  });
  it("e-arrays fills the ring buffer and spots a slow feed", () => {
    const { reached, mem } = play(conveyor, "e-arrays", (t, p) => {
      p.startPressed = tap(t, 1);
      p.feed = !(t > 25 && t < 32);
    }, 45);
    expect(reached).toBe(2);
    expect(Number(mem.Idx)).toBeLessThan(5);
  });
  it("e-recipes runs recipe 2, logs it, then recipe 1", () => {
    const one = E["e-recipes"].st!.join("\n").replace("Recipe := 2;", "Recipe := 1;");
    const a = play(mixer, "e-recipes", (t, p) => {
      p.startPressed = tap(t, 1);
    }, 40);
    expect(a.reached).toBe(1);
    expect(Number(a.mem["Log[0]"])).toBeGreaterThan(10000);
    const b = play(mixer, "e-recipes", (t, p) => {
      p.startPressed = tap(t, 1) || tap(t, 40);
    }, 80, one);
    expect(b.reached).toBe(2);
  });
  it("e-testing finds no violations in a correct program, and catches a broken one", () => {
    const act = (t: number, p: PhysicalState) => {
      p.fwdPressed = tap(t, 1);
      p.stopPressed = tap(t, 8);
      p.revPressed = tap(t, 15);
      if (t > 22) {
        p.fwdPressed = t > 22 && t < 23;
        p.revPressed = t > 22 && t < 23;
      }
    };
    expect(play(reversing, "e-testing", act, 50).reached).toBe(3);
    const broken = E["e-testing"].st!.join("\n").replace("KF_Fwd := Fwd_Run AND NOT KR_Rev;", "KF_Fwd := Fwd_Run OR Fwd_PB;").replace("KR_Rev := Rev_Run AND NOT KF_Fwd;", "KR_Rev := Rev_Run OR Rev_PB;");
    const { mem } = play(reversing, "e-testing", (t, p) => {
      p.fwdPressed = tap(t, 1);
      p.revPressed = tap(t, 1);
    }, 5, broken);
    expect(Number(mem.Violations)).toBeGreaterThan(0);
  });
  it("e-diagnostics keeps the first-out through a cascade", () => {
    const { reached, mem } = play(pumps, "e-diagnostics", (t, p, f) => {
      p.startPressed = tap(t, 1);
      f.p1Trip = t > 5 && t < 15;
      f.p2Trip = t > 8 && t < 15;
      p.ackPressed = tap(t, 16);
    }, 20);
    expect(reached).toBe(3);
    expect(mem["Ev[0]"]).toBe(1);
    expect(mem["Ev[1]"]).toBe(2);
  });
});

import { EXPERT_PLANT as P } from "@/data/lessons/expert";
import { parseProgram } from "@/engine/ladder";
import { scan } from "@/engine/scan";
import { plantNet } from "./plantnet";

function playP(rig: RigDef, id: string, act: (t: number, p: PhysicalState, f: FaultState) => void, secs: number) {
  const l = P[id];
  const st = l.stOnly ? parseST(l.st!.join("\n")) : null;
  const ld = l.stOnly ? null : parseProgram(l.code.join("\n"));
  let p: PhysicalState = { ...rig.initial };
  const f: FaultState = {};
  let mem: Memory = {};
  let reached = 0;
  for (let k = 0; k < secs * 10; k++) {
    act(k / 10, p, f);
    const inputs = rig.readInputs(p, f, {});
    mem = st ? runST(st, { ...mem, ...inputs }, 100).memory : scan(ld!, { ...mem, ...inputs }, 100).memory;
    p = rig.step(p, f, mem, 100);
    if (reached < l.checkpoint!.steps.length && l.checkpoint!.steps[reached](mem, inputs, f)) reached++;
  }
  return { reached, mem, p };
}

describe("Expert plant systems lessons", () => {
  it("e-architecture: local control with supervision and counts", () => {
    expect(playP(plantNet, "e-architecture", (t, p) => {
      p.scadaStart = tap(t, 1);
    }, 90).reached).toBe(2);
  });
  it("e-dcs: one template for both pumps", () => {
    expect(playP(pumps, "e-dcs", (t, p, f) => {
      p.startPressed = tap(t, 1);
      f.p1Trip = t > 8;
    }, 60).reached).toBe(3);
  });
  it("e-batch: hold and restart finishes the batch", () => {
    const { reached, mem } = playP(mixer, "e-batch", (t, p) => {
      p.startPressed = tap(t, 1) || tap(t, 9);
      p.stopPressed = tap(t, 5);
    }, 40);
    expect(reached).toBe(2);
    expect(mem.Held).toBe(false);
  });
  it("e-alarm-mgmt: priorities, horn, suppression, acknowledgement", () => {
    expect(playP(pumps, "e-alarm-mgmt", (t, p, f) => {
      p.startPressed = tap(t, 1);
      f.p1Trip = t > 3;
      f.p2Trip = t > 3;
      p.inflow = 1;
      p.ackPressed = tap(t, 20);
    }, 30).reached).toBe(3);
  });
  it("e-historian: samples, compresses and summarises", () => {
    const { reached, mem } = playP(pumps, "e-historian", (t, p) => {
      p.startPressed = tap(t, 1);
      p.stopPressed = tap(t, 40);
      if (t > 40) p.inflow = 0;
    }, 120);
    expect(reached).toBe(2);
    expect(Number(mem.Hi)).toBeGreaterThanOrEqual(Number(mem.Avg));
    expect(Number(mem.Avg)).toBeGreaterThanOrEqual(Number(mem.Lo));
  });
});

import { EXPERT_PROJECTS as J, EXPERT_UPGRADES as U } from "@/data/lessons/expert";
import { legacy } from "./legacy";

function playL(rig: RigDef, lesson: (typeof U)[string], act: (t: number, p: PhysicalState, f: FaultState) => void, secs: number, code?: string[]) {
  const st = lesson.stOnly ? parseST(lesson.st!.join("\n")) : null;
  const ld = lesson.stOnly ? null : parseProgram((code ?? lesson.code).join("\n"));
  let p: PhysicalState = { ...rig.initial };
  const f: FaultState = {};
  let mem: Memory = {};
  let reached = 0;
  for (let k = 0; k < secs * 10; k++) {
    act(k / 10, p, f);
    const inputs = rig.readInputs(p, f, {});
    mem = st ? runST(st, { ...mem, ...inputs }, 100).memory : scan(ld!, { ...mem, ...inputs }, 100).memory;
    p = rig.step(p, f, mem, 100);
    if (reached < lesson.checkpoint!.steps.length && lesson.checkpoint!.steps[reached](mem, inputs, f)) reached++;
  }
  return { reached, mem, p };
}
const hold = (t: number, s: number, d = 1) => t >= s && t < s + d;

describe("Expert upgrade and project lessons", () => {
  it("e-upg-why counts failures, downtime and its cost", () => {
    expect(playL(legacy, U["e-upg-why"], (t, p, f) => {
      p.startPressed = hold(t, 6);
      f.oldFail = t > 9;
    }, 20).reached).toBe(2);
  });
  it("e-upg-audit finds the hidden guard delay", () => {
    expect(playL(legacy, U["e-upg-audit"], (t, p) => {
      p.startPressed = hold(t, 6) || hold(t, 14);
      p.stopPressed = hold(t, 9);
      p.guardOpen = t > 11 && t < 13.5;
    }, 20).reached).toBe(2);
  });
  const scenario = (t: number, p: PhysicalState) => {
    p.cutover = 1;
    p.startPressed = hold(t, 6) || hold(t, 14) || hold(t, 22.5) || hold(t, 29);
    p.stopPressed = hold(t, 10);
    p.guardOpen = t > 18 && t < 22;
  };
  it("e-upg-map matches the old PLC in shadow, with the hidden rule", () => {
    const { reached, p } = playL(legacy, U["e-upg-map"], scenario, 50);
    expect(reached).toBe(2);
    expect(p.mismatches).toBe(0);
  });
  it("e-upg-map without the hidden rule shows a mismatch", () => {
    const code = U["e-upg-map"].code.map((l) => l.replace("XIC(Start_PB) XIC(Guard_T.DN)", "XIC(Start_PB)"));
    expect(Number(playL(legacy, U["e-upg-map"], scenario, 50, code).p.mismatches)).toBeGreaterThan(0);
  });
  it("e-upg-plan covers all four cases with no mismatches", () => {
    expect(playL(legacy, U["e-upg-plan"], scenario, 50).reached).toBe(1);
  });
  it("e-upg-cutover: prove, cut over, hand over", () => {
    expect(playL(legacy, U["e-upg-cutover"], (t, p, f) => {
      p.cutover = t < 25 ? 1 : 2;
      p.startPressed = hold(t, 26);
      f.oldFail = t > 32;
    }, 40).reached).toBe(3);
  });
  it("e-fat-sat runs its test script to the end", () => {
    expect(playL(conveyor, J["e-fat-sat"], (t, p, f) => {
      p.startPressed = hold(t, 1, 0.5) || hold(t, 6, 0.5) || hold(t, 12, 0.5) || hold(t, 25, 0.5);
      p.stopPressed = hold(t, 3, 0.5);
      p.estopPressed = t > 8 && t < 10;
      f.jam = t > 13 && t < 22;
    }, 30).reached).toBe(2);
  });
  it("e-quoting calculates a quote", () => {
    const st = J["e-quoting"].st!.join("\n").replace("IO_Count := 12;", "IO_Count := 24;");
    const m = runST(parseST(st), {}, 100).memory;
    expect(Number(m.Quote)).toBeGreaterThan(0);
    expect(m.IO_Count).toBe(24);
  });
});
