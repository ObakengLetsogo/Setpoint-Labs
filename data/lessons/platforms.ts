import type { LessonContent } from "../types";
import { IO } from "./io";

/** One program for every tour, so the only thing that changes is the controller. */
const CODE = [
  "// The same starter on every controller family.",
  "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) OTE(Run_Seal)",
  "RUNG 2: XIC(Run_Seal) OTE(Motor_Run)",
  "RUNG 3: XIC(Motor_Run) TON(Run_T, 2000)",
  "RUNG 4: XIC(Run_T.DN) OTE(Run_Lamp)",
  "RUNG 5: XIC(Motor_Run) ONS(Start_OS) CTU(Starts, 5)",
  "RUNG 6: XIC(Starts.DN) OTE(Beacon)",
  "RUNG 7: XIC(Aux_PB) RES(Starts)",
  "RUNG 8: XIO(Overload_OK) OTE(Fault_Lamp)",
];

const IOS = [IO.start, IO.stop, IO.ol, IO.estop, IO.aux, IO.run, IO.runLamp, IO.faultLamp, IO.beacon];

function tour(p: { summary: string; facts: [string, string, string]; steps: [string, string, string, string]; specs: [string, string][] }): LessonContent {
  return {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => Boolean(m.Run_Lamp)], message: "ran the shared starter and read it in this controller's notation" },
    summary: p.summary,
    facts: [
      { icon: "info", text: p.facts[0] },
      { icon: "watch", text: p.facts[1] },
      { icon: "press", text: p.facts[2] },
    ],
    io: IOS,
    steps: [
      { line: 2, text: p.steps[0] },
      { line: 4, text: p.steps[1] },
      { line: 6, text: p.steps[2] },
      { line: 8, text: p.steps[3] },
    ],
    code: CODE,
    specs: [...p.specs.map(([label, value]) => ({ label, value })), { label: "Level", value: "Intermediate" }],
  };
}

