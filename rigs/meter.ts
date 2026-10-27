// What a voltmeter would read on a rig's control wiring. Every point sits at 24 V or 0 V, worked
// out from the PLC's view of its inputs and outputs and from the field devices themselves. The two
// can differ: a broken wire leaves 24 V on the button side and 0 V on the PLC side, which is
// exactly what a meter finds.

import type { Memory } from "@/engine/scan";
import type { FaultState, PhysicalState, RigDef, RigOptions } from "./types";

export interface ProbePoint {
  id: string;
  label: string;
  group: string;
}

export const SUPPLY_V = 24;

const v = (on: unknown) => (on ? SUPPLY_V : 0);

/** Every point a probe can touch: PLC terminals, then each field device's terminals. */
export function probePoints(rig: RigDef): ProbePoint[] {
  const plc = rig.wiring.terminals.map((t) => ({ id: t.id, label: t.label, group: "PLC" }));
  const field = rig.wiring.devices.flatMap((d) => d.terminals.map((term) => ({ id: `${d.id}:${term}`, label: `${d.name} ${term}`, group: "Field" })));
  return [...plc, ...field];
}

/** Volts at every probe point, measured against 0 V. Points that are not connected read 0. */
export function potentials(rig: RigDef, physical: PhysicalState, faults: FaultState, options: RigOptions, memory: Memory, running: boolean): Record<string, number> {
  const seen = rig.readInputs(physical, faults, options);
  const field = rig.readInputs(physical, {}, options);
  const out: Record<string, number> = {};
  const kinds = Object.fromEntries(rig.wiring.terminals.map((t) => [t.id, t.kind]));

  for (const t of rig.wiring.terminals) {
    if (t.kind === "power") out[t.id] = SUPPLY_V;
    else if (t.kind === "ground") out[t.id] = 0;
    else {
      const w = rig.wiring.wires.find((x) => x.plc === t.id && x.signal);
      out[t.id] = !w ? 0 : t.kind === "input" ? v(seen[w.signal!]) : v(running && memory[w.signal!]);
    }
  }

  for (const d of rig.wiring.devices) {
    const wires = rig.wiring.wires.filter((w) => w.device === d.id);
    const drivesOutput = wires.some((w) => kinds[w.plc] === "output");
    for (const term of d.terminals) {
      const w = wires.find((x) => x.terminal === term);
      const id = `${d.id}:${term}`;
      if (!w) out[id] = drivesOutput ? 0 : SUPPLY_V;
      else if (kinds[w.plc] === "input" && w.signal) out[id] = v(field[w.signal]);
      else out[id] = out[w.plc] ?? 0;
    }
  }
  return out;
}
