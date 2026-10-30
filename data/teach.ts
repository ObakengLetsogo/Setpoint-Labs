import { TEACH_ADVANCED } from "./teach-advanced";
import { TEACH_PLATFORMS } from "./teach-platforms";
import { TEACH_FOUNDATIONS } from "./teach-foundations";
import { TEACH_MACHINES } from "./teach-machines";
import { TEACH_PROCESS } from "./teach-process";
import { TEACH_SEQUENCES } from "./teach-sequences";
import { TEACH_FOUNDATION_NEW } from "./teach-foundation-new";
export interface TourScene {
  kicker: string;
  title: string;
  lines: [number, number];
  lead: string;
  body: string;
  precise?: string;
  handsTo?: string[];
}

export interface LessonTeach {
  goal: string;
  learn: string[];
  wires: number[];
  steps: string[];
  between: string[];
  tour: TourScene[];
  story: { t: string; text: string }[];
  words: { term: string; meaning: string }[];
}

const COMMON_WORDS = [
  { term: "Rung", meaning: "One line of ladder logic between the two power rails. Contacts on the left, outputs on the right." },
  { term: "Contact", meaning: "A question about a bit. Normally open (XIC) passes power when the bit is 1, normally closed (XIO) when it is 0." },
  { term: "Coil", meaning: "An output instruction. OTE writes the rung result into a bit every scan." },
  { term: "Scan", meaning: "One pass of the program: read inputs, solve every rung top to bottom, write outputs." },
  { term: "Tag", meaning: "A name for an address, like Start_PB for I0.0. The logic uses names, the wiring uses addresses." },
];

