import { describe, expect, it } from "vitest";
import { lessons } from "@/data/lessons";
import { rigFor } from "@/rigs";
import { parseProgram } from "./ladder";
import { PLATFORMS, translateProgram } from "./platforms";

const prog = (code: string) => parseProgram(code);
const io = rigFor("motor-starter").tags;
const SEAL = "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Run_Seal)\nRUNG 2: XIC(Run_Seal) OTE(Motor_Run)\nRUNG 3: XIC(Motor_Run) TON(Run_T, 2000)";

describe("platform translations", () => {
  it("Mitsubishi uses octal X and Y, block logic and 100 ms timers", () => {
    const t = translateProgram("mitsubishi", prog(SEAL), io);
    expect(t.lines).toEqual(["; Rung 1", "LD X000", "OR M0", "ANI X001", "AND X002", "OUT M0", "; Rung 2", "LD M0", "OUT Y000", "; Rung 3", "LD Y000", "OUT T0 K20", "END"]);
  });

  it("Siemens STL brackets the branch and keeps the marker address", () => {
    const t = translateProgram("siemens", prog(SEAL), io);
    expect(t.lines.slice(0, 8)).toEqual(["NETWORK 1", "A(", "A %I0.0", "O %M0.0", ")", "AN %I0.1", "A %I0.2", "= %M0.0"]);
    expect(t.lines).toContain("SD T0");
  });

  it("Allen Bradley rung text brackets the branches", () => {
    const t = translateProgram("rockwell", prog(SEAL), io);
    expect(t.lines[0]).toBe("[XIC(Start_PB),XIC(Run_Seal)]XIO(Stop_PB)XIC(Overload_OK)OTE(Run_Seal);");
    expect(t.map.find((r) => r.tag === "Start_PB")?.address).toBe("Local:1:I.Data.0");
  });

  it("Schneider and Omron read the same seal", () => {
    expect(translateProgram("schneider", prog(SEAL), io).lines.slice(1, 6)).toEqual(["LD %I0.0", "OR %M0", "ANDN %I0.1", "AND %I0.2", "ST %M0"]);
    expect(translateProgram("omron", prog(SEAL), io).lines.slice(1, 6)).toEqual(["LD 0.00", "OR W0.00", "AND NOT 0.01", "AND 0.02", "OUT W0.00"]);
  });

  it("nested branches use block instructions", () => {
    const p = prog("RUNG 1: ((XIC(A) XIC(B)) OR (XIC(C) XIC(D))) AND XIC(E) OTE(F)");
    expect(translateProgram("mitsubishi", p, []).lines.slice(1, 8)).toEqual(["LD M0", "AND M1", "LD M2", "AND M3", "ORB", "AND M4", "OUT M5"]);
  });

  for (const platform of PLATFORMS) {
    it(`translates every open lesson for ${platform.name}`, () => {
      // Lessons written only in structured text have no ladder to translate.
      for (const l of lessons.filter((x) => !x.locked && !x.stOnly)) {
        const t = translateProgram(platform.id, parseProgram(l.code.join("\n")), rigFor(l.rig).tags);
        const text = t.lines.join("\n");
        expect(text, l.id).not.toMatch(/undefined|NaN|\[object/);
        expect(t.lines.length, l.id).toBeGreaterThan(0);
        for (const row of t.map) expect(row.address, `${l.id} ${row.tag}`).toBeTruthy();
      }
    });
  }
});
