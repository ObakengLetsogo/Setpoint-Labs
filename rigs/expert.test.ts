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