const TEACH_FIRST: Record<string, LessonTeach> = {
  "foundations-1": {
    goal: "Make the motor run only while Start is held, and stop it with Stop. One rung, three symbols.",
    learn: ["normally open contact", "normally closed contact", "output coil", "series logic", "scan cycle"],
    wires: [1, 2, 3, 6, 7],
    steps: [
      "Switch the PLC to RUN with the Run button or Space.",
      "Press and hold Start in the scene. Watch I0.0 light on the I/O board.",
      "Check the rung turns green from left to right and Q0.0 lights.",
      "Release Start. The motor coasts down because nothing remembers the press.",
      "Hold Start and press Stop together. Stop wins, the rung breaks.",
    ],
    between: ["Stop the PLC before you change the program.", "Edits apply on the next Run.", "The rig is a simulator. Never test logic on live plant."],
    tour: [
      {
        kicker: "Scene 1 of 3 · Inputs",
        title: "Read the Start button",
        lines: [2, 2],
        lead: "XIC(Start_PB) is the first symbol on the rung.",
        body: "A normally open contact asks one question: is I0.0 on? Only while you hold Start does it pass power to the right.",
        precise: "XIC means examine if closed. It reads the input image taken at the start of the scan, not the live wire.",
        handsTo: ["Start_PB"],
      },
      {
        kicker: "Scene 2 of 3 · In series",
        title: "Stop sits in the way",
        lines: [2, 2],
        lead: "XIO(Stop_PB) passes power while Stop is not pressed.",
        body: "Two contacts written side by side are in series: both must pass. Pressing Stop breaks the path even if Start is held.",
        handsTo: ["Stop_PB"],
      },
      {
        kicker: "Scene 3 of 3 · Output",
        title: "The coil follows the rung",
        lines: [2, 2],
        lead: "OTE(Motor_Run) writes the rung result to Q0.0.",
        body: "When the scan finishes, Q0.0 drives the contactor coil. Rung true, motor runs. Rung false, motor stops.",
        handsTo: ["Motor_Run"],
      },
    ],
    story: [
      { t: "0 ms", text: "Scan starts. The PLC copies every input into its input image." },
      { t: "you", text: "You press Start. I0.0 goes to 1 on the next scan." },
      { t: "rung 1", text: "XIC(Start_PB) passes, XIO(Stop_PB) passes, OTE writes 1 to Motor_Run." },
      { t: "write", text: "Q0.0 switches on, the coil pulls in, the motor accelerates." },
      { t: "you", text: "You let go. The next scan reads 0 and the rung goes false." },
    ],
    words: COMMON_WORDS,
  },
  "foundations-2": {
    goal: "Tap Start once and keep the motor running. A memory bit seals the rung until Stop breaks it.",
    learn: ["parallel branch", "seal-in", "memory bit M0.0", "stop has priority", "pilot lamp"],
    wires: [1, 2, 3, 6, 7, 8],
    steps: [
      "Run the PLC and tap Start once.",
      "Watch the lower branch: Run_Seal takes over from Start on the next scan.",
      "Check the green RUN lamp lights with the motor.",
      "Tap Stop. The seal drops and stays dropped until the next Start.",
      "Hold Start and Stop together. Explain why Stop wins.",
    ],
    between: ["Seal-in is the most common pattern in motor control.", "Stop is in series after the branch on purpose.", "Save your edited program before changing lesson."],
    tour: [
      {
        kicker: "Scene 1 of 3 · Branch",
        title: "Two ways to power the rung",
        lines: [2, 2],
        lead: "XIC(Start_PB) OR XIC(Run_Seal) builds a parallel branch.",
        body: "Either path can pass power. Start gets the rung going, Run_Seal keeps it going once it is set.",
        handsTo: ["Start_PB", "Run_Seal"],
      },
      {
        kicker: "Scene 2 of 3 · Priority",
        title: "Stop after the branch",
        lines: [2, 2],
        lead: "AND XIO(Stop_PB) comes after both branches.",
        body: "Because Stop is in series with the whole branch, it breaks the seal no matter which path is carrying power.",
        precise: "Text ladder reads left to right: (Start OR Run_Seal) AND NOT Stop.",
        handsTo: ["Stop_PB"],
      },
      {
        kicker: "Scene 3 of 3 · Memory",
        title: "The output feeds itself",
        lines: [2, 3],
        lead: "OTE(Run_Seal) writes the bit that rung 1 reads on the next scan.",
        body: "Rung 2 copies Run_Seal to the contactor and the run lamp, so one memory bit drives both outputs.",
        handsTo: ["Run_Seal", "Motor_Run", "Run_Lamp"],
      },
    ],
    story: [
      { t: "you", text: "You tap Start. I0.0 is 1 for a few scans." },
      { t: "rung 1", text: "The Start path passes. Run_Seal is written 1." },
      { t: "next scan", text: "Start is released, but XIC(Run_Seal) now passes. The rung stays true." },
      { t: "rung 2", text: "Motor_Run and Run_Lamp follow Run_Seal." },
      { t: "you", text: "You tap Stop. XIO(Stop_PB) opens, Run_Seal drops, the motor stops." },
    ],
    words: [...COMMON_WORDS, { term: "Seal-in", meaning: "A branch around a momentary button, driven by the output itself, that keeps a rung true after the button is released." }],
  },
  "foundations-3": {
    goal: "Protect the motor. A tripped overload must stop it, light the fault lamp and block a restart until reset.",
    learn: ["normally closed field contact", "fail-safe wiring", "fault lamp", "overload trip", "reset"],
    wires: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    steps: [
      "Run the PLC and start the motor.",
      "Click the motor, then switch on Jam the shaft.",
      "Watch the current rise and the overload heat on the monitor.",
      "When it trips, check Q0.0 drops and the red FAULT lamp lights.",
      "Try Start while tripped. Nothing happens. Clear the jam, reset the overload, start again.",
    ],
    between: ["An overload protects the motor, the breaker protects the cable.", "Normally closed contacts fail safe.", "Always find out why it tripped before you reset."],
    tour: [
      {
        kicker: "Scene 1 of 3 · Guard",
        title: "The overload in series",
        lines: [2, 2],
        lead: "XIC(Overload_OK) sits in series with the seal.",
        body: "I0.2 is 1 while the overload is healthy because its contact is normally closed. A trip opens it and the seal drops at once.",
        precise: "Testing for 1 on a normally closed device is what makes a broken wire stop the motor too.",
        handsTo: ["Overload_OK"],
      },
      {
        kicker: "Scene 2 of 3 · Outputs",
        title: "Run follows the seal",
        lines: [3, 3],
        lead: "Rung 2 is unchanged from lesson 2.",
        body: "The contactor and run lamp follow Run_Seal, so a trip turns both off on the same scan.",
        handsTo: ["Motor_Run", "Run_Lamp"],
      },
      {
        kicker: "Scene 3 of 3 · Tell the operator",
        title: "Fault lamp on a trip",
        lines: [4, 4],
        lead: "XIO(Overload_OK) lights Fault_Lamp.",
        body: "The same input read the other way round. When the overload opens, Q0.2 lights the red lamp so nobody keeps pressing Start.",
        handsTo: ["Fault_Lamp"],
      },
    ],
    story: [
      { t: "running", text: "Motor at speed, about 0.9 A. The overload is cool." },
      { t: "fault", text: "The shaft jams. Current climbs to about 13 A." },
      { t: "seconds", text: "The thermal element heats up. At 100 % it trips and opens 95-96." },
      { t: "rung 1", text: "XIC(Overload_OK) fails. Run_Seal drops on that scan." },
      { t: "rung 3", text: "XIO(Overload_OK) passes. Fault_Lamp lights." },
    ],
    words: [...COMMON_WORDS, { term: "Overload", meaning: "A thermal relay that heats with motor current and trips before the windings overheat." }, { term: "Fail-safe", meaning: "Designed so a broken wire or lost power stops the machine instead of starting it." }],
  },
};

export const TEACH: Record<string, LessonTeach> = { ...TEACH_FIRST, ...TEACH_FOUNDATIONS, ...TEACH_MACHINES, ...TEACH_PROCESS, ...TEACH_SEQUENCES, ...TEACH_ADVANCED, ...TEACH_PLATFORMS, ...TEACH_FOUNDATION_NEW };
