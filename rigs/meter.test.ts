import { describe, expect, it } from "vitest";
import { motorStarter } from "./motorStarter";
import { RIGS } from "./index";
import type { RigDef } from "./types";
import { potentials, probePoints } from "./meter";

const p0 = motorStarter.initial;

describe("multimeter", () => {
  it("reads the supply and a released start button", () => {
    const v = potentials(motorStarter, p0, {}, {}, {}, false);
    expect(v["24V"]).toBe(24);
    expect(v["0V"]).toBe(0);
    expect(v["I0.0"]).toBe(0);
    expect(v["start:13"]).toBe(24);
    expect(v["I0.2"]).toBe(24);
  });

  it("finds a broken stop wire: 24 V at the button, 0 V at the PLC", () => {
    const v = potentials(motorStarter, p0, { brokenStop: true }, { stopNC: true }, {}, false);
    expect(v["stop:14"]).toBe(24);
    expect(v["I0.1"]).toBe(0);
  });

  it("puts 24 V on an output and its device only while the PLC runs it", () => {
    expect(potentials(motorStarter, p0, {}, {}, { Motor_Run: true }, true)["coil:A1"]).toBe(24);
    expect(potentials(motorStarter, p0, {}, {}, { Motor_Run: true }, false)["Q0.0"]).toBe(0);
    expect(potentials(motorStarter, p0, {}, {}, { Motor_Run: true }, true)["coil:A2"]).toBe(0);
  });

  it("has unique probe points on every rig", () => {
    for (const rig of Object.values(RIGS) as RigDef[]) {
      const ids = probePoints(rig).map((p) => p.id);
      expect(new Set(ids).size, rig.id).toBe(ids.length);
      const v = potentials(rig, rig.initial, {}, {}, {}, false);
      for (const id of ids) expect([0, 24], `${rig.id} ${id}`).toContain(v[id]);
    }
  });
});
