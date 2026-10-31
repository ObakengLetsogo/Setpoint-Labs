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

import { dewater, ventFan, winder } from "./minesvc";
import type { RigDef } from "./types";

function playOn(rigDef: RigDef, id: string, act: (t: number, p: PhysicalState, f: FaultState) => void, secs: number, code = MINING[id].code) {
  const prog = parseProgram(code.join("\n"));
  const cp = MINING[id].checkpoint!.steps;
  let p: PhysicalState = { ...rigDef.initial };
  const f: FaultState = {};
  let mem: Memory = {};
  let reached = 0;
  for (let k = 0; k < secs * 10; k++) {
    act(k / 10, p, f);
    const inputs = rigDef.readInputs(p, f, {});
    mem = scan(prog, { ...mem, ...inputs }, 100).memory;
    p = rigDef.step(p, f, mem, 100);
    if (reached < cp.length && cp[reached](mem, inputs, f)) reached++;
  }
  return { reached, p, mem };
}

describe("mining: services", () => {
  it("n-dewatering: duty pump, run-dry trip, standby, rising water", () => {
    const { reached, p } = playOn(dewater, "n-dewatering", (t, p, f) => {
      p.startPressed = tap(t, 1);
      f.noPrime1 = t > 2;
      p.inflow = t > 40 ? 1 : 0.6;
    }, 120);
    expect(reached).toBe(4);
    // One pump against full inflow loses: the alarm is there so people act before the sump floods.
    expect(Number(p.level)).toBeGreaterThan(0.5);
  });
  it("n-dewatering: the rising water alarm comes before the high-high float", () => {
    let alarmFirst: boolean | null = null;
    const prog = parseProgram(MINING["n-dewatering"].code.join("\n"));
    let p: PhysicalState = { ...dewater.initial };
    const f: FaultState = {};
    let mem: Memory = {};
    for (let k = 0; k < 1200 && alarmFirst === null; k++) {
      const t = k / 10;
      p.startPressed = tap(t, 1);
      f.noPrime1 = t > 2;
      p.inflow = t > 40 ? 1 : 0.6;
      const inputs = dewater.readInputs(p, f, {});
      mem = scan(prog, { ...mem, ...inputs }, 100).memory;
      p = dewater.step(p, f, mem, 100);
      if (t > 40 && mem.Rise_Alarm) alarmFirst = !inputs.LS_HighHigh;
      else if (t > 40 && inputs.LS_HighHigh) alarmFirst = false;
    }
    expect(alarmFirst).toBe(true);
  });
  it("n-ventilation: section power, bearing warning and trip, gas lockout", () => {
    expect(playOn(ventFan, "n-ventilation", (t, p, f) => {
      p.startPressed = tap(t, 1);
      f.bearing = t > 15;
    }, 120).reached).toBe(4);
  });
  it("n-hoist: fast, creep, stop at the tip; overwind on a failed slow-down switch", () => {
    const { reached, p } = playOn(winder, "n-hoist", (t, p, f) => {
      p.call3 = tap(t, 1) || tap(t, 20);
      p.call1 = tap(t, 10);
      f.slowFail = t > 15;
    }, 40);
    expect(reached).toBe(3);
    expect(Number(p.carY)).toBeLessThan(2.3);
  });
  it("n-hoist: with healthy switches the skip stops at the tip without overwinding", () => {
    const { p } = playOn(winder, "n-hoist", (t, p) => {
      p.call3 = tap(t, 1);
    }, 15);
    expect(Math.abs(Number(p.carY) - 2)).toBeLessThan(0.03);
    expect(p.overwound).toBe(false);
  });
});