export const PLATFORM_LESSONS: Record<string, LessonContent> = {
  "t-iec": tour({
    summary:
      "IEC 61131-3 is the standard behind almost every modern PLC. It defines five languages: ladder, function block diagram, structured text, sequential function charts and instruction list, now deprecated. Learn the standard once and every vendor's tool feels familiar.",
    facts: ["The five languages share one data model: BOOL, INT, TIME, and function blocks like TON and CTU.", "Open 'On real controllers' to see this program in structured text.", "Run the starter. After 2 s the run lamp lights."],
    steps: ["The seal-in is a BOOL assignment in every IEC language.", "TON is a standard function block with IN, PT, Q and ET.", "R_TRIG is the standard edge block; CTU counts it.", "Each vendor adds its own extras on top of this common core."],
    specs: [["Standard", "IEC 61131-3"], ["Languages", "LD · FBD · ST · SFC"], ["Typical tool", "CODESYS"]],
  }),
  "t-siemens": tour({
    summary:
      "Siemens S7 controllers are programmed in TIA Portal. Code lives in blocks: OB1 runs every scan and calls functions (FC) and function blocks (FB) with instance data blocks. Addresses use %I, %Q and %M with byte and bit, so %I0.0 is the first input.",
    facts: ["S7-1200 and S7-1500 support LAD, FBD, SCL and GRAPH; S7-1500 and S7-300 also support STL.", "In STL, A means AND, O means OR and = writes the result.", "Run the starter and compare each network with its ladder rung."],
    steps: ["A( O ) brackets the start and seal branch, AN reads Stop inverted.", "SD starts an on delay timer with an S5 time like S5T#2S.", "FP turns the result into a one scan pulse using a memory bit.", "OB1 is the cyclic block; every network here would live in it or in a called FC."],
    specs: [["Software", "TIA Portal"], ["Program", "OB1 · FC · FB · DB"], ["Address", "%I0.0 · %Q0.0 · %M0.0"]],
  }),
  "t-rockwell": tour({
    summary:
      "Allen Bradley Logix controllers use named tags instead of fixed addresses. Physical I/O appears as module tags like Local:1:I.Data.0, and you give them alias tags such as Start_PB. Programs are tasks, programs and routines, with MainRoutine run by the continuous task.",
    facts: ["This simulator's ladder syntax is closest to Logix: XIC, XIO, OTE, TON and CTU are the real names.", "Branches in rung text are written in square brackets with a comma between paths.", "Run the starter. The .DN bits are the same names you would use in Studio 5000."],
    steps: ["XIC and XIO read alias tags of Local:1:I.Data bits.", "TON(Run_T,2000,0): timer tag, preset in ms, accumulator.", "ONS needs its own storage bit, Start_OS.", "RES clears the counter's accumulator and done bit."],
    specs: [["Software", "Studio 5000"], ["Program", "Task · program · routine"], ["Address", "Named tags"]],
  }),
  "t-schneider": tour({
    summary:
      "Schneider Modicon M221 and M241 controllers are programmed in EcoStruxure Machine Expert. Addresses start with a percent sign: %I0.0 inputs, %Q0.0 outputs, %M bits, %MW words, %TM timers and %C counters. Timers are configured with a time base and a preset.",
    facts: ["Instruction list works on an accumulator: LD loads, AND and OR combine, ST stores.", "AND( and OR( open a bracket, which is how branches are written.", "Run the starter and find %TM0.Q, the timer's done bit."],
    steps: ["LD, OR, ANDN and ST make the seal-in.", "IN %TM0 drives the timer; its preset is set in the configuration, 20 steps of 100 ms.", "LDR detects a rising edge on a memory bit.", "%C0.D is the counter's done bit, R %C0 resets it."],
    specs: [["Software", "Machine Expert"], ["Language", "LD · IL · ST · Grafcet"], ["Address", "%I0.0 · %Q0.0 · %M0"]],
  }),
  "t-mitsubishi": tour({
    summary:
      "Mitsubishi FX and iQ-F controllers are programmed in GX Works. Inputs are X and outputs Y, numbered in octal, so after X007 comes X010. Internal relays are M, data registers D, timers T and counters C. Timer presets count in 100 ms steps, so K20 is 2 s.",
    facts: ["Octal numbering skips 8 and 9: X000 to X007, then X010.", "ORB and ANB combine blocks of logic, like brackets in ladder.", "Run the starter and read OUT T0 K20 as the 2 s timer."],
    steps: ["LD, OR, ANI and AND build the seal; OUT writes M0.", "OUT T0 K20 is a 2 s timer, T0 its contact.", "MEP turns the result so far into a pulse.", "RST C0 resets the counter. END closes the program."],
    specs: [["Software", "GX Works2 · GX Works3"], ["Numbering", "Octal X and Y"], ["Timer base", "100 ms"]],
  }),
  "t-omron": tour({
    summary:
      "Omron CP1 and CJ2 controllers are programmed in CX-Programmer; the newer NX and NJ use Sysmac Studio. Bits are addressed as word.bit: inputs start at CIO 0.00, outputs at CIO 100.00, work bits at W0.00. Timers count in 0.1 s steps.",
    facts: ["Many instructions carry a function number, like MOV(021).", "AND LD and OR LD combine logic blocks.", "Run the starter and read TIM 0000 #20 as 2 s."],
    steps: ["LD 0.00 is input 0, OUT W0.00 a work bit.", "TIM 0000 #20 is a 2 s on delay timer; T0000 is its contact.", "UP(521) gives a one scan pulse.", "CNR(545) resets a counter."],
    specs: [["Software", "CX-Programmer · Sysmac"], ["Address", "0.00 · 100.00 · W0.00"], ["Timer base", "0.1 s"]],
  }),
  "t-delta": tour({
    summary:
      "Delta DVP controllers are a popular low cost family, programmed in ISPSoft or WPLSoft. Their instruction set and X and Y octal numbering are close to Mitsubishi FX, so programs and skills carry across. Timers T0 to T199 count in 100 ms steps.",
    facts: ["X0 and Y0 are octal, like Mitsubishi, but written without leading zeros.", "TMR starts a timer, CNT a counter, M1000 is always on while running.", "Run the starter and read TMR T0 K20."],
    steps: ["LD, OR, ANI and AND make the seal, OUT writes M0.", "TMR T0 K20 is 2 s.", "PLS M0 makes a one scan pulse relay, read back with LD, and CNT C0 K5 counts it.", "RST C0 clears the count."],
    specs: [["Software", "ISPSoft · WPLSoft"], ["Numbering", "Octal X and Y"], ["Timer base", "100 ms"]],
  }),
};
