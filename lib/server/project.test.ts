import { describe, expect, it } from "vitest";
import { runProject } from "./assess";

// A reference answer, in structured text, proves the hidden project tests can all be passed.
const REF = `VAR
  Dry1 : TON;
  Dry2 : TON;
  Dem_Edge : R_TRIG;
  HH_Edge : R_TRIG;
END_VAR
Auto := (Start_PB OR Auto) AND Stop_PB;
IF LS_Lead AND Auto THEN Dem := TRUE; END_IF;
IF NOT LS_Low OR NOT Auto THEN Dem := FALSE; END_IF;
IF Duty = 0 THEN Duty := 2; END_IF;
Dem_Edge(CLK := Dem);
IF Dem_Edge.Q THEN Duty := 3 - Duty; END_IF;
Dry1(IN := P1_Run AND NOT Flow1_OK, PT := T#8s);
Dry2(IN := P2_Run AND NOT Flow2_OK, PT := T#8s);
IF Dry1.Q OR NOT P1_OK THEN F1 := TRUE; END_IF;
IF Dry2.Q OR NOT P2_OK THEN F2 := TRUE; END_IF;
IF Ack_PB THEN F1 := FALSE; F2 := FALSE; END_IF;
P1_Run := Dem AND NOT F1 AND (Duty = 1 OR F2 OR LS_Lag);
P2_Run := Dem AND NOT F2 AND (Duty = 2 OR F1 OR LS_Lag);
HH_Edge(CLK := LS_HighHigh);
IF HH_Edge.Q THEN Horn_On := TRUE; END_IF;
IF Ack_PB OR NOT LS_HighHigh THEN Horn_On := FALSE; END_IF;
Horn := Horn_On;
Alarm_Lamp := LS_HighHigh OR F1 OR F2;`;

describe("Expert final project", () => {
  it("the reference answer passes every hidden test", () => {
    const r = runProject("st", REF);
    expect(r.results.filter((x) => !x.passed), JSON.stringify(r.results, null, 1)).toEqual([]);
    expect(r.passed).toBe(true);
  });
  it("an empty program passes nothing", () => {
    expect(runProject("ladder", "// nothing").results.filter((x) => x.passed)).toEqual([]);
  });
});
