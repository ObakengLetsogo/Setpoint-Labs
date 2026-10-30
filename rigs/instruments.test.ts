import { describe, expect, it } from "vitest";
import { parseProgram } from "@/engine/ladder";
import { scan, type Memory } from "@/engine/scan";
import { PRO_INSTRUMENTS } from "@/data/lessons/professional";
import { instruments } from "./instruments";
import type { FaultState, PhysicalState } from "./types";

/** Applies each stage's settings for a few scans and counts the checkpoint steps reached in order. */
function play(id: string, stages: { p?: PhysicalState; f?: FaultState }[], code = PRO_INSTRUMENTS[id].code) {
  const prog = parseProgram(code.join("\n"));
  const cp = PRO_INSTRUMENTS[id].checkpoint!.steps;
  let p: PhysicalState = { ...instruments.initial };
  let f: FaultState = {};
  let mem: Memory = {};
  let reached = 0;
  for (const s of stages) {
    p = { ...p, ...s.p };
    f = { ...f, ...s.f };
    for (let k = 0; k < 5; k++) {
      const inputs = instruments.readInputs(p, f, {});
      mem = scan(prog, { ...mem, ...inputs }, 100).memory;
      if (reached < cp.length && cp[reached](mem, inputs, f)) reached++;
    }
  }
  return { reached, mem };
}

describe("instrumentation lessons on the bench", () => {
  it("p-inst-tx scales and catches both faults", () => {
    const { reached, mem } = play("p-inst-tx", [{ p: { temp: 100 } }, { f: { ftOpen: true } }, { f: { rtdBreak: true } }]);
    expect(reached).toBe(3);
    expect(mem.Fault_Lamp).toBe(true);
  });
  it("p-inst-tx reads 4 bar as 40 tenths", () => {
    expect(play("p-inst-tx", [{}]).mem.Press_dBar).toBe(40);
  });
  it("p-inst-cal walks the five points", () => {
    expect(play("p-inst-cal", [4, 8, 12, 16, 20].map((mA) => ({ p: { calSource: true, calmA: mA } }))).reached).toBe(5);
  });
  it("p-inst-hart keeps the reading through a re-range and catches the sensor fault", () => {
    const { reached, mem } = play("p-inst-hart", [{ p: { ptUrv: 16 } }, { f: { ptSensor: true } }]);
    expect(reached).toBe(2);
    expect(mem.Fault_Lamp).toBe(true);
    const fixed = PRO_INSTRUMENTS["p-inst-hart"].code.map((l) => l.replace("MUL(PT_Raw, PT_URV, T_P)", "MUL(PT_Raw, 100, T_P)"));
    expect(play("p-inst-hart", [{ p: { ptUrv: 16 } }], fixed).mem.Press_dBar).toBe(25);
    expect(play("p-inst-hart", [{ p: { ptUrv: 16 } }]).mem.Press_dBar).toBe(40);
  });
});
