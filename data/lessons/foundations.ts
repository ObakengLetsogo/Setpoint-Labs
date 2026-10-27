import type { LessonContent } from "../types";
import { IO } from "./io";

export const FOUNDATIONS: Record<string, LessonContent> = {
  "foundations-1": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Motor_Run)], message: "motor ran from the Start button" },
    summary:
      "Every ladder program is built from a few symbols. A contact asks a question about an input, a coil acts on the answer. Hold Start and the motor runs. Let go and it stops.",
    facts: [
      { icon: "press", text: "Press and hold the green Start button in the scene." },
      { icon: "watch", text: "Watch the rung light up green as power flows left to right." },
      { icon: "bolt", text: "Release it. With no memory in the logic, the motor coasts to a stop." },
    ],
    io: [IO.start, IO.stop, IO.run],
    steps: [
      { line: 1, text: "XIC(Start_PB) is a normally open contact. It passes power while Start is pressed." },
      { line: 1, text: "XIO(Stop_PB) is a normally closed contact. It passes power while Stop is NOT pressed." },
      { line: 1, text: "OTE(Motor_Run) is the coil. It is on exactly while the rung is true, so the motor only runs while you hold Start." },
    ],
    code: ["// Hold Start to run. Nothing remembers the press yet.", "RUNG 1: XIC(Start_PB) XIO(Stop_PB) OTE(Motor_Run)"],
    specs: [
      { label: "Rungs", value: "1" },
      { label: "Instructions", value: "XIC · XIO · OTE" },
      { label: "Scan time", value: "100 ms" },
      { label: "Level", value: "Beginner" },
    ],
  },
  "foundations-2": {
    difficulty: "beginner",
    checkpoint: { steps: [(m, i) => Boolean(m.Motor_Run) && !i.Start_PB], message: "motor kept running after Start was released" },
    summary:
      "A momentary button can keep a motor running if the logic remembers it. A branch around Start, driven by the output itself, holds the rung true after you let go. This one pattern is in almost every motor panel.",
    facts: [
      { icon: "press", text: "Tap Start once. The motor keeps running after you release it." },
      { icon: "watch", text: "See the lower branch take over, carrying power through Run_Seal." },
      { icon: "bolt", text: "Tap Stop. It is in series, so it always breaks the seal." },
    ],
    io: [IO.start, IO.stop, IO.seal, IO.run, IO.runLamp],
    steps: [
      { line: 2, text: "XIC(Start_PB) OR XIC(Run_Seal) puts a branch around Start. Either path can power the rung." },
      { line: 2, text: "XIO(Stop_PB) sits in series after the branch, so Stop always wins." },
      { line: 2, text: "OTE(Run_Seal) writes the memory bit. On the next scan it holds the branch closed." },
      { line: 3, text: "XIC(Run_Seal) drives the contactor and the green lamp together." },
    ],
    code: [
      "// Tap Start once. The seal keeps the motor running.",
      "RUNG 1: XIC(Start_PB) OR XIC(Run_Seal) AND XIO(Stop_PB) OTE(Run_Seal)",
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "2" },
      { label: "Pattern", value: "Seal-in" },
      { label: "Memory bits", value: "1 · M0.0" },
      { label: "Level", value: "Beginner" },
    ],
  },
  "foundations-3": {
    difficulty: "beginner",
    checkpoint: {
      steps: [(m, i) => !i.Overload_OK && !m.Motor_Run && Boolean(m.Fault_Lamp)],
      message: "overload trip stopped the motor and lit the fault lamp",
    },
    summary:
      "A breaker protects cables from short circuits, but a motor that works too hard heats up slowly. The thermal overload relay watches the current and trips before the windings burn. Its contact is normally closed, so a trip, or a broken wire, stops the motor.",
    facts: [
      { icon: "press", text: "Start the motor, then click the motor and jam its shaft." },
      { icon: "watch", text: "Current climbs, the overload heats and trips after a few seconds." },
      { icon: "shield", text: "The red lamp lights. Reset the overload before you can restart." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.seal, IO.run, IO.runLamp, IO.faultLamp],
    steps: [
      { line: 2, text: "XIC(Overload_OK) is in series with the seal. A tripped overload opens it and the seal drops at once." },
      { line: 2, text: "Holding Start does nothing while the overload is tripped. The contact is still open." },
      { line: 4, text: "XIO(Overload_OK) lights the fault lamp whenever the relay has tripped." },
    ],
    code: [
      "// Jam the motor shaft to trip the overload.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Run_Seal)",
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 3: XIO(Overload_OK) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "3" },
      { label: "Pattern", value: "Fail-safe trip" },
      { label: "Trip class", value: "Class 10" },
      { label: "Level", value: "Beginner" },
    ],
  },
};
