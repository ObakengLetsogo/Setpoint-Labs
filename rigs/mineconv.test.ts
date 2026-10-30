import { describe, expect, it } from "vitest";
import { parseProgram } from "@/engine/ladder";
import { scan, type Memory } from "@/engine/scan";
import { MINING } from "@/data/lessons/mining";
import { mineConveyor as rig } from "./mineconv";
import type { FaultState, PhysicalState } from "./types";

function play(id: string, act: (t: number, p: PhysicalState, f: FaultState) => void, secs: number, code = MINING[id].code) {
  const prog = parseProgram(code.join("\n"));
  const cp = MINING[id].checkpoint!.steps;
  let p: PhysicalState = { ...rig.initial };
  const f: FaultState = {};
  let mem: Memory = {};
  let reached = 0;
  for (let k = 0; k < secs * 10; k++) {
    act(k / 10, p, f);
    const inputs = rig.readInputs(p, f, {});
    mem = scan(prog, { ...mem, ...inputs }, 100).memory;
    p = rig.step(p, f, mem, 100);
    if (reached < cp.length && cp[reached](mem, inputs, f)) reached++;
  }
  return { reached, p, mem };
}
const tap = (t: number, s: number) => t >= s && t < s + 0.5;

describe("mining: crusher and conveyor chain", () => {
  it("n-conveyor-chain: siren, start order, empty stop, pull-wire trip", () => {
    const { reached, p } = play("n-conveyor-chain", (t, p) => {
      p.startPressed = tap(t, 1) || tap(t, 60);
      p.stopPressed = tap(t, 30);
      p.pw1Pulled = t > 80;
    }, 90);
    expect(reached).toBe(4);
    expect(p.spilled).toBe(0);
    expect(Number(p.chute)).toBeLessThan(1);
  });
  it("n-conveyor-chain: a slipping CV02 trips the chain before the chute blocks", () => {
    const { mem, p } = play("n-conveyor-chain", (t, p, f) => {
      p.startPressed = tap(t, 1);
      f.slip2 = true;
    }, 40);
    expect(mem.Trip).toBe(true);
    expect(Number(p.chute)).toBeLessThan(1);
  });
  it("n-crusher-feed: holds 80 A, then again on hard ore", () => {
    const { reached, p } = play("n-crusher-feed", (t, p) => {
      p.startPressed = tap(t, 1);
      p.hardness = t > 60 ? 1.5 : 1;
    }, 130);
    expect(reached).toBe(2);
    expect(p.crTrip).toBe(false);
  });
  it("n-crusher-feed: full feed on hard ore trips the crusher", () => {
    const code = MINING["n-crusher-feed"].code.map((l) => l.replace("XIC(Feeder_Run) PID(JIC1, Cr_Amps, 80, Feeder_Speed)", "MOV(100, Feeder_Speed)"));
    const { p } = play("n-crusher-feed", (t, p) => {
      p.startPressed = tap(t, 1);
      p.hardness = 1.5;
    }, 40, code);
    expect(p.crTrip).toBe(true);
  });
});
