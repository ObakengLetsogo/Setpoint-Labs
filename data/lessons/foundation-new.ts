import type { IoPoint, LessonContent } from "../types";
import { IO } from "./io";

// Foundation lessons added from the Curriculum and Lecture Guide: PLC basics, data and tags,
// field devices, electrical safety, wiring and software. They run on the motor starter bench,
// except the sensor lesson, which uses the conveyor's photo-eyes.

const io = (address: string, tagName: string, color: string, connectsTo: string, description: string): IoPoint => ({ address, tagName, color, connectsTo, description });

const CV = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Start pushbutton", "Momentary, normally open"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
  estop: io("I0.2", "EStop_OK", "#c9a227", "E-stop monitoring", "1 while released"),
  entry: io("I0.3", "PE_Entry", "#3d434a", "Entry photo-eye", "1 while product blocks the beam"),
  exit: io("I0.4", "PE_Exit", "#3d434a", "Exit photo-eye", "1 while product blocks the beam"),
  belt: io("Q0.0", "Belt_Run", "#2457a6", "Belt drive contactor", "Runs the belt"),
  lamp: io("Q0.1", "Run_Lamp", "#2e9e5b", "Green lamp", "Lit when a batch of five is counted"),
};

const word = (tag: string, description: string) => io("MW10", tag, "#6b4fa0", "Internal memory word", description);

