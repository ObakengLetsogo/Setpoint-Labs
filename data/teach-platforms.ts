import type { LessonTeach } from "./teach";

const SAFE = ["Stop the PLC before you change the program.", "The rig is a simulator. Never test logic on live plant."];

function tour(name: string, notation: string, p: { goal: string; learn: string[]; seal: string; timer: string; words: { term: string; meaning: string }[] }): LessonTeach {
  return {
    goal: p.goal,
    learn: p.learn,
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    steps: [
      `Open 'On real controllers' below. ${name} is selected.`,
      `Read rung 1 in ${notation} and match each line to a contact in the ladder.`,
      "Run the PLC and tap Start. The run lamp lights after 2 s.",
      "Start the motor five times. The beacon shows the start counter is done; AUX resets it.",
      "Switch to another family and compare how the same rung is written.",
    ],
    between: [`${name} tools can import and export programs as text, which is how this translation is laid out.`, ...SAFE],
    tour: [
      { kicker: "Scene 1 of 2 · Seal-in", title: `The seal in ${notation}`, lines: [2, 3], lead: p.seal, body: "Every family writes the same logic: start or seal, and not stop, and the safety inputs.", handsTo: ["Start_PB", "Run_Seal", "Motor_Run"] },
      { kicker: "Scene 2 of 2 · Timer and counter", title: "Blocks with memory", lines: [4, 8], lead: p.timer, body: "Timers and counters exist everywhere. What changes is the address, the time base and the instruction name.", handsTo: ["Run_T", "Starts", "Beacon"] },
    ],
    story: [
      { t: "you", text: "You tap Start. The seal holds the motor on." },
      { t: "2 s", text: "The timer finishes and the run lamp lights." },
      { t: "5 starts", text: "The counter is done and the beacon lights." },
    ],
    words: p.words,
  };
}

export const TEACH_PLATFORMS: Record<string, LessonTeach> = {
  "t-iec": tour("IEC 61131-3", "structured text", {
    goal: "See the shared starter in IEC structured text, the common ground under every vendor.",
    learn: ["IEC 61131-3", "five languages", "standard data types", "standard function blocks", "portability"],
    seal: "Run_Seal := (Start_PB OR Run_Seal) AND NOT Stop_PB ...",
    timer: "Run_T(IN := Motor_Run, PT := T#2000ms) and an R_TRIG feeding a CTU.",
    words: [{ term: "IEC 61131-3", meaning: "The international standard for PLC programming languages." }, { term: "POU", meaning: "Program organisation unit: a program, function or function block." }],
  }),
  "t-siemens": tour("Siemens", "STL", {
    goal: "Read the shared starter as Siemens STL with S7 addresses.",
    learn: ["TIA Portal", "OB1", "%I and %Q addresses", "STL", "S5 timers"],
    seal: "A( A %I0.0 O %M0.0 ) AN %I0.1 ... = %M0.0",
    timer: "L S5T#2S then SD T0 starts a 2 s on delay; the counter is compared with its preset.",
    words: [{ term: "OB1", meaning: "The organisation block that runs every scan." }, { term: "STL", meaning: "Statement list, Siemens' text language, one instruction per line." }],
  }),
  "t-rockwell": tour("Allen Bradley", "rung text", {
    goal: "Read the shared starter as Logix rung text with named tags and aliases.",
    learn: ["Studio 5000", "tags and aliases", "module I/O", "rung text", "TIMER and COUNTER"],
    seal: "[XIC(Start_PB),XIC(Run_Seal)]XIO(Stop_PB)...OTE(Run_Seal);",
    timer: "TON(Run_T,2000,0) and CTU(Starts,5,0), with .DN done bits.",
    words: [{ term: "Alias tag", meaning: "A friendly name pointing at a module I/O point." }, { term: "MainRoutine", meaning: "The routine a program runs first, usually from the continuous task." }],
  }),
  "t-schneider": tour("Schneider", "instruction list", {
    goal: "Read the shared starter as Modicon instruction list with % addresses.",
    learn: ["Machine Expert", "% addressing", "accumulator", "AND( brackets", "%TM and %C blocks"],
    seal: "LD %I0.0 OR %M0 ANDN %I0.1 ... ST %M0",
    timer: "IN %TM0 with a configured preset, and CU %C0 counting a rising edge.",
    words: [{ term: "Accumulator", meaning: "The working result that LD loads and AND and OR change." }, { term: "%TM", meaning: "A Modicon timer block, configured with a type, time base and preset." }],
  }),
  "t-mitsubishi": tour("Mitsubishi", "instruction list", {
    goal: "Read the shared starter as Mitsubishi FX instruction list with octal I/O.",
    learn: ["GX Works", "octal X and Y", "M relays", "ORB and ANB", "100 ms timers"],
    seal: "LD X000 OR M0 ANI X001 AND X002 ... OUT M0",
    timer: "OUT T0 K20 is 2 s; MEP pulses the result and OUT C0 K5 counts it.",
    words: [{ term: "Octal", meaning: "Base eight numbering: 0 to 7, then 10." }, { term: "ORB", meaning: "OR block: combines two blocks of logic in parallel." }],
  }),
  "t-omron": tour("Omron", "mnemonics", {
    goal: "Read the shared starter as Omron mnemonics with CIO and work bit addresses.",
    learn: ["CX-Programmer", "word.bit addresses", "work bits", "function numbers", "0.1 s timers"],
    seal: "LD 0.00 OR W0.00 AND NOT 0.01 ... OUT W0.00",
    timer: "TIM 0000 #20 is 2 s; UP(521) pulses and CNTR(012) counts.",
    words: [{ term: "CIO", meaning: "Omron's core I/O area: inputs from 0.00, outputs from 100.00." }, { term: "Work bit", meaning: "An internal bit in the W area, like a marker." }],
  }),
  "t-delta": tour("Delta", "instruction list", {
    goal: "Read the shared starter as Delta DVP instruction list and compare it with Mitsubishi.",
    learn: ["ISPSoft", "octal X and Y", "TMR and CNT", "PLS pulses", "M1000 always on"],
    seal: "LD X0 OR M0 ANI X1 AND X2 ... OUT M0",
    timer: "TMR T0 K20 is 2 s; PLS makes the pulse and CNT C0 K5 counts it.",
    words: [{ term: "PLS", meaning: "Turns a relay on for one scan on a rising edge." }, { term: "M1000", meaning: "A Delta special relay that is on while the PLC runs." }],
  }),
};
