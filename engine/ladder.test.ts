import { describe, expect, it } from "vitest";
import { LadderError, collectTags, parseProgram } from "./ladder";
import { scan, type Memory } from "./scan";

function run(source: string, steps: Array<{ set?: Memory; dt?: number }>, start: Memory = {}) {
  const program = parseProgram(source);
  let mem: Memory = { ...start };
  const history: Memory[] = [];
  for (const step of steps) {
    mem = scan(program, { ...mem, ...step.set }, step.dt ?? 100).memory;
    history.push(mem);
  }
  return history;
}

const SEAL_IN = "RUNG 1: XIC(Start) OR XIC(Run) AND XIO(Stop) OTE(Run)";

describe("parser", () => {
  it("reads left to right: (Start OR Run) AND NOT Stop", () => {
    const { rungs } = parseProgram(SEAL_IN);
    const logic = rungs[0].logic!;
    expect(logic.kind).toBe("series");
    if (logic.kind !== "series") return;
    expect(logic.children[0].kind).toBe("parallel");
    expect(logic.children[1]).toMatchObject({ kind: "contact", op: "XIO", tag: "Stop" });
  });

  it("treats side by side contacts as series", () => {
    const [h] = run("RUNG 1: XIC(A) XIC(B) OTE(Y)", [{ set: { A: true, B: true } }]);
    expect(h.Y).toBe(true);
  });

  it("respects brackets", () => {
    const src = "RUNG 1: XIC(A) OR (XIC(B) AND XIC(C)) OTE(Y)";
    expect(run(src, [{ set: { B: true } }])[0].Y).toBe(false);
    expect(run(src, [{ set: { B: true, C: true } }])[0].Y).toBe(true);
  });

  it("ignores comments and blank lines", () => {
    const { rungs } = parseProgram("// header\n\nRUNG 1: XIC(A) OTE(B) // trailing\n");
    expect(rungs).toHaveLength(1);
    expect(rungs[0].line).toBe(3);
  });

  it("reports friendly errors with line numbers", () => {
    expect(() => parseProgram("RUNG 1: XIC(A) OTE(B)\nRUNG 2: XIC(A)")).toThrowError(/Line 2: Every rung needs an output/);
    expect(() => parseProgram("RUNG 1: XIK(A) OTE(B)")).toThrowError(LadderError);
    expect(() => parseProgram("RUNG 1: (XIC(A) OTE(B)")).toThrowError(/never closed/);
    expect(() => parseProgram("XIC(A) OTE(B)")).toThrowError(/Start each rung/);
    expect(() => parseProgram("RUNG 1: XIC(A) TON(T1) ")).toThrowError(/needs a preset/);
  });

  it("collects every tag", () => {
    expect(collectTags(parseProgram(SEAL_IN)).sort()).toEqual(["Run", "Start", "Stop"]);
  });
});

describe("seal in", () => {
  it("latches on Start and drops on Stop", () => {
    const h = run(SEAL_IN, [
      { set: { Start: true } },
      { set: { Start: false } },
      { set: {} },
      { set: { Stop: true } },
      { set: { Stop: false } },
    ]);
    expect(h.map((m) => m.Run)).toEqual([true, true, true, false, false]);
  });

  it("Stop wins when both buttons are held", () => {
    const [h] = run(SEAL_IN, [{ set: { Start: true, Stop: true } }]);
    expect(h.Run).toBe(false);
  });
});

describe("scan order", () => {
  it("later rungs see values written earlier in the same scan", () => {
    const [h] = run("RUNG 1: XIC(A) OTE(B)\nRUNG 2: XIC(B) OTE(C)", [{ set: { A: true } }]);
    expect(h.C).toBe(true);
  });

  it("earlier rungs only see later writes on the next scan", () => {
    const h = run("RUNG 1: XIC(B) OTE(C)\nRUNG 2: XIC(A) OTE(B)", [{ set: { A: true } }, {}]);
    expect(h[0].C).toBe(false);
    expect(h[1].C).toBe(true);
  });
});

describe("latch and unlatch", () => {
  it("OTL holds until OTU", () => {
    const src = "RUNG 1: XIC(Set) OTL(Y)\nRUNG 2: XIC(Reset) OTU(Y)";
    const h = run(src, [{ set: { Set: true } }, { set: { Set: false } }, { set: { Reset: true } }]);
    expect(h.map((m) => m.Y)).toEqual([true, true, false]);
  });
});

describe("timers", () => {
  it("TON times up while enabled and resets when disabled", () => {
    const src = "RUNG 1: XIC(En) TON(T1, 300)\nRUNG 2: XIC(T1.DN) OTE(Y)";
    const h = run(src, [
      { set: { En: true } },
      { set: { En: true } },
      { set: { En: true } },
      { set: { En: false } },
    ]);
    expect(h.map((m) => m["T1.ACC"])).toEqual([100, 200, 300, 0]);
    expect(h.map((m) => m.Y)).toEqual([false, false, true, false]);
  });

  it("TOF holds DN for the preset after the rung goes false", () => {
    const src = "RUNG 1: XIC(En) TOF(T2, 200)";
    const h = run(src, [{ set: { En: true } }, { set: { En: false } }, {}, {}]);
    expect(h.map((m) => m["T2.DN"])).toEqual([true, true, false, false]);
  });
});

describe("counters and edges", () => {
  it("CTU counts rising edges only", () => {
    const src = "RUNG 1: XIC(Pulse) CTU(C1, 2)";
    const h = run(src, [
      { set: { Pulse: true } },
      { set: { Pulse: true } },
      { set: { Pulse: false } },
      { set: { Pulse: true } },
    ]);
    expect(h.map((m) => m["C1.ACC"])).toEqual([1, 1, 1, 2]);
    expect(h[3]["C1.DN"]).toBe(true);
  });

  it("RES clears a counter", () => {
    const src = "RUNG 1: XIC(Pulse) CTU(C1, 5)\nRUNG 2: XIC(Clear) RES(C1)";
    const h = run(src, [{ set: { Pulse: true } }, { set: { Pulse: false, Clear: true } }]);
    expect(h[1]["C1.ACC"]).toBe(0);
  });
});

describe("trace", () => {
  it("marks which contacts pass power", () => {
    const program = parseProgram(SEAL_IN);
    const { trace } = scan(program, { Start: true, Stop: false }, 100);
    const rung = trace[0];
    expect(rung.power).toBe(true);
    const contacts = Object.values(rung.nodes).filter((n) => n.value !== undefined);
    expect(contacts.map((c) => c.powerOut)).toEqual([true, false, true]);
  });
});

describe("lesson programs", async () => {
  const { lessons } = await import("../data/lessons");
  it.each(lessons.filter((l) => !l.locked).map((l) => [l.id, l.code.join("\n")]))("%s parses", (_id, src) => {
    expect(() => parseProgram(src)).not.toThrow();
  });

  it("seal-in lesson keeps the motor running after Start is released", () => {
    const src = lessons.find((l) => l.id === "foundations-3")!.code.join("\n");
    const h = run(src, [{ set: { Start_PB: true } }, { set: { Start_PB: false } }, { set: { Overload_OK: false } }], {
      Overload_OK: true,
    });
    expect(h.map((m) => m.Motor_Run)).toEqual([true, true, false]);
    expect(h[2].Fault_Lamp).toBe(true);
  });
});
