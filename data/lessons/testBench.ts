import { parseProgram } from "@/engine/ladder";
import { scan, type Memory } from "@/engine/scan";
import { rigFor } from "@/rigs";
import type { PhysicalState, RigOptions } from "@/rigs/types";
import { lessons } from "./index";

/** Runs a lesson program against its simulated rig, like the store does, and checks its checkpoint. */
export function bench(id: string) {
  const lesson = lessons.find((l) => l.id === id)!;
  const rig = rigFor(lesson.rig);
  const program = parseProgram(lesson.code.join("\n"));
  const options: RigOptions = lesson.rigOptions ?? {};
  let physical: PhysicalState = { ...rig.initial };
  let faults: Record<string, boolean> = {};
  let memory: Memory = {};
  let step = 0;
  const steps = lesson.checkpoint?.steps ?? [];
  const run = (ms: number, patch: PhysicalState = {}, fault: Record<string, boolean> = {}) => {
    physical = { ...physical, ...patch };
    faults = { ...faults, ...fault };
    for (let t = 0; t < ms; t += 100) {
      const inputs = rig.readInputs(physical, faults, options);
      memory = scan(program, { ...memory, ...inputs }, 100).memory;
      physical = rig.step(physical, faults, memory, 100);
      if (steps[step]?.(memory, inputs, { ...faults })) step++;
    }
    return memory;
  };
  return { run, done: () => steps.length > 0 && step >= steps.length, mem: () => memory, phys: () => physical };
}

export const tap = (b: ReturnType<typeof bench>, key: string) => {
  b.run(300, { [key]: true });
  b.run(300, { [key]: false });
};

