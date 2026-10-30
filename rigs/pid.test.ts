import { describe, expect, it } from "vitest";
import { parseProgram } from "@/engine/ladder";
import { scan, type Memory } from "@/engine/scan";
import { PRO_PID } from "@/data/lessons/professional";
import { pid } from "./pid";
import type { PhysicalState } from "./types";

/** Runs a lesson's program on the rig, applying `act` each 0.1 s, and returns how many checkpoint steps were reached in order. */
function play(id: string, code: string[], act: (t: number, p: PhysicalState) => void, secs = 400) {
  const lesson = PRO_PID[id];
  const prog = parseProgram(code.join("\n"));
  let p: PhysicalState = { ...pid.initial };
  let mem: Memory = {};
  let reached = 0;
  const cp = lesson.checkpoint!.steps;
  for (let k = 0; k < secs * 10 && reached < cp.length; k++) {
    act(k / 10, p);
    const inputs = pid.readInputs(p, {}, {});
    mem = scan(prog, { ...mem, ...inputs }, 100).memory;
    p = pid.step(p, {}, mem, 100);
    if (cp[reached](mem, inputs, {})) reached++;
  }
  return reached;
}

const autoAt = (t0: number) => (t: number, p: PhysicalState) => {
  if (t >= t0) p.auto = true;
  p.startPressed = t >= t0 && t < t0 + 1;
};

describe("PID lessons on the loop rig", () => {
  it("p-pid-what reaches its checkpoint", () => {
    expect(play("p-pid-what", PRO_PID["p-pid-what"].code, autoAt(1))).toBe(2);
  });
  it("p-pid-block: hand, then bumpless auto onto setpoint", () => {
    expect(play("p-pid-block", PRO_PID["p-pid-block"].code, (t, p) => {
      p.handCv = 30;
      autoAt(10)(t, p);
    })).toBe(3);
  });
  it("p-pid-tune: the given tuning never settles, the suggested one does", () => {
    const code = PRO_PID["p-pid-tune"].code;
    expect(play("p-pid-tune", code, autoAt(1))).toBe(1);
    const tuned = code.map((l) => l.replace("MOV(8, LIC1.KP)", "MOV(4, LIC1.KP)").replace("MOV(5, LIC1.TI)", "MOV(120, LIC1.TI)"));
    expect(play("p-pid-tune", tuned, autoAt(1))).toBe(2);
  });
  it("p-pid-cascade reaches its checkpoint", () => {
    expect(play("p-pid-cascade", PRO_PID["p-pid-cascade"].code, autoAt(1))).toBe(2);
  });
});
