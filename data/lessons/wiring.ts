import type { LessonContent } from "../types";
import { IO } from "./io";

const SEAL = "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) OTE(Run_Seal)";
const SEAL_NC = "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIC(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) OTE(Run_Seal)";

/** Wiring and Commissioning, all on the motor starter bench. */
export const WIRING: Record<string, LessonContent> = {
  "w-schematics": {
    difficulty: "beginner",
    checkpoint: { steps: [(m, i) => Boolean(m.Motor_Run) && !i.Start_PB], message: "built the circuit on the drawing and ran it" },
    summary:
      "A schematic shows how a panel is wired, not where things sit. Supply rails run down the sides, every device has a letter and number like S1 or K1, and every terminal has a number. Read the drawing, find each wire on the bench, then run the program that the drawing was made for.",
    facts: [
      { icon: "info", text: "Device tags: S for switches and buttons, K for contactors and relays, F for protection, H for lamps, M for motors." },
      { icon: "watch", text: "Follow each wire in the wiring view from the PLC terminal to the device terminal it lands on." },
      { icon: "press", text: "Run the PLC, tap Start and let go. The seal keeps K1 in." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.estop, IO.run, IO.runLamp, IO.faultLamp],
    steps: [
      { line: 2, text: "The seal-in: Start or the seal bit, through Stop, the overload F2 and the E-stop S0." },
      { line: 3, text: "K1's coil on Q0.0 and the run lamp H1 on Q0.1 follow the seal." },
      { line: 4, text: "The fault lamp H2 shows a tripped overload." },
    ],
    code: ["// The start stop circuit from drawing sheet 1.", SEAL, "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)", "RUNG 3: XIO(Overload_OK) OTE(Fault_Lamp)"],
    specs: [
      { label: "Rungs", value: "3" },
      { label: "Devices", value: "S0 · S1 · S2 · F2 · K1 · H1 · H2" },
      { label: "Supply", value: "24 V DC control" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "w-power-control": {
    difficulty: "beginner",
    checkpoint: {
      steps: [(m) => Boolean(m.Beacon), (m, i) => !i.Overload_OK && Boolean(m.Fault_Lamp)],
      message: "saw the starting current and watched the overload protect a jammed motor",
    },
    summary:
      "A starter has two circuits. The power circuit carries 400 V from the breaker through the contactor's main contacts and the overload to the motor. The control circuit is 24 V: buttons, the PLC and the contactor coil. The two meet only at the contactor and the overload's auxiliary contact.",
    facts: [
      { icon: "bolt", text: "Power: breaker Q1, contactor K1 main contacts 1-2, 3-4, 5-6, overload F2, motor M1." },
      { icon: "info", text: "Control: 24 V through the buttons into the PLC, out of Q0.0 into the coil A1-A2." },
      { icon: "watch", text: "A current transducer reports motor amps on IW64. The beacon lights above 4 A." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.estop, IO.amps, IO.run, IO.runLamp, IO.faultLamp, IO.beacon],
    steps: [
      { line: 2, text: "The same seal-in. The control circuit decides when the power circuit is on." },
      { line: 3, text: "Q0.0 energises K1's coil. Its main contacts switch 400 V to the motor." },
      { line: 4, text: "Motor_Amps is in tenths of an amp. Above 40, 4 A, the beacon lights." },
      { line: 5, text: "The overload sits in the power circuit, but tells the control circuit through its 95-96 contact." },
    ],
    code: [
      "// Control circuit decisions, power circuit current.",
      SEAL,
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 3: GRT(Motor_Amps, 40) OTE(Beacon)",
      "RUNG 4: XIO(Overload_OK) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Power", value: "400 V AC, 3 phase" },
      { label: "Control", value: "24 V DC" },
      { label: "Rated current", value: "2.6 A" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "w-terminals": {
    difficulty: "beginner",
    rigOptions: { stopNC: true },
    checkpoint: {
      steps: [(m) => Boolean(m.Motor_Run), (m, i, f) => !f.brokenStop && !i.Stop_PB && !m.Motor_Run],
      message: "started the motor and stopped it on the rewired normally closed stop",
    },
    summary:
      "Terminal numbers tell you what a contact is without opening the device. 13-14 is a normally open contact, 11-12 and 21-22 are normally closed, A1-A2 is a coil, 95-96 is the overload's normally closed trip contact and 97-98 its normally open one. On this bench the Stop button is rewired to its normally closed contact.",
    facts: [
      { icon: "info", text: "The last digit says the type: 1-2 normally closed, 3-4 normally open. The first digit numbers the contact." },
      { icon: "watch", text: "Stop now reads 1 at rest. The program uses XIC(Stop_PB) to match." },
      { icon: "shield", text: "Normally closed stops fail safe: a broken wire reads the same as a press." },
    ],
    io: [IO.start, IO.stopNC, IO.ol, IO.estop, IO.run, IO.runLamp, IO.faultLamp],
    steps: [
      { line: 2, text: "XIC(Stop_PB) because Stop is now wired on its normally closed contact." },
      { line: 3, text: "K1 and the run lamp follow the seal." },
      { line: 4, text: "Both normally closed safety inputs light the fault lamp when they open." },
    ],
    code: [
      "// Stop rewired to its normally closed contact.",
      SEAL_NC,
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 3: XIO(Overload_OK) OR XIO(EStop_OK) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "NO contact", value: "13-14" },
      { label: "NC contact", value: "11-12 · 21-22" },
      { label: "Overload", value: "95-96 NC · 97-98 NO" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "w-multimeter": {
    difficulty: "intermediate",
    rigOptions: { stopNC: true },
    checkpoint: {
      steps: [(m, _i, f) => Boolean(f.brokenStop) && !m.Motor_Run, (m, _i, f) => !f.brokenStop && Boolean(m.Motor_Run)],
      message: "found the broken stop wire, repaired it and ran the motor again",
    },
    summary:
      "When a machine will not start, a meter tells you where the signal stops. Put the black probe on 0 V and walk the red probe along the circuit: the supply, the button, the wire, the PLC terminal. The point where 24 V turns into 0 V is where the fault is.",
    facts: [
      { icon: "bolt", text: "Break the stop wire from the Stop popover. The motor will not start and the fault lamp is lit." },
      { icon: "watch", text: "Measure the Stop button's wired terminal: 24 V. Measure I0.1: 0 V. The fault is in the wire between them." },
      { icon: "shield", text: "Repair the wire by clearing the fault, then prove the repair: start the motor again." },
    ],
    io: [IO.start, IO.stopNC, IO.ol, IO.estop, IO.run, IO.runLamp, IO.faultLamp],
    steps: [
      { line: 2, text: "The seal needs I0.1 at 1. With the wire broken it reads 0 and the motor cannot start." },
      { line: 3, text: "K1 and the run lamp." },
      { line: 4, text: "An open stop circuit lights the fault lamp, the first clue." },
    ],
    code: [
      "// Find the fault with a meter: where does 24 V become 0 V?",
      SEAL_NC,
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 3: XIO(Stop_PB) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Meter", value: "DC volts" },
      { label: "Reference", value: "Black on 0 V" },
      { label: "Fault", value: "Open circuit" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "w-loop-check": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(m) => Boolean(m.Run_Lamp), (m) => Boolean(m.Fault_Lamp), (m) => Boolean(m.Beacon), (m) => Boolean(m.Motor_Run)],
      message: "proved every input and output loop and bumped the motor",
    },
    summary:
      "Before a machine runs for real, every signal is proved from the field device to the PLC and back. A loop check program makes that easy: each input lights something you can see, and the motor only moves with two hands on the buttons, a short bump to check its direction.",
    facts: [
      { icon: "press", text: "Press each button in turn and tick it off when its lamp lights." },
      { icon: "bolt", text: "Trip the overload and press the E-stop: both light the fault lamp." },
      { icon: "shield", text: "Hold Start and AUX together to bump the motor. Let go and it stops." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.estop, IO.aux, IO.run, IO.runLamp, IO.faultLamp, IO.beacon],
    steps: [
      { line: 2, text: "Start lights the run lamp, proving I0.0 and Q0.1 together." },
      { line: 3, text: "Stop, the overload and the E-stop all light the fault lamp, proving I0.1 to I0.3 and Q0.2." },
      { line: 4, text: "AUX lights the beacon, proving I0.4 and Q0.3." },
      { line: 5, text: "The motor only runs while both hands are on Start and AUX." },
    ],
    code: [
      "// Loop check: every input lights a lamp, the motor only bumps on two hands.",
      "RUNG 1: XIC(Start_PB) OTE(Run_Lamp)",
      "RUNG 2: XIC(Stop_PB) OR XIO(Overload_OK) OR XIO(EStop_OK) OTE(Fault_Lamp)",
      "RUNG 3: XIC(Aux_PB) OTE(Beacon)",
      "RUNG 4: XIC(Start_PB) XIC(Aux_PB) XIC(Overload_OK) XIC(EStop_OK) OTE(Motor_Run)",
    ],
    specs: [
      { label: "Inputs proved", value: "I0.0 to I0.4" },
      { label: "Outputs proved", value: "Q0.0 to Q0.3" },
      { label: "Motor test", value: "Two hand bump" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "w-commissioning": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [
        (m) => Boolean(m.Beacon) && !m.Motor_Run,
        (m) => Boolean(m.Motor_Run),
        (m, i) => !i.EStop_OK && !m.Motor_Run,
        (m, i) => Boolean(i.EStop_OK) && Boolean(m.Motor_Run),
      ],
      message: "signed off the start warning, the E-stop and a clean restart",
    },
    summary:
      "Commissioning proves the finished machine against its specification, one test at a time, and writes the result down. Here the spec says: warn for 3 s before every start, stop on the E-stop, and never restart by itself when the E-stop is released.",
    facts: [
      { icon: "press", text: "Tap Start. The beacon warns for 3 s, then K1 pulls in." },
      { icon: "shield", text: "Press the E-stop while running. Release it: the motor must stay off." },
      { icon: "watch", text: "Start again to prove the restart needs a deliberate press." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.estop, IO.run, IO.runLamp, IO.faultLamp, IO.beacon],
    steps: [
      { line: 2, text: "Start latches Warn, as long as nothing is tripped and the motor is not already running." },
      { line: 3, text: "Warn_T times the 3 s warning." },
      { line: 4, text: "The seal can only begin from a finished warning." },
      { line: 5, text: "Warn clears once running, or on Stop, an E-stop or a trip." },
      { line: 6, text: "K1 and the run lamp." },
      { line: 7, text: "The beacon sounds through the warning." },
      { line: 8, text: "The fault lamp for an open E-stop or a tripped overload." },
    ],
    code: [
      "// Commissioned starter: 3 s start warning, no restart after an E-stop.",
      "RUNG 1: XIC(Start_PB) XIO(Run_Seal) XIC(Overload_OK) XIC(EStop_OK) OTL(Warn)",
      "RUNG 2: XIC(Warn) TON(Warn_T, 3000)",
      "RUNG 3: (XIC(Warn_T.DN) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) OTE(Run_Seal)",
      "RUNG 4: XIC(Run_Seal) OR XIC(Stop_PB) OR XIO(EStop_OK) OR XIO(Overload_OK) OTU(Warn)",
      "RUNG 5: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 6: XIC(Warn) OTE(Beacon)",
      "RUNG 7: XIO(Overload_OK) OR XIO(EStop_OK) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Start warning", value: "3 s" },
      { label: "After E-stop", value: "Manual restart" },
      { label: "Tests", value: "4" },
      { label: "Level", value: "Intermediate" },
    ],
  },
};
