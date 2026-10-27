import { describe, expect, it } from "vitest";
import { parseProgram } from "@/engine/ladder";
import { parseST } from "@/engine/st";
import { RIGS } from "@/rigs";
import type { RigDef } from "@/rigs/types";
import { useSim } from "@/store/sim";
import { isSandbox, sandboxId, sandboxRig, starterProgram } from "./sandbox";

describe("sandbox", () => {
  it("round trips ids and rejects unknown rigs", () => {
    expect(sandboxRig(sandboxId("lift"))).toBe("lift");
    expect(isSandbox("foundations-1")).toBe(false);
    expect(sandboxRig("sandbox:nope")).toBeUndefined();
  });

  it("starter programs parse as ladder and as structured text on every rig", () => {
    for (const rig of Object.values(RIGS) as RigDef[]) {
      const src = starterProgram(rig);
      expect(() => parseProgram(src), rig.id).not.toThrow();
      expect(() => parseST(src), rig.id).not.toThrow();
      expect(src).not.toMatch(/—/);
    }
  });

  it("opens a rig in the store with the starter program and runs code on it", () => {
    const s = useSim.getState();
    s.setLesson(sandboxId("conveyor"));
    expect(useSim.getState().rigId).toBe("conveyor");
    expect(useSim.getState().sources[sandboxId("conveyor")]).toContain("Sandbox on the conveyor");
    useSim.getState().setSource("RUNG 1: XIC(Stop_PB) OTE(Belt_Run)");
    expect(useSim.getState().error).toBeNull();
    useSim.getState().resetSource();
    expect(useSim.getState().sources[sandboxId("conveyor")]).toContain("Inputs:");
    s.setLesson("foundations-1");
    expect(useSim.getState().rigId).toBe("motor-starter");
  });
});
