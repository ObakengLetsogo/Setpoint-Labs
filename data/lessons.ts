import type { Lesson } from "./types";

const fullLessons: Lesson[] = [
  {
    id: "foundations-1",
    trackId: "foundations",
    number: 1,
    title: "Ladder Symbols Walkthrough",
    difficulty: "beginner",
    completed: true,
    summary:
      "Every ladder program is built from a handful of symbols. Learn to read a normally open contact, a normally closed contact, and a coil before writing a single rung.",
    facts: [
      "A rung is one row of logic between the two power rails.",
      "Contacts test conditions. Coils act on the result.",
      "Power 'flows' left to right only while the logic is true.",
    ],
    io: [
      { address: "I0.0", tagName: "Start_PB", color: "#2e9e5b", connectsTo: "Start pushbutton", description: "Momentary NO pushbutton, wired normally open" },
      { address: "I0.1", tagName: "Stop_PB", color: "#d64545", connectsTo: "Stop pushbutton", description: "Momentary NO pushbutton, wired normally open, read as NC in logic" },
      { address: "Q0.0", tagName: "Motor_Run", color: "#2457a6", connectsTo: "Motor contactor coil", description: "Energises the contactor coil that closes the motor's power contacts" },
    ],
    steps: [
      { line: 1, text: "XIC(Start_PB) tests whether the start input is energised." },
      { line: 2, text: "XIO(Stop_PB) tests whether the stop input is NOT energised." },
      { line: 3, text: "When both are true, OTE(Motor_Run) energises the output coil." },
    ],
    code: [
      "RUNG 1: XIC(Start_PB) AND XIO(Stop_PB) OTE(Motor_Run)",
      "// Start energises the coil; Stop de-energises it.",
    ],
    specs: [
      { label: "Symbol count", value: "3 core" },
      { label: "Languages used", value: "Ladder" },
      { label: "Scan time", value: "100 ms" },
      { label: "Difficulty", value: "Beginner" },
    ],
    callouts: [
      { id: "start", label: "Start pushbutton", color: "#2e9e5b", top: "62%", left: "18%" },
      { id: "stop", label: "Stop pushbutton", color: "#d64545", top: "62%", left: "78%" },
      { id: "coil", label: "Motor contactor", color: "#2457a6", top: "30%", left: "50%" },
    ],
  },
  {
    id: "foundations-2",
    trackId: "foundations",
    number: 2,
    title: "The Seal-In Circuit",
    difficulty: "beginner",
    completed: true,
    summary:
      "A momentary start button can hold a motor running by sealing in through the output's own contact. This is the single most used pattern in industrial control.",
    facts: [
      "The coil's own contact, wired in parallel with Start, holds the rung true.",
      "Stop is wired in series so it always breaks the seal.",
      "This pattern is the basis of almost every motor control circuit you'll see on the floor.",
    ],
    io: [
      { address: "I0.0", tagName: "Start_PB", color: "#2e9e5b", connectsTo: "Start pushbutton", description: "Momentary NO pushbutton" },
      { address: "I0.1", tagName: "Stop_PB", color: "#d64545", connectsTo: "Stop pushbutton", description: "Momentary NO pushbutton, read as NC" },
      { address: "M0.0", tagName: "Run_Seal", color: "#2457a6", connectsTo: "Internal marker", description: "Holds the run state between scans" },
      { address: "Q0.0", tagName: "Motor_Run", color: "#2457a6", connectsTo: "Motor contactor coil", description: "Follows Run_Seal directly" },
    ],
    steps: [
      { line: 1, text: "XIC(Start_PB) OR XIC(Run_Seal), either starts the rung, or the seal keeps it true." },
      { line: 2, text: "AND XIO(Stop_PB): Stop always wins and breaks the seal." },
      { line: 3, text: "OTE(Run_Seal) feeds back into line 1 on the next scan." },
      { line: 4, text: "OTE(Motor_Run) drives the real output." },
    ],
    code: [
      "RUNG 1: XIC(Start_PB) OR XIC(Run_Seal) AND XIO(Stop_PB) OTE(Run_Seal)",
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run)",
    ],
    specs: [
      { label: "Pattern", value: "Seal-in" },
      { label: "Markers used", value: "1 (M0.0)" },
      { label: "Scan time", value: "100 ms" },
      { label: "Difficulty", value: "Beginner" },
    ],
    callouts: [
      { id: "start", label: "Start pushbutton", color: "#2e9e5b", top: "62%", left: "18%" },
      { id: "stop", label: "Stop pushbutton", color: "#d64545", top: "62%", left: "78%" },
      { id: "seal", label: "Seal-in marker", color: "#2457a6", top: "46%", left: "50%" },
    ],
  },
  {
    id: "foundations-3",
    trackId: "foundations",
    number: 3,
    title: "Motor Start/Stop with Overload",
    difficulty: "beginner",
    completed: false,
    summary:
      "Add a thermal overload relay to the seal-in circuit so the motor trips off safely before it burns out, and learn why the overload is wired normally closed.",
    facts: [
      "The overload contact is wired normally closed: it opens on a trip.",
      "A tripped overload must break the circuit even if Start is held down.",
      "A fault output lets the HMI or a lamp show why the motor isn't running.",
    ],
    io: [
      { address: "I0.0", tagName: "Start_PB", color: "#2e9e5b", connectsTo: "Start pushbutton", description: "Momentary NO pushbutton" },
      { address: "I0.1", tagName: "Stop_PB", color: "#d64545", connectsTo: "Stop pushbutton", description: "Momentary NO pushbutton, read as NC" },
      { address: "I0.2", tagName: "Overload_OK", color: "#f26b1d", connectsTo: "Thermal overload relay", description: "Normally closed contact, opens on an overload trip" },
      { address: "Q0.0", tagName: "Motor_Run", color: "#2457a6", connectsTo: "Motor contactor coil", description: "De-energises instantly on a trip" },
      { address: "Q0.1", tagName: "Fault_Lamp", color: "#d64545", connectsTo: "Fault indicator lamp", description: "Lit whenever the overload has tripped" },
    ],
    steps: [
      { line: 1, text: "The seal-in rung now also requires XIC(Overload_OK) to be true." },
      { line: 2, text: "A tripped overload opens the contact and drops the seal immediately." },
      { line: 3, text: "XIO(Overload_OK) drives the fault lamp whenever the relay has tripped." },
    ],
    code: [
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Run_Seal)",
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run)",
      "RUNG 3: XIO(Overload_OK) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Pattern", value: "Seal-in + fail-safe" },
      { label: "Fault handling", value: "Hard-wired trip" },
      { label: "Scan time", value: "100 ms" },
      { label: "Difficulty", value: "Beginner" },
    ],
    callouts: [
      { id: "overload", label: "Overload relay", color: "#f26b1d", top: "40%", left: "32%" },
      { id: "coil", label: "Motor contactor", color: "#2457a6", top: "30%", left: "50%" },
      { id: "fault", label: "Fault lamp", color: "#d64545", top: "22%", left: "70%" },
    ],
  },
];

function placeholderLesson(number: number): Lesson {
  return {
    id: `foundations-${number}`,
    trackId: "foundations",
    number,
    title: `Chapter ${number}`,
    difficulty: "beginner",
    completed: false,
    locked: true,
    summary: "This chapter's content is being written. Check back soon.",
    facts: [],
    io: [],
    steps: [],
    code: ["// Coming soon"],
    specs: [],
    callouts: [],
  };
}

export const lessons: Lesson[] = [
  ...fullLessons,
  ...Array.from({ length: 17 }, (_, i) => placeholderLesson(i + 4)),
];

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
