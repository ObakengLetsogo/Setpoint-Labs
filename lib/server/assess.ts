// Hidden test cases for each track's practical assessment. They drive the program's inputs scan by
// scan and check its outputs, so any correct program passes, in ladder or structured text, written
// in any style. Server only: learners see the requirement each test checks, never the test itself.

import { LadderError, parseProgram } from "@/engine/ladder";
import { scan, type Memory } from "@/engine/scan";
import { StError, parseST, runST } from "@/engine/st";

type Value = boolean | number;
type Step =
  | { set: Record<string, Value> }
  | { run: number }
  | { expect: Record<string, Value> }
  | { range: [string, number, number] }
  | { never: number; when: (m: Memory) => boolean; what: string }
  | { flashes: [string, number, number, number] }
  | { tap: string };

interface TestCase {
  name: string;
  steps: Step[];
}

interface Suite {
  rest: Record<string, Value>;
  tests: TestCase[];
}

const SCAN = 100;
const tap = (tag: string): Step => ({ tap: tag });

const SUITES: Record<string, Suite> = {
  foundations: {
    rest: { Start_PB: false, Stop_PB: false, Overload_OK: true, EStop_OK: true },
    tests: [
      { name: "Start runs the motor and it keeps running after release", steps: [tap("Start_PB"), { run: 500 }, { expect: { Motor_Run: true } }] },
      { name: "Stop stops the motor", steps: [tap("Start_PB"), { expect: { Motor_Run: true } }, tap("Stop_PB"), { run: 300 }, { expect: { Motor_Run: false } }] },
      { name: "Start held with Stop pressed does not run", steps: [{ set: { Stop_PB: true, Start_PB: true } }, { run: 600 }, { expect: { Motor_Run: false } }, { set: { Stop_PB: false, Start_PB: false } }, { run: 300 }, tap("Start_PB"), { expect: { Motor_Run: true } }] },
      { name: "The run lamp lights after 3 s of running, not before", steps: [tap("Start_PB"), { run: 1500 }, { expect: { Run_Lamp: false } }, { run: 2000 }, { expect: { Run_Lamp: true } }] },
      {
        name: "A tripped overload stops the motor and flashes the fault lamp at about 1 Hz",
        steps: [tap("Start_PB"), { expect: { Motor_Run: true } }, { set: { Overload_OK: false } }, { run: 200 }, { expect: { Motor_Run: false } }, { flashes: ["Fault_Lamp", 4000, 3, 5] }, { set: { Overload_OK: true } }, { run: 1200 }, { expect: { Fault_Lamp: false } }],
      },
      {
        name: "The E-stop stops the motor and releasing it does not restart",
        steps: [tap("Start_PB"), { expect: { Motor_Run: true } }, { set: { EStop_OK: false } }, { run: 200 }, { expect: { Motor_Run: false } }, { set: { EStop_OK: true } }, { run: 1500 }, { expect: { Motor_Run: false } }],
      },
    ],
  },

  machines: {
    rest: { Fwd_PB: false, Rev_PB: false, Stop_PB: true, Overload_OK: true, Zero_Speed: true },
    tests: [
      { name: "FWD runs forward and seals in", steps: [tap("Fwd_PB"), { run: 300 }, { expect: { KF_Fwd: true, Fwd_Lamp: true, KR_Rev: false } }] },
      { name: "REV runs in reverse and seals in", steps: [tap("Rev_PB"), { run: 300 }, { expect: { KR_Rev: true, Rev_Lamp: true, KF_Fwd: false } }] },
      {
        name: "Both contactors are never on together",
        steps: [{ set: { Fwd_PB: true, Rev_PB: true } }, { never: 600, when: (m) => Boolean(m.KF_Fwd && m.KR_Rev), what: "KF_Fwd and KR_Rev both on" }, { set: { Fwd_PB: false, Rev_PB: false } }, tap("Rev_PB"), { never: 600, when: (m) => Boolean(m.KF_Fwd && m.KR_Rev), what: "KF_Fwd and KR_Rev both on" }, { set: { Stop_PB: false } }, { run: 300 }, { set: { Stop_PB: true } }, tap("Rev_PB"), { expect: { KR_Rev: true } }],
      },
      { name: "While running one way the other button does nothing", steps: [tap("Fwd_PB"), tap("Rev_PB"), { run: 300 }, { expect: { KF_Fwd: true, KR_Rev: false } }] },
      { name: "A start needs Zero_Speed", steps: [{ set: { Zero_Speed: false } }, tap("Fwd_PB"), { run: 300 }, { expect: { KF_Fwd: false } }, { set: { Zero_Speed: true } }, tap("Fwd_PB"), { run: 300 }, { expect: { KF_Fwd: true } }] },
      { name: "Stop stops either direction", steps: [tap("Fwd_PB"), { expect: { KF_Fwd: true } }, { set: { Stop_PB: false } }, { run: 200 }, { expect: { KF_Fwd: false } }, { set: { Stop_PB: true } }, { run: 500 }, { expect: { KF_Fwd: false } }] },
      { name: "A tripped overload stops the motor", steps: [tap("Rev_PB"), { expect: { KR_Rev: true } }, { set: { Overload_OK: false } }, { run: 200 }, { expect: { KR_Rev: false } }] },
    ],
  },

  process: {
    rest: { Start_PB: false, Stop_PB: true, Level_Raw: 13824 },
    tests: [
      { name: "Level_Raw is scaled to percent", steps: [{ set: { Level_Raw: 6912 } }, { run: 200 }, { expect: { Level_Pct: 25 } }, { set: { Level_Raw: 27648 } }, { run: 200 }, { expect: { Level_Pct: 100 } }, { set: { Level_Raw: 0 } }, { run: 200 }, { expect: { Level_Pct: 0 } }] },
      {
        name: "In auto the inlet opens below 30 % and stays open to 75 %",
        steps: [tap("Start_PB"), { run: 300 }, { expect: { Inlet_Valve: false } }, { set: { Level_Raw: 7741 } }, { run: 300 }, { expect: { Inlet_Valve: true } }, { set: { Level_Raw: 13824 } }, { run: 300 }, { expect: { Inlet_Valve: true } }, { set: { Level_Raw: 21012 } }, { run: 300 }, { expect: { Inlet_Valve: false } }, { set: { Level_Raw: 13824 } }, { run: 300 }, { expect: { Inlet_Valve: false } }],
      },
      { name: "Leaving auto closes the inlet", steps: [tap("Start_PB"), { set: { Level_Raw: 5000 } }, { run: 300 }, { expect: { Inlet_Valve: true } }, { set: { Stop_PB: false } }, { run: 200 }, { set: { Stop_PB: true } }, { run: 300 }, { expect: { Inlet_Valve: false, Run_Lamp: false } }] },
      { name: "The alarm lamp lights above 90 %", steps: [{ set: { Level_Raw: 26266 } }, { run: 300 }, { expect: { Alarm_Lamp: true } }, { set: { Level_Raw: 23500 } }, { run: 300 }, { expect: { Alarm_Lamp: false } }] },
      { name: "The run lamp shows auto", steps: [{ run: 200 }, { expect: { Run_Lamp: false } }, tap("Start_PB"), { run: 200 }, { expect: { Run_Lamp: true } }] },
    ],
  },

  wiring: {
    rest: { Start_PB: false, Stop_PB: false, Overload_OK: true, EStop_OK: true },
    tests: [
      { name: "The beacon warns before the motor runs", steps: [tap("Start_PB"), { run: 700 }, { expect: { Beacon: true, Motor_Run: false } }, { never: 1500, when: (m) => Boolean(m.Motor_Run), what: "Motor_Run on during the warning" }, { run: 1500 }, { expect: { Motor_Run: true } }] },
      { name: "Stop during the warning cancels it", steps: [tap("Start_PB"), { run: 300 }, { expect: { Beacon: true } }, tap("Stop_PB"), { run: 3500 }, { expect: { Motor_Run: false, Beacon: false } }] },
      { name: "The overload stops the motor and it stays off", steps: [tap("Start_PB"), { run: 3500 }, { expect: { Motor_Run: true } }, { set: { Overload_OK: false } }, { run: 200 }, { expect: { Motor_Run: false } }, { set: { Overload_OK: true } }, { run: 4000 }, { expect: { Motor_Run: false } }] },
      {
        name: "After an E-stop the motor needs a new Start and a new warning",
        steps: [tap("Start_PB"), { run: 3500 }, { set: { EStop_OK: false } }, { run: 200 }, { expect: { Motor_Run: false } }, { set: { EStop_OK: true } }, { run: 4000 }, { expect: { Motor_Run: false } }, tap("Start_PB"), { run: 700 }, { expect: { Motor_Run: false, Beacon: true } }, { run: 2800 }, { expect: { Motor_Run: true } }],
      },
    ],
  },

  advanced: {
    rest: { Start_PB: false, Stop_PB: true, Drive_Ready: true, Drive_Running: false, Reset_PB: false, Speed_Pot: 16588 },
    tests: [
      { name: "Start and Stop control Drive_Run", steps: [tap("Start_PB"), { set: { Drive_Running: true } }, { run: 300 }, { expect: { Drive_Run: true } }, { set: { Stop_PB: false } }, { run: 200 }, { set: { Stop_PB: true, Drive_Running: false } }, { run: 300 }, { expect: { Drive_Run: false } }] },
      { name: "Starting needs Drive_Ready", steps: [{ set: { Drive_Ready: false } }, tap("Start_PB"), { run: 300 }, { expect: { Drive_Run: false } }, { set: { Drive_Ready: true } }, tap("Start_PB"), { run: 300 }, { expect: { Drive_Run: true } }] },
      { name: "Heartbeat counts once a second", steps: [{ run: 5000 }, { range: ["Heartbeat", 4, 6] }] },
      { name: "No running reply for 5 s latches Comms_Fault and drops the run", steps: [tap("Start_PB"), { run: 3800 }, { expect: { Comms_Fault: false, Drive_Run: true } }, { run: 2200 }, { expect: { Comms_Fault: true, Drive_Run: false, Fault_Lamp: true } }] },
      { name: "Reset_PB clears Comms_Fault", steps: [tap("Start_PB"), { run: 6000 }, { expect: { Comms_Fault: true } }, tap("Reset_PB"), { run: 300 }, { expect: { Comms_Fault: false, Fault_Lamp: false } }] },
      { name: "Speed_Ref follows Speed_Pot", steps: [{ set: { Speed_Pot: 20000 } }, { run: 300 }, { expect: { Speed_Ref: 20000 } }] },
    ],
  },

  "safety-systems": {
    rest: { ES_A: true, ES_B: true, Door_A: true, Door_B: true, LC_OSSD1: true, LC_OSSD2: true, K_FB: true, Reset_PB: false },
    tests: [
      { name: "Releasing Reset with everything healthy enables F_K1 and F_K2", steps: [{ run: 300 }, { expect: { F_K1: false, F_K2: false } }, tap("Reset_PB"), { expect: { F_K1: true, F_K2: true } }] },
      { name: "A Reset held down does not enable until it is released", steps: [{ set: { Reset_PB: true } }, { run: 1500 }, { expect: { F_K1: false } }, { set: { Reset_PB: false } }, { run: 300 }, { expect: { F_K1: true } }] },
      { name: "The E-stop drops both outputs", steps: [tap("Reset_PB"), { expect: { F_K1: true, F_K2: true } }, { set: { ES_A: false, ES_B: false } }, { run: 200 }, { expect: { F_K1: false, F_K2: false } }] },
      { name: "The door drops both outputs", steps: [tap("Reset_PB"), { expect: { F_K1: true, F_K2: true } }, { set: { Door_A: false, Door_B: false } }, { run: 200 }, { expect: { F_K1: false, F_K2: false } }] },
      { name: "The light curtain drops both outputs", steps: [tap("Reset_PB"), { expect: { F_K1: true, F_K2: true } }, { set: { LC_OSSD1: false, LC_OSSD2: false } }, { run: 200 }, { expect: { F_K1: false, F_K2: false } }] },
      { name: "Closing a guard again does not re-enable without a new reset", steps: [tap("Reset_PB"), { set: { Door_A: false, Door_B: false } }, { run: 300 }, { set: { Door_A: true, Door_B: true } }, { run: 1500 }, { expect: { F_K1: false } }, tap("Reset_PB"), { expect: { F_K1: true } }] },
      { name: "Reset is refused unless K_FB proves both contactors open", steps: [{ set: { K_FB: false } }, tap("Reset_PB"), { run: 300 }, { expect: { F_K1: false } }, { set: { K_FB: true } }, tap("Reset_PB"), { expect: { F_K1: true } }] },
      {
        name: "E-stop channels that disagree latch F_Disc until both have opened and Reset is pressed",
        steps: [tap("Reset_PB"), { set: { ES_B: false } }, { run: 700 }, { expect: { F_Disc: true, F_K1: false } }, { set: { ES_B: true } }, tap("Reset_PB"), { expect: { F_K1: false, F_Disc: true } }, { set: { ES_A: false, ES_B: false } }, { run: 300 }, { set: { ES_A: true, ES_B: true } }, { run: 300 }, tap("Reset_PB"), { expect: { F_Disc: false, F_K1: true } }],
      },
    ],
  },

  mining: {
    rest: { Start_PB: false, Stop_PB: true, Reset_PB: false, PW_01: true, PW_02: true, Sway_01: true, Sway_02: true, Spd_01: false, Spd_02: false, Chute_Blk: false },
    tests: [
      { name: "Start sounds the siren for at least 4 s before CV02 runs", steps: [tap("Start_PB"), { expect: { Siren: true, CV02_Run: false } }, { never: 3000, when: (m) => Boolean(m.CV02_Run), what: "CV02 running during the siren" }, { run: 3000 }, { expect: { CV02_Run: true, Siren: false } }] },
      { name: "CV01 starts only once CV02 is proved at speed", steps: [tap("Start_PB"), { run: 7000 }, { expect: { CV02_Run: true, CV01_Run: false } }, { set: { Spd_02: true } }, { run: 400 }, { expect: { CV01_Run: true } }] },
      { name: "A pulled wire on CV02 stops both belts", steps: [tap("Start_PB"), { set: { Spd_02: true } }, { run: 7000 }, { expect: { CV01_Run: true } }, { set: { PW_02: false } }, { run: 300 }, { expect: { CV01_Run: false, CV02_Run: false } }] },
      { name: "A blocked chute stops CV01", steps: [tap("Start_PB"), { set: { Spd_02: true } }, { run: 7000 }, { expect: { CV01_Run: true } }, { set: { Chute_Blk: true } }, { run: 300 }, { expect: { CV01_Run: false } }] },
      {
        name: "After a trip, Start alone does nothing; Reset with the switch healthy, then Start, runs again",
        steps: [tap("Start_PB"), { set: { Spd_02: true } }, { run: 7000 }, { expect: { CV02_Run: true } }, { set: { Sway_02: false } }, { run: 300 }, { set: { Sway_02: true } }, { run: 300 }, tap("Start_PB"), { run: 7000 }, { expect: { CV02_Run: false } }, tap("Reset_PB"), tap("Start_PB"), { run: 7000 }, { expect: { CV02_Run: true } }],
      },
      { name: "Stop lets the belts run on to empty, then stops them", steps: [tap("Start_PB"), { set: { Spd_02: true } }, { run: 7000 }, { expect: { CV01_Run: true } }, tap("Stop_PB"), { run: 3000 }, { expect: { CV01_Run: true, CV02_Run: true } }, { run: 20000 }, { expect: { CV01_Run: false, CV02_Run: false } }] },
    ],
  },

  platforms: {
    rest: { Start_PB: false, Stop_PB: false, Overload_OK: true, Aux_PB: false },
    tests: [
      { name: "Start and Stop work with a seal-in", steps: [tap("Start_PB"), { run: 300 }, { expect: { Motor_Run: true } }, tap("Stop_PB"), { run: 300 }, { expect: { Motor_Run: false } }] },
      { name: "The overload stops the motor", steps: [tap("Start_PB"), { expect: { Motor_Run: true } }, { set: { Overload_OK: false } }, { run: 300 }, { expect: { Motor_Run: false } }] },
      {
        name: "Each start counts once and the fifth lights the beacon",
        steps: [
          { set: { Start_PB: true } }, { run: 2000 }, { set: { Start_PB: false } }, tap("Stop_PB"),
          tap("Start_PB"), tap("Stop_PB"), tap("Start_PB"), tap("Stop_PB"), tap("Start_PB"), tap("Stop_PB"),
          { run: 300 }, { expect: { Beacon: false } },
          tap("Start_PB"), { run: 300 }, { expect: { Beacon: true } },
        ],
      },
      {
        name: "AUX resets the count",
        steps: [tap("Start_PB"), tap("Stop_PB"), tap("Start_PB"), tap("Stop_PB"), tap("Start_PB"), tap("Stop_PB"), tap("Start_PB"), tap("Stop_PB"), tap("Start_PB"), tap("Stop_PB"), { run: 300 }, { expect: { Beacon: true } }, tap("Aux_PB"), { run: 300 }, { expect: { Beacon: false } }, tap("Start_PB"), { run: 300 }, { expect: { Beacon: false } }],
      },
    ],
  },
};

export interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface AssessmentResult {
  passed: boolean;
  results: TestResult[];
  error?: string;
}

class Fail extends Error {}

const same = (v: unknown, want: Value) => (typeof want === "boolean" ? Boolean(v) === want : Number(v ?? 0) === want);

/** Marks a program against a track's hidden tests. */
export function runAssessment(trackId: string, language: "ladder" | "st", source: string): AssessmentResult {
  const suite = SUITES[trackId];
  if (!suite) return { passed: false, results: [], error: "No assessment for this track." };

  let step: (mem: Memory, dt: number) => Memory;
  try {
    if (language === "st") {
      const prog = parseST(source);
      step = (m, dt) => runST(prog, m, dt).memory;
    } else {
      const prog = parseProgram(source);
      step = (m, dt) => scan(prog, m, dt).memory;
    }
  } catch (e) {
    if (e instanceof LadderError || e instanceof StError) return { passed: false, results: [], error: e.message };
    throw e;
  }

  const results = suite.tests.map((t): TestResult => {
    let mem: Memory = {};
    let inputs: Record<string, Value> = { ...suite.rest };
    const run = (ms: number, each?: (m: Memory) => void) => {
      for (let el = 0; el < ms; el += SCAN) {
        mem = step({ ...mem, ...inputs }, SCAN);
        each?.(mem);
      }
    };
    try {
      for (const s of t.steps) {
        if ("tap" in s) {
          inputs = { ...inputs, [s.tap]: !suite.rest[s.tap] };
          run(300);
          inputs = { ...inputs, [s.tap]: suite.rest[s.tap] };
          run(300);
        } else if ("set" in s) inputs = { ...inputs, ...s.set };
        else if ("run" in s) run(s.run);
        else if ("expect" in s) {
          for (const [tag, want] of Object.entries(s.expect)) if (!same(mem[tag], want)) throw new Fail(`${tag} should be ${typeof want === "boolean" ? (want ? 1 : 0) : want}, was ${typeof want === "boolean" ? (mem[tag] ? 1 : 0) : (mem[tag] ?? 0)}`);
        } else if ("range" in s) {
          const [tag, lo, hi] = s.range;
          const v = Number(mem[tag] ?? 0);
          if (v < lo || v > hi) throw new Fail(`${tag} should be between ${lo} and ${hi}, was ${v}`);
        } else if ("never" in s) {
          run(s.never, (m) => {
            if (s.when(m)) throw new Fail(s.what);
          });
        } else if ("flashes" in s) {
          const [tag, ms, lo, hi] = s.flashes;
          let rises = 0;
          let prev = Boolean(mem[tag]);
          run(ms, (m) => {
            if (m[tag] && !prev) rises++;
            prev = Boolean(m[tag]);
          });
          if (rises < lo || rises > hi) throw new Fail(`${tag} should flash about once a second; it came on ${rises} times in ${ms / 1000} s`);
        }
      }
      return { name: t.name, passed: true };
    } catch (e) {
      if (e instanceof Fail) return { name: t.name, passed: false, detail: e.message };
      return { name: t.name, passed: false, detail: e instanceof Error ? e.message : "The program failed while running." };
    }
  });
  return { passed: results.every((r) => r.passed), results };
}

export const ASSESSED_TRACKS = Object.keys(SUITES);