export const FOUNDATION_NEW: Record<string, LessonContent> = {
  "f-why": {
    difficulty: "beginner",
    checkpoint: { steps: [(m, i) => Boolean(m.Motor_Run) && !i.Start_PB, (m) => !m.Motor_Run], message: "started the motor from the program and stopped it" },
    summary:
      "Before PLCs, machines were controlled by panels full of relays wired together. Changing how a machine behaved meant rewiring it. A PLC replaces that wiring with a program: the buttons and the motor stay wired, and the logic between them becomes text you can change in minutes.",
    facts: [
      { icon: "info", text: "Inputs bring the plant to the PLC: buttons, switches and sensors." },
      { icon: "bolt", text: "Outputs drive the plant: contactors, lamps, valves and beacons." },
      { icon: "press", text: "Tap Start: the motor runs and keeps running. Tap Stop to stop it." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.run, IO.runLamp],
    steps: [
      { line: 2, text: "One rung does the job of a start relay, a hold contact and a stop button wired in series." },
      { line: 2, text: "Motor_Run appears twice: as the output and as a contact that holds the rung true once started." },
      { line: 3, text: "The run lamp follows the motor command. On a relay panel that would be another wire." },
    ],
    code: [
      "// The relay panel, rewritten as a program.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Motor_Run)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Motor_Run)",
      "RUNG 2: XIC(Motor_Run) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "2" },
      { label: "Replaces", value: "3 relays and their wiring" },
      { label: "Used in", value: "Mines, water works, factories" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-inside": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Run_Lamp), (m) => Boolean(m.Fault_Lamp), (m) => Boolean(m.Beacon)], message: "proved three inputs and three outputs" },
    summary:
      "A PLC has a power supply, a CPU that runs the program, and input and output modules that connect it to the plant. Each terminal has an address: I0.0 is the first input, Q0.0 the first output. This lab ties each button straight to a lamp, so you can see each input and output channel working.",
    facts: [
      { icon: "info", text: "The control supply here is 24 V DC. Inputs see 24 V when a button closes." },
      { icon: "press", text: "Press Start, then Stop, then AUX. Each one lights its own output." },
      { icon: "watch", text: "Watch the I/O board: the input LED and the output LED light together." },
    ],
    io: [IO.start, IO.stop, IO.aux, IO.runLamp, IO.faultLamp, IO.beacon],
    steps: [
      { line: 2, text: "I0.0, the first input, drives Q0.1, the run lamp." },
      { line: 3, text: "I0.1 drives Q0.2, the fault lamp. A plain one to one test of the channel." },
      { line: 4, text: "I0.4 drives Q0.3, the beacon. Three inputs, three outputs, all proved." },
    ],
    code: [
      "// One input to one output: a test of each channel.",
      "RUNG 1: XIC(Start_PB) OTE(Run_Lamp)",
      "RUNG 2: XIC(Stop_PB) OTE(Fault_Lamp)",
      "RUNG 3: XIC(Aux_PB) OTE(Beacon)",
    ],
    specs: [
      { label: "Supply", value: "24 V DC" },
      { label: "Inputs used", value: "I0.0, I0.1, I0.4" },
      { label: "Outputs used", value: "Q0.1, Q0.2, Q0.3" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-bits": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Beacon), (m) => Number(m.Count ?? 0) === 0 && !m.Beacon], message: "counted to four in a word and cleared it" },
    summary:
      "A bit holds 0 or 1. Eight bits make a byte and sixteen make a word, which holds a number from 0 to 65535, or -32768 to 32767 when signed. Buttons are bits; counts, currents and speeds are words. This lab counts AUX presses into a word and lights the beacon at four.",
    facts: [
      { icon: "press", text: "Tap AUX four times. Count climbs 1, 2, 3, 4 and the beacon lights." },
      { icon: "info", text: "4 in decimal is 100 in binary: bit 2 of the word is set." },
      { icon: "bolt", text: "Tap Stop to move 0 into the word and clear it." },
    ],
    io: [IO.aux, IO.stop, IO.beacon, word("Count", "A 16 bit word holding the number of presses")],
    steps: [
      { line: 2, text: "ONS lets one press add only once, however long you hold the button." },
      { line: 2, text: "ADD reads Count, adds 1 and writes the result back into the same word." },
      { line: 3, text: "GEQ compares the whole word with 4. A bit cannot hold 4; a word can." },
      { line: 4, text: "MOV writes 0 into the word, clearing all sixteen bits at once." },
    ],
    code: [
      "// Count presses into a word.",
      "RUNG 1: XIC(Aux_PB) ONS(Aux_OS) ADD(Count, 1, Count)",
      "RUNG 2: GEQ(Count, 4) OTE(Beacon)",
      "RUNG 3: XIC(Stop_PB) MOV(0, Count)",
    ],
    specs: [
      { label: "Bit", value: "0 or 1" },
      { label: "Byte", value: "8 bits" },
      { label: "Word", value: "16 bits" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-types": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Beacon), (m) => Boolean(m.Motor_Run) && !m.Beacon && Number(m.Amps_A ?? 0) > 0], message: "saw the starting current and read the running current in amps" },
    summary:
      "Every value in a PLC has a type. BOOL is one bit, INT a whole number, REAL a number with decimals and TIME a duration. The current transducer gives an INT in tenths of an amp: 26 means 2.6 A. This lab flags the high starting current and converts the reading to amps.",
    facts: [
      { icon: "press", text: "Tap Start. For a moment the current is several times the running current and the beacon lights." },
      { icon: "watch", text: "Once the motor is up to speed the beacon goes out and Amps_A shows the running current." },
      { icon: "info", text: "Siemens calls the types Bool, Int, Real and Time; Allen Bradley uses BOOL, INT, DINT, REAL." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.run, IO.amps, IO.beacon, word("Amps_A", "The motor current divided by 10, in amps")],
    steps: [
      { line: 2, text: "Motor_Run is a BOOL: on or off." },
      { line: 3, text: "Motor_Amps is an INT in tenths of an amp. Above 40, more than 4 A, the beacon shows the starting surge." },
      { line: 4, text: "DIV turns tenths into amps. Getting the scaling wrong is one of the most common bugs on site." },
    ],
    code: [
      "// Types: a BOOL command, an INT current, a scaled result.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Motor_Run)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Motor_Run)",
      "RUNG 2: GRT(Motor_Amps, 40) OTE(Beacon)",
      "RUNG 3: DIV(Motor_Amps, 10, Amps_A)",
    ],
    specs: [
      { label: "BOOL", value: "1 bit" },
      { label: "INT", value: "16 bits, -32768 to 32767" },
      { label: "DINT and REAL", value: "32 bits" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-tags": {
    difficulty: "beginner",
    checkpoint: { steps: [(m, i) => Boolean(m.Run_Seal) && Boolean(m.Motor_Run) && !i.Start_PB, (m) => !m.Run_Seal && !m.Motor_Run], message: "held the run command in a memory bit and cleared it" },
    summary:
      "An address says where a signal is: I0.0, Q0.0, M0.0. A tag gives it a name, like Start_PB. Inputs and outputs come from terminals; memory bits are inside the PLC and remember things the program needs. Here the run command lives in a memory bit, and two outputs follow it.",
    facts: [
      { icon: "info", text: "Siemens addresses look like I0.0 and M0.0; Allen Bradley uses tags such as Local:1:I.Data.0." },
      { icon: "press", text: "Tap Start. Run_Seal, a memory bit, turns on and holds." },
      { icon: "watch", text: "The motor and the run lamp both follow the memory bit." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.seal, IO.run, IO.runLamp],
    steps: [
      { line: 2, text: "Run_Seal is M0.0, a memory bit. No wire is connected to it." },
      { line: 3, text: "The motor output reads the memory bit." },
      { line: 4, text: "So does the run lamp. One decision, many places that use it." },
    ],
    code: [
      "// The run command in a memory bit, used twice.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Run_Seal)",
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run)",
      "RUNG 3: XIC(Run_Seal) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Inputs", value: "I" },
      { label: "Outputs", value: "Q" },
      { label: "Memory", value: "M" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-buttons": {
    difficulty: "beginner",
    rigOptions: { stopNC: true },
    checkpoint: {
      steps: [(m) => Boolean(m.Motor_Run), (m) => !m.Motor_Run, (m, i, f) => Boolean(f.brokenStop) && Boolean(i.Start_PB) && !m.Motor_Run],
      message: "ran and stopped the motor, then saw a broken Stop wire block the start",
    },
    summary:
      "Buttons and switches have normally open (NO) and normally closed (NC) contacts. Start is NO: it closes when pressed. Stop is wired NC here: it opens when pressed, and also if its wire breaks, so a fault stops the machine instead of hiding the stop. The program reads Stop as 1 at rest.",
    facts: [
      { icon: "press", text: "Tap Start, then Stop. Stop is now an NC contact, so the program uses XIC." },
      { icon: "bolt", text: "Break the Stop wire from its popover and try to start. The motor refuses: the fault is safe." },
      { icon: "info", text: "Green is start, red is stop, a red mushroom on yellow is the E-stop: these colours follow IEC 60204-1." },
    ],
    io: [IO.start, IO.stopNC, IO.ol, IO.run, IO.runLamp],
    steps: [
      { line: 2, text: "XIC(Stop_PB): with an NC stop, the rung needs Stop to read 1, its resting state." },
      { line: 2, text: "Pressing Stop or breaking its wire both give 0, so both stop the motor." },
      { line: 3, text: "The run lamp follows the motor." },
    ],
    code: [
      "// Stop wired normally closed: it fails safe.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Motor_Run)) AND XIC(Stop_PB) AND XIC(Overload_OK) OTE(Motor_Run)",
      "RUNG 2: XIC(Motor_Run) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Start", value: "NO, green" },
      { label: "Stop", value: "NC, red" },
      { label: "Standard", value: "IEC 60204-1 colours" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-sensors": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Belt_Run), (m) => Boolean(m["Parts.DN"])], message: "ran the belt and counted five cartons at the exit eye" },
    summary:
      "Sensors tell the PLC what is happening without touching it. Inductive proximity sensors see metal, capacitive ones see almost anything, and photo-eyes see an object break a beam of light. This conveyor has two photo-eyes. The program counts cartons at the exit eye and lights the lamp at five.",
    facts: [
      { icon: "press", text: "Tap Start. The belt runs and cartons pass the entry and exit eyes." },
      { icon: "watch", text: "Each carton at the exit eye adds one to the count. At five the lamp lights." },
      { icon: "info", text: "PNP sensors switch 24 V to the input; NPN sensors switch 0 V. The input card must match." },
    ],
    io: [CV.start, CV.stop, CV.estop, CV.entry, CV.exit, CV.belt, CV.lamp],
    steps: [
      { line: 2, text: "The belt seals in on Start, like a motor." },
      { line: 3, text: "The exit eye reads 1 while a carton blocks its beam. ONS turns each carton into one count." },
      { line: 4, text: "At five, the counter's done bit lights the lamp." },
      { line: 5, text: "Stop, read as 0 when pressed, resets the count." },
    ],
    code: [
      "// Count cartons with a photo-eye.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Belt_Run)) AND XIC(Stop_PB) AND XIC(EStop_OK) OTE(Belt_Run)",
      "RUNG 2: XIC(PE_Exit) ONS(Exit_OS) CTU(Parts, 5)",
      "RUNG 3: XIC(Parts.DN) OTE(Run_Lamp)",
      "RUNG 4: XIO(Stop_PB) RES(Parts)",
    ],
    specs: [
      { label: "Sensors", value: "2 photo-eyes" },
      { label: "Type", value: "Through beam, PNP" },
      { label: "Batch", value: "5 cartons" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-relays": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Run_Lamp), (m) => !m.Motor_Run], message: "proved the contactor closed from the motor current, then stopped" },
    summary:
      "A PLC output cannot power a motor. It switches a small coil: a relay for small loads, a contactor for motors, a solenoid for valves. The contactor's main contacts then carry the motor current. This lab proves the contactor really closed by checking that motor current flows, and flags a fault if it does not.",
    facts: [
      { icon: "bolt", text: "Q0.0 switches the contactor coil at 24 V. The main contacts switch 400 V to the motor." },
      { icon: "press", text: "Tap Start. Once current flows, the run lamp lights: proof of run." },
      { icon: "info", text: "Coils need a diode or RC suppressor across them so the switch-off spike does not damage the output." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.amps, IO.run, IO.runLamp, IO.faultLamp],
    steps: [
      { line: 2, text: "The command to the contactor coil." },
      { line: 3, text: "Current above 0.5 A proves the main contacts closed and the motor is turning." },
      { line: 4, text: "Commanded but no current for 2 s means the contactor did not pull in." },
      { line: 5, text: "That lights the fault lamp: check the coil, its fuse and its wiring." },
    ],
    code: [
      "// Command the contactor, then prove it closed.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Motor_Run)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Motor_Run)",
      "RUNG 2: XIC(Motor_Run) GRT(Motor_Amps, 5) OTE(Run_Lamp)",
      "RUNG 3: XIC(Motor_Run) XIO(Run_Lamp) TON(Proof_T, 2000)",
      "RUNG 4: XIC(Proof_T.DN) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Coil", value: "24 V DC" },
      { label: "Main contacts", value: "400 V AC" },
      { label: "Proof time", value: "2 s" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "w-isolation": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Motor_Run), (m) => Boolean(m.Locked) && !m.Motor_Run, (m) => !m.Locked && !m.Motor_Run], message: "isolated the machine, kept it locked out and reset it deliberately" },
    summary:
      "Before anyone works on a machine it is isolated: the supply is switched off at a lockable isolator, locked and tagged, and proved dead with a meter. The program must never restart a machine on its own when the isolation is removed. Here the E-stop stands in for the isolator, and a deliberate reset is needed afterwards.",
    facts: [
      { icon: "shield", text: "Isolate, lock, tag, then prove dead with a tested meter: prove, test, prove." },
      { icon: "press", text: "Start the motor, then press the E-stop. The machine locks out and the beacon lights." },
      { icon: "watch", text: "Release the E-stop: nothing restarts. Tap AUX to reset, then Start again." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.estop, IO.aux, IO.run, IO.beacon],
    steps: [
      { line: 2, text: "Losing EStop_OK latches the lockout." },
      { line: 3, text: "Only a deliberate reset, with the E-stop released, clears it." },
      { line: 4, text: "The motor cannot run while locked out." },
      { line: 5, text: "The beacon shows the lockout to everyone nearby." },
    ],
    code: [
      "// Lock out on isolation; never restart by itself.",
      "RUNG 1: XIO(EStop_OK) OTL(Locked)",
      "RUNG 2: XIC(EStop_OK) XIC(Aux_PB) OTU(Locked)",
      "RUNG 3: (XIC(Start_PB) OR XIC(Motor_Run)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIO(Locked) OTE(Motor_Run)",
      "RUNG 4: XIC(Locked) OTE(Beacon)",
    ],
    specs: [
      { label: "Method", value: "Lockout and tagout" },
      { label: "Test", value: "Prove, test, prove" },
      { label: "Law", value: "OHS Act, electrical regulations" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "w-protection": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Motor_Run), (m) => Boolean(m.Overcurrent) && !m.Motor_Run, (m) => !m.Overcurrent], message: "tripped on a jam and reset the overcurrent" },
    summary:
      "Fuses and circuit breakers clear short circuits in milliseconds. Overloads and motor protection trip on a smaller current that lasts too long. Earth leakage units trip when current escapes to earth. This lab adds an electronic overcurrent trip: more than 6 A for 2 s stops the motor, ignoring the short starting surge.",
    facts: [
      { icon: "shield", text: "Short circuit: breaker or fuse. Overload: thermal relay. Leakage to earth: earth leakage unit." },
      { icon: "press", text: "Start the motor, then jam the shaft from the motor's popover." },
      { icon: "bolt", text: "After 2 s above 6 A the program trips. Clear the jam and tap AUX to reset." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.aux, IO.amps, IO.run, IO.faultLamp],
    steps: [
      { line: 2, text: "The motor runs only while no overcurrent is latched." },
      { line: 3, text: "Current above 60, which is 6 A, starts a 2 s timer. The start surge is over before it finishes." },
      { line: 4, text: "If it finishes, the overcurrent latches." },
      { line: 5, text: "Reset needs AUX with the motor stopped." },
      { line: 6, text: "The fault lamp shows the trip." },
    ],
    code: [
      "// Electronic overcurrent: 6 A for 2 s.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Motor_Run)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIO(Overcurrent) OTE(Motor_Run)",
      "RUNG 2: XIC(Motor_Run) GRT(Motor_Amps, 60) TON(OC_T, 2000)",
      "RUNG 3: XIC(OC_T.DN) OTL(Overcurrent)",
      "RUNG 4: XIC(Aux_PB) XIO(Motor_Run) OTU(Overcurrent)",
      "RUNG 5: XIC(Overcurrent) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Trip", value: "6 A for 2 s" },
      { label: "Rated current", value: "2.6 A" },
      { label: "Reset", value: "Manual, AUX" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "w-cables": {
    difficulty: "beginner",
    rigOptions: { stopNC: true },
    checkpoint: { steps: [(m) => Boolean(m.Motor_Run), (m, _i, f) => Boolean(f.brokenStop) && Boolean(m.Fault_Lamp) && !m.Motor_Run], message: "found a broken cable in the stop circuit from the program" },
    summary:
      "Cables are chosen for their current, voltage and job: power cable for motors, screened cable for 4 to 20 mA and data, and they are kept apart in the duct. Glands seal and grip cables where they enter a panel. A cable that breaks in an NC circuit stops the machine safely; this program also flags it, so the fitter knows where to look.",
    facts: [
      { icon: "info", text: "Keep 24 V signal cables away from 400 V power cables, or noise appears on the signals." },
      { icon: "press", text: "Start the motor, then break the Stop wire from its popover." },
      { icon: "watch", text: "The motor stops and after 3 s the fault lamp says the stop circuit is open." },
    ],
    io: [IO.start, IO.stopNC, IO.ol, IO.run, IO.faultLamp],
    steps: [
      { line: 2, text: "Stop is wired NC, so a broken cable reads 0 and stops the motor." },
      { line: 3, text: "If the stop circuit stays open for 3 s, it is a cable fault, not someone pressing Stop." },
      { line: 4, text: "The fault lamp sends the fitter to the stop circuit cable." },
    ],
    code: [
      "// A broken cable fails safe, and the program says where.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Motor_Run)) AND XIC(Stop_PB) AND XIC(Overload_OK) OTE(Motor_Run)",
      "RUNG 2: XIO(Stop_PB) TON(Open_T, 3000)",
      "RUNG 3: XIC(Open_T.DN) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Standard", value: "SANS 10142-1" },
      { label: "Signal cable", value: "Screened, apart from power" },
      { label: "Detection", value: "3 s open circuit" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "w-wiring-io": {
    difficulty: "beginner",
    checkpoint: {
      steps: [(m) => Boolean(m.Run_Lamp), (m) => Boolean(m.Fault_Lamp), (m) => Boolean(m.Beacon), (m) => Boolean(m.Motor_Run)],
      message: "proved every input and output on the bench",
    },
    summary:
      "Inputs are wired from the 24 V supply through the device to the input terminal, with the card's common to 0 V. Outputs are wired from the output terminal through the load back to 0 V. Before a machine runs, every point is tested. This program lets you prove each input and output in turn, the way a loop check would.",
    facts: [
      { icon: "info", text: "Sourcing outputs supply 24 V to the load; sinking outputs switch the load to 0 V." },
      { icon: "press", text: "Press Start, Stop and AUX one at a time and watch their lamps." },
      { icon: "bolt", text: "Hold Start and AUX together to test the contactor output last, on purpose." },
    ],
    io: [IO.start, IO.stop, IO.aux, IO.estop, IO.runLamp, IO.faultLamp, IO.beacon, IO.run],
    steps: [
      { line: 2, text: "Start proves I0.0 and Q0.1 together." },
      { line: 3, text: "Stop proves I0.1 and Q0.2." },
      { line: 4, text: "AUX, or the E-stop pressed, proves I0.4, I0.3 and Q0.3." },
      { line: 5, text: "The motor output needs two buttons, so it is never tested by accident." },
    ],
    code: [
      "// Loop test: each input to an output, the contactor last.",
      "RUNG 1: XIC(Start_PB) OTE(Run_Lamp)",
      "RUNG 2: XIC(Stop_PB) OTE(Fault_Lamp)",
      "RUNG 3: XIC(Aux_PB) OR XIO(EStop_OK) OTE(Beacon)",
      "RUNG 4: XIC(Start_PB) AND XIC(Aux_PB) OTE(Motor_Run)",
    ],
    specs: [
      { label: "Inputs", value: "5" },
      { label: "Outputs", value: "4" },
      { label: "Supply", value: "24 V DC, 0 V common" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "w-projects": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Number(m["Starts.ACC"] ?? 0) >= 2], message: "watched the start counter live while the program ran" },
    summary:
      "A PLC program lives in a project on a laptop: hardware configuration, tags and code. Downloading copies it into the PLC. Going online lets you watch values change live, and forcing lets you set a value by hand, which is useful and dangerous. This program counts motor starts so you can watch a value live.",
    facts: [
      { icon: "info", text: "TIA Portal and Studio 5000 both show green rungs and live values when online." },
      { icon: "press", text: "Start and stop the motor twice. Watch Starts.ACC climb in the code card." },
      { icon: "shield", text: "Never force an output on a real machine without checking nobody is near it." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.run, IO.aux],
    steps: [
      { line: 2, text: "The usual start and stop rung." },
      { line: 3, text: "Each new start adds one to the counter. Its value, ACC, is what you watch online." },
      { line: 4, text: "AUX clears the count." },
    ],
    code: [
      "// Watch Starts.ACC live while you work the buttons.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Motor_Run)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Motor_Run)",
      "RUNG 2: XIC(Motor_Run) ONS(Run_OS) CTU(Starts, 999)",
      "RUNG 3: XIC(Aux_PB) RES(Starts)",
    ],
    specs: [
      { label: "Online value", value: "Starts.ACC" },
      { label: "Download", value: "Stop, download, run" },
      { label: "Forcing", value: "Only with care" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "w-backups": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Number(m.Version ?? 0) === 2 && Boolean(m.Motor_Run) && Boolean(m.Run_Lamp)], message: "ran version 2 of the program with its recorded change" },
    summary:
      "Before changing a running machine, upload and save a backup of the program as it is, give the new one a version, and write down what changed and why. If the change goes wrong you can go back in minutes. This program carries its version number in a word and its change in a comment.",
    facts: [
      { icon: "shield", text: "Back up first, change second. Keep the backup off the laptop too." },
      { icon: "info", text: "Name files with the machine, date and version, for example Conveyor3_2027-03-14_v2." },
      { icon: "press", text: "Run it and start the motor. Version reads 2 and the run lamp works." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.run, IO.runLamp, word("Version", "The program version, written by the program itself")],
    steps: [
      { line: 1, text: "The comment records the change, the reason and who made it." },
      { line: 2, text: "MOV writes the version number every scan, so anyone online can read it." },
      { line: 4, text: "The run lamp rung is the change made in version 2." },
    ],
    code: [
      "// v2, 2027-03-14, T. Mokoena: added the run lamp at the operator's request. Backup v1 saved.",
      "RUNG 1: MOV(2, Version)",
      "RUNG 2: (XIC(Start_PB) OR XIC(Motor_Run)) AND XIO(Stop_PB) AND XIC(Overload_OK) OTE(Motor_Run)",
      "RUNG 3: XIC(Motor_Run) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Version", value: "2" },
      { label: "Backup", value: "Before every change" },
      { label: "Record", value: "What, why, who, when" },
      { label: "Level", value: "Beginner" },
    ],
  },
};
