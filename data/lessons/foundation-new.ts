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

const PP = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Cycle start pushbutton", "Momentary, normally open"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
  air: io("I0.2", "Air_OK", "#3d8fd6", "Pressure switch", "1 while the air is above 4 bar"),
  part: io("I0.3", "Part_In", "#3d434a", "Magazine sensor", "1 while a part waits"),
  aHome: io("I0.4", "A_Home", "#6b6f76", "Reed switch, A retracted", "1 when cylinder A is home"),
  aEnd: io("I0.5", "A_End", "#6b6f76", "Reed switch, A extended", "1 when cylinder A is fully out"),
  bHome: io("I0.6", "B_Home", "#6b6f76", "Reed switch, B up", "1 when cylinder B is up"),
  bEnd: io("I0.7", "B_End", "#6b6f76", "Reed switch, B down", "1 when cylinder B is fully down"),
  aExt: io("Q0.0", "A_Extend", "#2457a6", "Valve Y1", "Cylinder A out; a spring brings it back"),
  bExt: io("Q0.1", "B_Extend", "#2457a6", "Valve Y2", "Cylinder B down"),
  bRet: io("Q0.2", "B_Retract", "#2457a6", "Valve Y3", "Cylinder B up"),
  lamp: io("Q0.3", "Run_Lamp", "#2e9e5b", "Green cycle lamp", "Lit while a cycle runs"),
};

const HM = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Auto start pushbutton", "Momentary, normally open"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
  high: io("I0.3", "Float_High", "#3d8fd6", "High float switch", "1 when the water covers it"),
  raw: io("IW64", "Level_Raw", "#6b4fa0", "Level transmitter LT1", "0 to 27648 for 0 to 100 %"),
  valve: io("Q0.0", "Inlet_Valve", "#2457a6", "Inlet solenoid valve", "Opens when energised"),
  auto: io("Q0.1", "Run_Lamp", "#2e9e5b", "Auto lamp", "Shown on the screen as AUTO"),
  alarm: io("Q0.2", "Alarm_Lamp", "#d64545", "Alarm lamp", "Shown on the screen as the alarm banner"),
  hStart: io("HMI", "HMI_Start", "#2e9e5b", "Screen START button", "Written by the HMI while touched"),
  hStop: io("HMI", "HMI_Stop", "#d64545", "Screen STOP button", "Written by the HMI while touched"),
  hAck: io("HMI", "HMI_Ack", "#e0a526", "Screen ACK button", "Written by the HMI while touched"),
};

const AUTO_HMI = "RUNG 1: (XIC(Start_PB) OR XIC(HMI_Start) OR XIC(Run_Lamp)) AND XIC(Stop_PB) AND XIO(HMI_Stop) OTE(Run_Lamp)";
const FILL = "RUNG 2: XIC(Run_Lamp) XIO(Float_High) OTE(Inlet_Valve)";

