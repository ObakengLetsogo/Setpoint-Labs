import { describe, expect, it } from "vitest";
import { parseProgram } from "@/engine/ladder";
import { scan, type Memory } from "@/engine/scan";
import { PRO_SAFETY } from "@/data/lessons/professional";
import { safety } from "./safety";
import type { FaultState, PhysicalState } from "./types";

type Act = (t: number, p: PhysicalState, f: FaultState) => void;
function play(id: string, act: Act, secs = 60, code = PRO_SAFETY[id].code) {
  const prog = parseProgram(code.join("\n"));
  const cp = PRO_SAFETY[id].checkpoint!.steps;
  let p: PhysicalState = { ...safety.initial };
  const f: FaultState = {};
  let mem: Memory = {};
  let reached = 0;
  for (let k = 0; k < secs * 10 && reached < cp.length; k++) {
    act(k / 10, p, f);
    const inputs = safety.readInputs(p, f, {});
    mem = scan(prog, { ...mem, ...inputs }, 100).memory;
    p = safety.step(p, f, mem, 100);
    if (cp[reached](mem, inputs, f)) reached++;
  }
  return { reached, mem, p };
}
const at = (t: number, s: number) => t >= s && t < s + 0.5;
/** Reset at s, start half a second later. */
const restart = (t: number, p: PhysicalState, s: number) => {
  if (at(t, s)) p.resetPressed = true;
  if (at(t, s + 1)) p.startPressed = true;
};
const clearButtons = (p: PhysicalState) => {
  p.resetPressed = false;
  p.startPressed = false;
};

describe("safety lessons on the guarded cell", () => {
  it("p-safe-law: the door stops it, a reset and start restart it", () => {
    expect(play("p-safe-law", (t, p) => {
      clearButtons(p);
      restart(t, p, 1);
      p.doorOpen = t > 6 && t < 10;
      restart(t, p, 11);
    }).reached).toBe(3);
  });
  it("p-safe-law: closing the door alone never restarts the machine", () => {
    const { p } = play("p-safe-law", (t, p) => {
      clearButtons(p);
      restart(t, p, 1);
      p.doorOpen = t > 6 && t < 10;
    }, 20);
    expect(p.speed).toBe(0);
    // Opening the door on a moving machine exposes the person while it runs down: the case for guard locking.
    expect(p.exposures).toBe(1);
  });
  it("p-safe-relay: E-stop, shorted channel, welded contactor, recovery", () => {
    expect(play("p-safe-relay", (t, p, f) => {
      clearButtons(p);
      restart(t, p, 1);
      p.estopPressed = (t > 5 && t < 8) || (t > 14 && t < 18) || (t > 25 && t < 28);
      restart(t, p, 9);
      f.esShort = t > 12 && t < 16;
      f.weldK2 = t > 22 && t < 32;
      if (at(t, 29)) p.resetPressed = true;
      restart(t, p, 33);
    }).reached).toBe(4);
  });
  it("p-safe-guards: measures the stop and the safe distance", () => {
    const { reached, mem } = play("p-safe-guards", (t, p) => {
      clearButtons(p);
      restart(t, p, 1);
      p.handInCurtain = t > 8 && t < 12;
    }, 20);
    expect(reached).toBe(2);
    expect(Number(mem.Safe_mm)).toBeGreaterThan(1800);
    expect(Number(mem.Safe_mm)).toBeLessThan(2400);
  });
  it("p-fplc-basics: discrepancy caught and cleared", () => {
    expect(play("p-fplc-basics", (t, p, f) => {
      clearButtons(p);
      restart(t, p, 1);
      f.esShort = t > 5 && t < 9;
      p.estopPressed = t > 6 && t < 11;
      restart(t, p, 12);
    }).reached).toBe(3);
  });
  it("p-fplc-validate: the whole validation list in order", () => {
    expect(play("p-fplc-validate", (t, p, f) => {
      clearButtons(p);
      restart(t, p, 1);
      p.estopPressed = (t > 5 && t < 7) || (t > 22 && t < 24) || (t > 29 && t < 31);
      restart(t, p, 8);
      p.doorOpen = t > 11 && t < 13.5;
      restart(t, p, 14);
      p.handInCurtain = t > 17 && t < 19.5;
      restart(t, p, 20);
      f.esShort = t > 21 && t < 23.5;
      restart(t, p, 25);
      f.weldK2 = t > 28 && t < 34;
      if (at(t, 32)) p.resetPressed = true;
      restart(t, p, 35);
    }, 50).reached).toBe(6);
  });
  it("p-sto: SS1 stops under control before STO", () => {
    expect(play("p-sto", (t, p) => {
      clearButtons(p);
      restart(t, p, 2);
      p.doorOpen = t > 8 && t < 12;
    }, 20).reached).toBe(2);
  });
  it("p-sto: an SS1 time that is too short lets the machine coast", () => {
    const short = PRO_SAFETY["p-sto"].code.map((l) => l.replace("TON(SS1_T, 1500)", "TON(SS1_T, 300)"));
    const { p } = play("p-sto", (t, p) => {
      clearButtons(p);
      restart(t, p, 2);
      p.doorOpen = t > 8 && t < 12;
    }, 14, short);
    expect(p.coast).toBe(true);
  });
});
