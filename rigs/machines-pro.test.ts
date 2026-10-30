import { describe, expect, it } from "vitest";
import { parseProgram } from "@/engine/ladder";
import { scan, type Memory } from "@/engine/scan";
import { PRO_MACHINES } from "@/data/lessons/professional";
import { pickPlace } from "./pneumatics";
import { vsd } from "./vsd";
import type { FaultState, PhysicalState, RigDef } from "./types";

/** Runs a lesson on a rig, calling `act` every 0.1 s, and returns the checkpoint steps reached in order. */
function play(rig: RigDef, id: string, act: (t: number, p: PhysicalState, f: FaultState) => void, secs = 60) {
  const prog = parseProgram(PRO_MACHINES[id].code.join("\n"));
  const cp = PRO_MACHINES[id].checkpoint!.steps;
  let p: PhysicalState = { ...rig.initial };
  const f: FaultState = {};
  let mem: Memory = {};
  let reached = 0;
  for (let k = 0; k < secs * 10 && reached < cp.length; k++) {
    act(k / 10, p, f);
    const inputs = rig.readInputs(p, f, {});
    mem = scan(prog, { ...mem, ...inputs }, 100).memory;
    p = rig.step(p, f, mem, 100);
    if (cp[reached](mem, inputs, f)) reached++;
  }
  return reached;
}

describe("Professional machine and drive lessons", () => {
  it("p-ep-machine: two cycles, a watchdog trip on a sticking B, then recovery", () => {
    const reached = play(pickPlace, "p-ep-machine", (t, p, f) => {
      p.startPressed = (t > 0.5 && t < 1) || (t > 30 && t < 30.5);
      f.stuckB = t > 8 && t < 20;
      p.stopPressed = t > 21 && t < 21.5;
    });
    expect(reached).toBe(3);
  });
  it("p-vsd-setup: the drive holds its minimum and maximum frequency", () => {
    const reached = play(vsd, "p-vsd-setup", (t, p) => {
      Object.assign(p, { ratedA: 7.5, minHz: 15, maxHz: 40, rampUp: 10, rampDown: 10 });
      p.startPressed = t < 0.5;
      p.pot = t < 15 ? 0 : 1;
    });
    expect(reached).toBe(2);
  });
  it("p-vsd-bus: runs over PROFINET, reports a fault in ZSW1 and acknowledges it", () => {
    const reached = play(vsd, "p-vsd-bus", (t, p, f) => {
      p.fieldbus = true;
      p.startPressed = (t > 0.2 && t < 0.7) || (t > 25 && t < 25.5);
      f.jam = t > 8 && t < 15;
      p.resetPressed = t > 18 && t < 18.5;
    });
    expect(reached).toBe(3);
  });
  it("p-vsd-bus does nothing until the drive listens to the fieldbus", () => {
    expect(play(vsd, "p-vsd-bus", (t, p) => {
      p.startPressed = t < 0.5;
    }, 10)).toBe(0);
  });
});
