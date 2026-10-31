import { describe, expect, it } from "vitest";
import { parseProgram } from "@/engine/ladder";
import { scan, type Memory } from "@/engine/scan";
import { EXPERT_NETWORKS as N } from "@/data/lessons/expert";
import { plantNet as rig } from "./plantnet";
import type { FaultState, PhysicalState } from "./types";

function play(id: string, act: (t: number, p: PhysicalState, f: FaultState) => void, secs: number) {
  const prog = parseProgram(N[id].code.join("\n"));
  const cp = N[id].checkpoint!.steps;
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
  return { reached, mem, p };
}
const tap = (t: number, s: number) => t >= s && t < s + 0.5;

describe("Expert network lessons", () => {
  it("e-remote-io: the heartbeat catches a gateway that lies", () => {
    const { reached, p } = play("e-remote-io", (t, p, f) => {
      p.startPressed = tap(t, 1);
      f.staleOK = t > 4;
    }, 60);
    expect(reached).toBe(2);
    expect(p.overflowed).toBe(0);
  });
  it("e-remote-io without the heartbeat check would overflow the reservoir", () => {
    const code = N["e-remote-io"].code.map((l) => l.replace("XIC(HB_T.DN) OR XIO(RIO2_OK)", "XIO(RIO2_OK)"));
    const prog = parseProgram(code.join("\n"));
    let p: PhysicalState = { ...rig.initial, demand: 0.2 };
    const f: FaultState = {};
    let mem: Memory = {};
    for (let k = 0; k < 900; k++) {
      p.startPressed = tap(k / 10, 1);
      f.staleOK = k > 40;
      mem = scan(prog, { ...mem, ...rig.readInputs(p, f, {}) }, 100).memory;
      p = rig.step(p, f, mem, 100);
    }
    expect(Number(p.overflowed)).toBeGreaterThan(0);
  });
  it("e-opcua: runs from SCADA and rejects an out of range setpoint", () => {
    const { reached, mem } = play("e-opcua", (t, p) => {
      p.scadaStart = tap(t, 1);
      p.scadaSp = t > 20 ? 120 : 70;
    }, 30);
    expect(reached).toBe(2);
    expect(mem.Fill_SP).toBe(70);
  });
  it("e-cyber: locks out a rogue writer, and only a key on site resets it", () => {
    const { reached, mem } = play("e-cyber", (t, p, f) => {
      f.rogue = t > 2 && t < 30;
      p.keyOn = t > 32;
      p.startPressed = tap(t, 35);
    }, 40);
    expect(reached).toBe(2);
    expect(Number(mem.Fill_SP)).toBeLessThanOrEqual(100);
  });
  it("e-remote-access: no key, no session; with the key it opens and expires", () => {
    expect(play("e-remote-access", (t, p) => {
      p.remoteReq = (t > 1 && t < 3) || t > 5;
      p.keyOn = t > 4;
    }, 45).reached).toBe(3);
  });
});
