import { describe, expect, it } from "vitest";
import { parseProgram } from "@/engine/ladder";
import { scan, type Memory } from "@/engine/scan";
import { PRO_MOTORS } from "@/data/lessons/professional";
import { mcc } from "./mcc";
import type { FaultState, PhysicalState } from "./types";

function play(id: string, act: (t: number, p: PhysicalState, f: FaultState) => void, secs = 200) {
  const prog = parseProgram(PRO_MOTORS[id].code.join("\n"));
  const cp = PRO_MOTORS[id].checkpoint!.steps;
  let p: PhysicalState = { ...mcc.initial };
  const f: FaultState = {};
  let mem: Memory = {};
  let reached = 0;
  for (let k = 0; k < secs * 10 && reached < cp.length; k++) {
    act(k / 10, p, f);
    const inputs = mcc.readInputs(p, f, {});
    mem = scan(prog, { ...mem, ...inputs }, 100).memory;
    p = mcc.step(p, f, mem, 100);
    if (cp[reached](mem, inputs, f)) reached++;
  }
  return { reached, mem, p };
}
const tap = (t: number, at: number) => t >= at && t < at + 0.5;

describe("motor management lessons on the MCC", () => {
  it("p-soft-starter: the default settings start hard; tuned settings pass", () => {
    expect(play("p-soft-starter", (t, p) => (p.startPressed = tap(t, 0.2)), 20).reached).toBe(0);
    const { reached } = play("p-soft-starter", (t, p) => {
      Object.assign(p, { ssRamp: 10, ssInit: 30, ssLimit: 3.5, ssStop: 10 });
      p.startPressed = tap(t, 0.2);
      p.stopPressed = tap(t, 20);
    }, 40);
    expect(reached).toBe(2);
  });
  it("p-mpr: warn, overload trip, cool, reset and run", () => {
    const { reached } = play("p-mpr", (t, p) => {
      p.load2 = t < 45 ? 1.4 : 0.6;
      p.startPressed = tap(t, 0.2) || tap(t, 120);
      p.resetPressed = tap(t, 110);
    });
    expect(reached).toBe(3);
  });
  it("p-mpr refuses to reset an earth fault", () => {
    const { p } = play("p-mpr", (t, p, f) => {
      f.earthFault = t > 3;
      p.startPressed = tap(t, 0.2);
      p.resetPressed = tap(t, 10);
    }, 15);
    expect(p.trip).toBe(3);
  });
  it("p-mcc: unavailable, fail to start, then a proved run", () => {
    const { reached } = play("p-mcc", (t, p, f) => {
      p.f2Remote = !(t > 1 && t < 3);
      f.contactorFail = t < 10;
      p.startPressed = tap(t, 4) || tap(t, 12);
      p.resetPressed = tap(t, 11);
    }, 20);
    expect(reached).toBe(3);
  });
  it("p-energy: counts energy, then stops an idle belt", () => {
    const { reached } = play("p-energy", (t, p) => {
      p.load2 = t < 90 ? 0.7 : 0.1;
      p.startPressed = tap(t, 0.2);
    }, 150);
    expect(reached).toBe(2);
  });
});
