import { describe, expect, it } from "vitest";
import { parseProgram } from "@/engine/ladder";
import { scan, type Memory } from "@/engine/scan";
import { INITIAL_PHYSICAL, NO_FAULTS, readInputs, stepPhysics, type Faults, type Physical, type RigOptions } from "@/rigs/motorStarter";
import { lessons } from "./index";

/** Runs a lesson program against the simulated bench, like the store does, and checks its checkpoint. */
function bench(id: string) {
  const lesson = lessons.find((l) => l.id === id)!;
  const program = parseProgram(lesson.code.join("\n"));
  const options: RigOptions = lesson.rigOptions ?? {};
  let physical: Physical = { ...INITIAL_PHYSICAL };
  let faults: Faults = { ...NO_FAULTS };
  let memory: Memory = {};
  let step = 0;
  const steps = lesson.checkpoint?.steps ?? [];
  const run = (ms: number, patch: Partial<Physical> = {}, fault: Partial<Faults> = {}) => {
    physical = { ...physical, ...patch };
    faults = { ...faults, ...fault };
    for (let t = 0; t < ms; t += 100) {
      const inputs = readInputs(physical, faults, options);
      memory = scan(program, { ...memory, ...inputs }, 100).memory;
      physical = stepPhysics(physical, faults, memory, 100);
      if (steps[step]?.(memory, inputs, { ...faults })) step++;
    }
    return memory;
  };
  return { run, done: () => steps.length > 0 && step >= steps.length, mem: () => memory, phys: () => physical };
}

const tap = (b: ReturnType<typeof bench>, key: "startPressed" | "stopPressed" | "auxPressed") => {
  b.run(300, { [key]: true });
  b.run(300, { [key]: false });
};

describe("foundations lessons pass their own checkpoints", () => {
  it("every open lesson parses and has a checkpoint", () => {
    for (const l of lessons.filter((x) => !x.locked)) {
      expect(() => parseProgram(l.code.join("\n")), l.id).not.toThrow();
      expect(l.checkpoint, l.id).toBeDefined();
    }
  });

  it("symbols", () => {
    const b = bench("f-symbols");
    tap(b, "auxPressed");
    tap(b, "stopPressed");
    b.run(2500, { startPressed: true });
    expect(b.done()).toBe(true);
  });

  it("scan order", () => {
    const b = bench("f-scan");
    b.run(300, { startPressed: true });
    expect(b.done()).toBe(true);
  });

  it("latch and unlatch", () => {
    const b = bench("f-latch");
    tap(b, "startPressed");
    expect(b.mem().Motor_Run).toBe(true);
    tap(b, "stopPressed");
    expect(b.done()).toBe(true);
  });

  it("jog", () => {
    const b = bench("f-jog");
    b.run(500, { auxPressed: true });
    expect(b.mem().Motor_Run).toBe(true);
    b.run(300, { auxPressed: false });
    expect(b.mem().Motor_Run).toBe(false);
    expect(b.done()).toBe(true);
  });

  it("on-delay start warning", () => {
    const b = bench("f-ton");
    tap(b, "startPressed");
    expect(b.mem().Beacon).toBe(true);
    expect(b.mem().Motor_Run).toBe(false);
    b.run(3000);
    expect(b.mem().Motor_Run).toBe(true);
    expect(b.done()).toBe(true);
  });

  it("off-delay coast lamp", () => {
    const b = bench("f-tof");
    tap(b, "startPressed");
    tap(b, "stopPressed");
    expect(b.mem().Run_Lamp).toBe(true);
    b.run(5500);
    expect(b.mem().Run_Lamp).toBe(false);
    expect(b.done()).toBe(true);
  });

  it("alarm flash, acknowledge, clear", () => {
    const b = bench("f-flasher");
    b.run(300, { overloadTripped: true });
    const seen = new Set<boolean>();
    for (let i = 0; i < 12; i++) seen.add(Boolean(b.run(100).Fault_Lamp));
    expect(seen).toEqual(new Set([true, false]));
    tap(b, "auxPressed");
    expect(b.mem().Beacon).toBe(false);
    b.run(1000, { overloadTripped: false, heat: 0 });
    expect(b.done()).toBe(true);
  });

  it("counters", () => {
    const b = bench("f-counters");
    for (let i = 0; i < 5; i++) {
      tap(b, "startPressed");
      tap(b, "stopPressed");
    }
    expect(b.mem().Beacon).toBe(true);
    tap(b, "auxPressed");
    expect(b.done()).toBe(true);
  });

  it("compare trips a jammed motor before the thermal overload", () => {
    const b = bench("f-compare");
    tap(b, "startPressed");
    b.run(4000);
    expect(b.mem().High_Trip).toBeFalsy();
    b.run(3000, {}, { jam: true });
    expect(b.mem().High_Trip).toBe(true);
    expect(b.phys().overloadTripped).toBe(false);
    expect(b.done()).toBe(true);
  });

  it("edge toggle", () => {
    const b = bench("f-edge");
    tap(b, "auxPressed");
    expect(b.mem().Motor_Run).toBe(true);
    tap(b, "auxPressed");
    expect(b.mem().Motor_Run).toBe(false);
    expect(b.done()).toBe(true);
  });

  it("e-stop latch and reset", () => {
    const b = bench("f-estop");
    tap(b, "startPressed");
    b.run(300, { estopPressed: true });
    b.run(300, { estopPressed: false });
    tap(b, "startPressed");
    expect(b.mem().Motor_Run).toBe(false);
    tap(b, "auxPressed");
    tap(b, "startPressed");
    expect(b.done()).toBe(true);
  });

  it("safe stop with a normally closed stop", () => {
    const b = bench("f-safe-stop");
    tap(b, "startPressed");
    expect(b.mem().Motor_Run).toBe(true);
    b.run(300, {}, { brokenStop: true });
    expect(b.mem().Motor_Run).toBe(false);
    expect(b.done()).toBe(true);
  });

  it("first three lessons", () => {
    const one = bench("foundations-1");
    one.run(300, { startPressed: true });
    expect(one.done()).toBe(true);
    const two = bench("foundations-2");
    tap(two, "startPressed");
    expect(two.done()).toBe(true);
    const three = bench("foundations-3");
    tap(three, "startPressed");
    three.run(500, { overloadTripped: true });
    expect(three.done()).toBe(true);
  });
});
