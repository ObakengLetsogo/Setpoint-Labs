import { describe, expect, it } from "vitest";
import { ASSESSMENTS } from "@/data/assessments";
import { ASSESSED_TRACKS, runAssessment } from "./assess";
import { CURRICULUM } from "@/data/curriculum";

// Reference answers. Each must pass every hidden test.
const REF: Record<string, ["ladder" | "st", string][]> = {
  foundations: [
    [
      "ladder",
      `RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) OTE(Run_Seal)
RUNG 2: XIC(Run_Seal) OTE(Motor_Run)
RUNG 3: XIC(Motor_Run) TON(Run_T, 3000)
RUNG 4: XIC(Run_T.DN) OTE(Run_Lamp)
RUNG 5: XIO(Flash_B.DN) TON(Flash_A, 500)
RUNG 6: XIC(Flash_A.DN) TON(Flash_B, 500)
RUNG 7: XIO(Overload_OK) XIO(Flash_A.DN) OTE(Fault_Lamp)`,
    ],
  ],
  machines: [
    [
      "ladder",
      `RUNG 1: (XIC(Fwd_PB) XIC(Zero_Speed) OR XIC(Fwd_Run)) AND XIC(Stop_PB) AND XIC(Overload_OK) AND XIO(Rev_Run) OTE(Fwd_Run)
RUNG 2: (XIC(Rev_PB) XIC(Zero_Speed) OR XIC(Rev_Run)) AND XIC(Stop_PB) AND XIC(Overload_OK) AND XIO(Fwd_Run) OTE(Rev_Run)
RUNG 3: XIC(Fwd_Run) XIO(KR_Rev) OTE(KF_Fwd) OTE(Fwd_Lamp)
RUNG 4: XIC(Rev_Run) XIO(KF_Fwd) OTE(KR_Rev) OTE(Rev_Lamp)`,
    ],
  ],
  process: [
    [
      "ladder",
      `RUNG 1: (XIC(Start_PB) OR XIC(Auto)) AND XIC(Stop_PB) OTE(Auto)
RUNG 2: XIC(Auto) OTE(Run_Lamp)
RUNG 3: MUL(Level_Raw, 100, Level_x100)
RUNG 4: DIV(Level_x100, 27648, Level_Pct)
RUNG 5: XIC(Auto) LES(Level_Pct, 30) OTL(Filling)
RUNG 6: GEQ(Level_Pct, 75) OR XIO(Auto) OTU(Filling)
RUNG 7: XIC(Filling) OTE(Inlet_Valve)
RUNG 8: GRT(Level_Pct, 90) OTE(Alarm_Lamp)`,
    ],
  ],
  wiring: [
    [
      "ladder",
      `RUNG 1: XIC(Start_PB) XIO(Run_Seal) XIC(Overload_OK) XIC(EStop_OK) OTL(Warn)
RUNG 2: XIC(Warn) TON(Warn_T, 3000)
RUNG 3: (XIC(Warn_T.DN) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) OTE(Run_Seal)
RUNG 4: XIC(Run_Seal) OR XIC(Stop_PB) OR XIO(EStop_OK) OR XIO(Overload_OK) OTU(Warn)
RUNG 5: XIC(Run_Seal) OTE(Motor_Run)
RUNG 6: XIC(Warn) OTE(Beacon)`,
    ],
  ],
  advanced: [
    [
      "ladder",
      `RUNG 1: (XIC(Start_PB) XIC(Drive_Ready) OR XIC(Run_Cmd)) AND XIC(Stop_PB) AND XIO(Comms_Fault) OTE(Run_Cmd)
RUNG 2: XIC(Run_Cmd) OTE(Drive_Run)
RUNG 3: MOV(Speed_Pot, Speed_Ref)
RUNG 4: XIO(Beat_T.DN) TON(Beat_T, 1000)
RUNG 5: XIC(Beat_T.DN) ADD(Heartbeat, 1, Heartbeat)
RUNG 6: XIC(Drive_Run) XIO(Drive_Running) TON(Reply_T, 5000)
RUNG 7: XIC(Reply_T.DN) OTL(Comms_Fault)
RUNG 8: XIC(Reset_PB) OTU(Comms_Fault)
RUNG 9: XIC(Comms_Fault) OTE(Fault_Lamp)`,
    ],
    [
      "st",
      `VAR
  Beat_T : TON;
  Reply_T : TON;
END_VAR
Run_Cmd := ((Start_PB AND Drive_Ready) OR Run_Cmd) AND Stop_PB AND NOT Comms_Fault;
Drive_Run := Run_Cmd;
Speed_Ref := Speed_Pot;
Beat_T(IN := NOT Beat_T.Q, PT := T#1s);
IF Beat_T.Q THEN
  Heartbeat := Heartbeat + 1;
END_IF;
Reply_T(IN := Drive_Run AND NOT Drive_Running, PT := T#5s);
IF Reply_T.Q THEN
  Comms_Fault := TRUE;
END_IF;
IF Reset_PB THEN
  Comms_Fault := FALSE;
END_IF;
Fault_Lamp := Comms_Fault;`,
    ],
  ],
  platforms: [
    [
      "ladder",
      `RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Run_Seal)
RUNG 2: XIC(Run_Seal) OTE(Motor_Run)
RUNG 3: XIC(Motor_Run) ONS(Start_OS) CTU(Starts, 5)
RUNG 4: XIC(Aux_PB) RES(Starts)
RUNG 5: XIC(Starts.DN) OTE(Beacon)`,
    ],
  ],
};