export const FOUNDATION_MACHINES: Record<string, LessonContent> = {
  "f-pneu-air": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Run_Lamp), (m, i) => Boolean(i.A_Home) && !m.A_Out], message: "sent cylinder A out, saw its end switch and brought it home" },
    summary:
      "Compressed air moves a lot of machinery. A compressor fills a receiver, a filter, regulator and lubricator unit cleans the air and sets the pressure, and valves send it to cylinders. This lab sends cylinder A out on Start and home on Stop, and uses the reed switch at the end of its stroke.",
    facts: [
      { icon: "info", text: "Typical supply is 6 bar. A pressure switch tells the PLC the air is on." },
      { icon: "press", text: "Tap Start: cylinder A goes out. Its end reed switch lights the cycle lamp." },
      { icon: "bolt", text: "Turn the air off at the FRL and try again: the valve switches, but nothing moves." },
    ],
    io: [PP.start, PP.stop, PP.air, PP.aHome, PP.aEnd, PP.aExt, PP.lamp],
    steps: [
      { line: 2, text: "Start only sends A out if the air is on." },
      { line: 3, text: "Stop, wired NC, brings it home." },
      { line: 4, text: "Y1 is a single solenoid valve: energised, A goes out; released, a spring sends it home." },
      { line: 5, text: "The reed switch at the end of the stroke proves A got there." },
    ],
    code: [
      "// One cylinder, one valve, two reed switches.",
      "RUNG 1: XIC(Start_PB) XIC(Air_OK) OTL(A_Out)",
      "RUNG 2: XIO(Stop_PB) OTU(A_Out)",
      "RUNG 3: XIC(A_Out) OTE(A_Extend)",
      "RUNG 4: XIC(A_End) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Supply", value: "6 bar" },
      { label: "Valve", value: "5/2, single solenoid" },
      { label: "Sensors", value: "Reed switches" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-pneu-seq": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Number(m.Step) === 2, (m) => Number(m.Step) === 4, (m) => Number(m["Cycles.ACC"] ?? 0) >= 1], message: "ran a full A+ B+ B- A- cycle, one step at a time" },
    summary:
      "Machines with cylinders run in sequences. Engineers write them as A+ B+ B- A-: A out, B down, B up, A home. Each step waits for the reed switch of the move before it, so nothing moves until the last move has finished. This program keeps the step number in a word and moves on when each sensor says so.",
    facts: [
      { icon: "press", text: "Tap Start with a part in the magazine. Watch Step go 1, 2, 3, 4 and back to 0." },
      { icon: "info", text: "B has a double solenoid valve: Y2 sends it down, Y3 sends it up, and it stays put in between." },
      { icon: "bolt", text: "Move A's end switch out of position from its popover: the sequence waits at step 1, as it should." },
    ],
    io: [PP.start, PP.stop, PP.air, PP.part, PP.aHome, PP.aEnd, PP.bHome, PP.bEnd, PP.aExt, PP.bExt, PP.bRet, PP.lamp],
    steps: [
      { line: 2, text: "Step 0 is home. A cycle starts only with air, a part, and both cylinders home." },
      { line: 3, text: "Step 1, A+: when A's end switch closes, go to step 2." },
      { line: 4, text: "Step 2, B+: when B is down, go to step 3." },
      { line: 5, text: "Step 3, B-: when B is back up, go to step 4." },
      { line: 6, text: "Step 4, A-: when A is home, count the cycle." },
      { line: 7, text: "Then go back to step 0, ready for the next one." },
      { line: 8, text: "Stop sends the sequence back to step 0." },
      { line: 9, text: "The outputs are decided by the step number alone." },
    ],
    code: [
      "// A+ B+ B- A-, one step at a time.",
      "RUNG 1: XIC(Start_PB) XIC(Air_OK) XIC(Part_In) XIC(A_Home) XIC(B_Home) EQU(Step, 0) MOV(1, Step)",
      "RUNG 2: EQU(Step, 1) XIC(A_End) MOV(2, Step)",
      "RUNG 3: EQU(Step, 2) XIC(B_End) MOV(3, Step)",
      "RUNG 4: EQU(Step, 3) XIC(B_Home) MOV(4, Step)",
      "RUNG 5: EQU(Step, 4) XIC(A_Home) CTU(Cycles, 999)",
      "RUNG 6: EQU(Step, 4) XIC(A_Home) MOV(0, Step)",
      "RUNG 7: XIO(Stop_PB) MOV(0, Step)",
      "RUNG 8: GEQ(Step, 1) LEQ(Step, 3) OTE(A_Extend)",
      "RUNG 9: EQU(Step, 2) OTE(B_Extend)",
      "RUNG 10: EQU(Step, 3) OTE(B_Retract)",
      "RUNG 11: GRT(Step, 0) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Sequence", value: "A+ B+ B- A-" },
      { label: "Steps", value: "5, numbered 0 to 4" },
      { label: "Valves", value: "Single and double solenoid" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-hmi-what": {
    difficulty: "beginner",
    checkpoint: { steps: [(m, i) => Boolean(m.Run_Lamp) && Boolean(i.HMI_Start), (m, i) => !m.Run_Lamp && Boolean(i.HMI_Stop)], message: "started and stopped the process from the screen" },
    summary:
      "An HMI is the screen on or near a machine; SCADA is the software in a control room that watches a whole plant. Both read and write tags in the PLC. A button on the screen writes a bit, and the program decides what to do with it, exactly as it would with a wired button. This lab runs the tank from the screen or the panel.",
    facts: [
      { icon: "press", text: "Touch START on the screen. The tank goes into automatic and the screen shows AUTO." },
      { icon: "info", text: "Siemens WinCC, Rockwell FactoryTalk, AVEVA and Ignition are common HMI and SCADA products." },
      { icon: "shield", text: "Screen buttons are never safety devices. The E-stop and Stop stay hard wired." },
    ],
    io: [HM.start, HM.stop, HM.hStart, HM.hStop, HM.high, HM.valve, HM.auto],
    steps: [
      { line: 2, text: "Auto starts from the panel button or the screen button, and stops from either Stop." },
      { line: 3, text: "In auto the inlet fills the tank up to the high float." },
    ],
    code: ["// The screen writes bits; the program decides.", AUTO_HMI, FILL],
    specs: [
      { label: "HMI", value: "Touch panel at the machine" },
      { label: "SCADA", value: "Control room software" },
      { label: "Link", value: "Ethernet, reads and writes tags" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-hmi-screen": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Number(m.Status) === 1, (m) => Number(m.Status) === 2], message: "showed FILLING and then FULL on the screen" },
    summary:
      "A good operator screen shows the state of the process at a glance: what is running, what is filling, what needs attention. The program often writes a status number for the screen to show as text and colour. This program writes 0 for stopped, 1 for filling and 2 for full.",
    facts: [
      { icon: "press", text: "Touch START. Status becomes 1, filling, while the inlet is open." },
      { icon: "watch", text: "When the high float is reached, Status becomes 2, full." },
      { icon: "info", text: "Grey for normal, colour only for what needs attention: this is the idea behind ISA-101 screens." },
    ],
    io: [HM.start, HM.stop, HM.hStart, HM.hStop, HM.high, HM.valve, HM.auto, word("Status", "0 stopped, 1 filling, 2 full: shown on the screen")],
    steps: [
      { line: 4, text: "Status starts each scan at 0, stopped." },
      { line: 5, text: "In auto with the inlet open, it becomes 1, filling." },
      { line: 6, text: "In auto at the high float, it becomes 2, full. Later rungs win." },
    ],
    code: ["// A status number for the screen.", AUTO_HMI, FILL, "RUNG 3: MOV(0, Status)", "RUNG 4: XIC(Run_Lamp) XIC(Inlet_Valve) MOV(1, Status)", "RUNG 5: XIC(Run_Lamp) XIC(Float_High) MOV(2, Status)"],
    specs: [
      { label: "Status 0", value: "Stopped" },
      { label: "Status 1", value: "Filling" },
      { label: "Status 2", value: "Full" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "f-hmi-alarms": {
    difficulty: "beginner",
    checkpoint: { steps: [(m) => Boolean(m.Alarm_Lamp) && !m.Alarm_Acked, (m) => Boolean(m.Alarm_Acked), (m) => !m.Alarm_Lamp], message: "raised a high level alarm, acknowledged it and saw it clear" },
    summary:
      "An alarm tells the operator something needs action. It flashes until someone acknowledges it, stays on while the problem lasts, and clears only when it is both acknowledged and gone. A trend shows how a value got there. Here a high level alarm comes on above 85 %, the screen flashes it, and ACK steadies it.",
    facts: [
      { icon: "bolt", text: "Make the inlet valve stick open from its popover. The level climbs past 85 % and the alarm flashes." },
      { icon: "press", text: "Touch ACK. The banner goes steady. Fix the valve and stop auto; the level falls and the alarm clears." },
      { icon: "watch", text: "The trend on the screen shows the level climbing, then falling." },
    ],
    io: [HM.start, HM.stop, HM.hStart, HM.hStop, HM.hAck, HM.raw, HM.valve, HM.auto, HM.alarm],
    steps: [
      { line: 4, text: "Above 23500, 85 %, for 2 s raises the alarm. The delay stops ripples raising it." },
      { line: 5, text: "The alarm latches, so it is not missed if the level dips." },
      { line: 6, text: "ACK from the screen marks it acknowledged." },
      { line: 7, text: "It clears only when acknowledged and the level is back below 80 %." },
      { line: 8, text: "No alarm, no acknowledgement left over." },
      { line: 9, text: "The alarm lamp and the screen banner follow the alarm." },
    ],
    code: [
      "// A high level alarm: raise, acknowledge, clear.",
      AUTO_HMI,
      FILL,
      "RUNG 3: GRT(Level_Raw, 23500) TON(Hi_T, 2000)",
      "RUNG 4: XIC(Hi_T.DN) OTL(Alarm_Active)",
      "RUNG 5: XIC(Alarm_Active) XIC(HMI_Ack) OTL(Alarm_Acked)",
      "RUNG 6: XIC(Alarm_Acked) LES(Level_Raw, 22000) OTU(Alarm_Active)",
      "RUNG 7: XIO(Alarm_Active) OTU(Alarm_Acked)",
      "RUNG 8: XIC(Alarm_Active) OTE(Alarm_Lamp)",
    ],
    specs: [
      { label: "Alarm", value: "High level, 85 %" },
      { label: "Delay", value: "2 s" },
      { label: "Clears", value: "Acknowledged and below 80 %" },
      { label: "Level", value: "Beginner" },
    ],
  },
};