describe("assessments", () => {
  it("every track has a brief and hidden tests", () => {
    expect(ASSESSED_TRACKS.sort()).toEqual(CURRICULUM.map((t) => t.id).sort());
    expect(ASSESSMENTS.map((a) => a.trackId).sort()).toEqual(CURRICULUM.map((t) => t.id).sort());
  });

  for (const [track, refs] of Object.entries(REF))
    for (const [lang, src] of refs)
      it(`${track}: the reference answer in ${lang} passes`, () => {
        const r = runAssessment(track, lang, src);
        expect(r.results.filter((x) => !x.passed), JSON.stringify(r.results, null, 1)).toEqual([]);
        expect(r.passed).toBe(true);
      });

  it("an empty program fails, and a syntax error is reported", () => {
    for (const track of ASSESSED_TRACKS) expect(runAssessment(track, "ladder", "// nothing").passed).toBe(false);
    expect(runAssessment("foundations", "ladder", "RUNG 1: XIC(").error).toBeTruthy();
  });

  it("a starter without a seal-in or protection fails the right tests", () => {
    const r = runAssessment("foundations", "ladder", "RUNG 1: XIC(Start_PB) XIO(Stop_PB) OTE(Motor_Run)");
    const failed = r.results.filter((x) => !x.passed).map((x) => x.name);
    expect(failed).toContain("Start runs the motor and it keeps running after release");
    expect(failed).toContain("The run lamp lights after 3 s of running, not before");
  });

  it("a reversing starter without an interlock is caught", () => {
    const r = runAssessment("machines", "ladder", "RUNG 1: (XIC(Fwd_PB) OR XIC(KF_Fwd)) AND XIC(Stop_PB) OTE(KF_Fwd)\nRUNG 2: (XIC(Rev_PB) OR XIC(KR_Rev)) AND XIC(Stop_PB) OTE(KR_Rev)");
    expect(r.results.find((x) => x.name === "Both contactors are never on together")?.passed).toBe(false);
  });
});

describe("assessment tests cannot be passed by doing nothing", () => {
  it("an empty program passes no test that expects an output to turn off", () => {
    const outputsOnly = ["The alarm lamp lights above 90 %", "Level_Raw is scaled to percent"];
    for (const track of ASSESSED_TRACKS) {
      const r = runAssessment(track, "ladder", "// nothing");
      const passedByNothing = r.results.filter((x) => x.passed && !outputsOnly.includes(x.name)).map((x) => `${track}: ${x.name}`);
      expect(passedByNothing).toEqual([]);
    }
  });
});
