import type { IoPoint, LessonContent } from "../types";
import { IO } from "./io";

const io = (address: string, tagName: string, color: string, connectsTo: string, description: string): IoPoint => ({ address, tagName, color, connectsTo, description });

const SEAL = "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) OTE(Run_Seal)";
const SEAL_ST = "Run_Seal := (Start_PB OR Run_Seal) AND NOT Stop_PB AND Overload_OK AND EStop_OK;";

const VS = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Start pushbutton", "Momentary, normally open"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
  ready: io("I0.2", "Drive_Ready", "#2457a6", "Drive ready relay", "1 when powered and healthy"),
  running: io("I0.3", "Drive_Running", "#2457a6", "Drive running relay", "1 while the output is live"),
  reset: io("I0.6", "Reset_PB", "#3d434a", "Reset pushbutton", "Momentary"),
  pot: io("IW64", "Speed_Pot", "#6b4fa0", "Speed potentiometer", "0 to 27648"),
  run: io("Q0.0", "Drive_Run", "#2457a6", "Drive run command", "Sent to the drive"),
  faultLamp: io("Q0.2", "Fault_Lamp", "#d64545", "Fault lamp", "Lit on a lost reply"),
  runLamp: io("Q0.3", "Run_Lamp", "#2e9e5b", "Run lamp", "Lit while the drive reports running"),
  ref: io("QW64", "Speed_Ref", "#6b4fa0", "Speed reference", "0 to 27648"),
};

const TK = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "AUTO pushbutton", "Momentary"),
  stop: io("I0.1", "Stop_PB", "#d64545", "OFF pushbutton", "Normally closed: 1 at rest, also acknowledges"),
  low: io("I0.2", "Float_Low", "#3d8fd6", "Low float, 25 %", "1 while the water covers it"),
  high: io("I0.3", "Float_High", "#3d8fd6", "High float, 80 %", "1 while the water covers it"),
  raw: io("IW64", "Level_Raw", "#6b4fa0", "Level transmitter LT1", "0 to 27648 for 0 to 100 %"),
  valve: io("Q0.0", "Inlet_Valve", "#2457a6", "Inlet solenoid valve", "Energise to open"),
  lamp: io("Q0.1", "Run_Lamp", "#2e9e5b", "Auto lamp", "Lit in automatic"),
  alarm: io("Q0.2", "Alarm_Lamp", "#d64545", "Low level alarm lamp", "Lit until acknowledged and clear"),
};

/** Advanced: structured text, function blocks, networks, HMI values, diagnostics and documentation. */
export const ADVANCED: Record<string, LessonContent> = {
  "a-structured-text": {
    difficulty: "advanced",
    checkpoint: { steps: [(m) => Boolean(m.Motor_Run), (m) => Boolean(m.Run_Lamp)], message: "ran the motor starter written in structured text" },
    summary:
      "Structured text is the IEC 61131-3 language that reads like Pascal. A rung becomes an assignment, contacts become AND, OR and NOT, and a timer is a function block you call with named inputs. The same starter you built in ladder fits in five lines.",
    facts: [
      { icon: "info", text: "This lesson opens in structured text. Switch to ladder at any time to compare." },
      { icon: "watch", text: "Each line shows its value as it runs, like the green rungs in ladder." },
      { icon: "press", text: "Tap Start. After 3 s at speed the run lamp lights." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.estop, IO.run, IO.runLamp, IO.faultLamp],
    steps: [
      { line: 2, text: "The seal-in as one boolean expression: Start OR the seal, AND NOT Stop, AND the safety inputs." },
      { line: 3, text: "Motor_Run := Run_Seal is the whole of a coil rung." },
      { line: 4, text: "The timer is an instance, Run_T, called with IN and PT." },
      { line: 5, text: "Run_T.Q is the done bit." },
      { line: 6, text: "NOT reads an input the other way round." },
    ],
    code: [
      "// The starter in ladder, for comparison.",
      SEAL,
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run)",
      "RUNG 3: XIC(Motor_Run) TON(Run_T, 3000)",
      "RUNG 4: XIC(Run_T.DN) OTE(Run_Lamp)",
      "RUNG 5: XIO(Overload_OK) OTE(Fault_Lamp)",
    ],
    st: [
      "// The motor starter in structured text.",
      "VAR",
      "  Run_T : TON;",
      "END_VAR",
      "",
      SEAL_ST,
      "Motor_Run := Run_Seal;",
      "Run_T(IN := Motor_Run, PT := T#3s);",
      "Run_Lamp := Run_T.Q;",
      "Fault_Lamp := NOT Overload_OK;",
    ],
    specs: [
      { label: "Language", value: "IEC 61131-3 ST" },
      { label: "Statements", value: "5" },
      { label: "Timer", value: "TON, 3 s" },
      { label: "Level", value: "Advanced" },
    ],
  },

  "a-function-blocks": {
    difficulty: "advanced",
    checkpoint: { steps: [(m) => Boolean(m.Beacon), (m) => !m.Beacon && !m["Starts.DN"]], message: "counted three starts with function blocks and reset the count" },
    summary:
      "A function block is a reusable piece of logic with its own memory. R_TRIG turns a signal into a one scan pulse, CTU counts pulses. Each instance keeps its own state, so two counters never share a count. Here they count motor starts and ask for a service after three.",
    facts: [
      { icon: "info", text: "Start_Edge is an R_TRIG instance, Starts a CTU instance. Both are declared in VAR." },
      { icon: "press", text: "Start and stop the motor three times. The beacon asks for a service." },
      { icon: "watch", text: "Tap AUX to reset the counter, as a technician would after the service." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.estop, IO.aux, IO.run, IO.runLamp, IO.faultLamp, IO.beacon],
    steps: [
      { line: 2, text: "The usual seal-in." },
      { line: 3, text: "Contactor and run lamp." },
      { line: 4, text: "In ladder the one shot and counter sit on one rung. In ST they are two block calls." },
      { line: 5, text: "RES in ladder, the R input in ST." },
      { line: 6, text: "The done bit, .DN in ladder and .Q in ST, lights the service beacon." },
    ],
    code: [
      "// Count starts and ask for a service after three.",
      SEAL,
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 3: XIC(Motor_Run) ONS(Start_Edge) CTU(Starts, 3)",
      "RUNG 4: XIC(Aux_PB) RES(Starts)",
      "RUNG 5: XIC(Starts.DN) OTE(Beacon)",
      "RUNG 6: XIO(Overload_OK) OTE(Fault_Lamp)",
    ],
    st: [
      "// Count starts with function blocks and ask for a service after three.",
      "VAR",
      "  Start_Edge : R_TRIG;",
      "  Starts : CTU;",
      "END_VAR",
      "",
      SEAL_ST,
      "Motor_Run := Run_Seal;",
      "Run_Lamp := Run_Seal;",
      "Start_Edge(CLK := Motor_Run);",
      "Starts(CU := Start_Edge.Q, R := Aux_PB, PV := 3);",
      "Beacon := Starts.Q;",
      "Fault_Lamp := NOT Overload_OK;",
    ],
    specs: [
      { label: "Blocks", value: "R_TRIG · CTU" },
      { label: "Service after", value: "3 starts" },
      { label: "Reset", value: "AUX" },
      { label: "Level", value: "Advanced" },
    ],
  },

  "a-comms": {
    difficulty: "advanced",
    checkpoint: { steps: [(m) => Number(m.Heartbeat) >= 5 && Boolean(m.Drive_Run)], message: "ran the drive with a live heartbeat on the network" },
    summary:
      "On a network the PLC and a drive swap words instead of wires: a control word with the run bit, a speed setpoint, and a status word back. Both ends need to know the other is alive, so the PLC counts a heartbeat every second and watches the drive's replies. No reply in time means a communications fault and a safe stop.",
    facts: [
      { icon: "info", text: "Profinet, EtherNet/IP and Modbus TCP all carry I/O this way, cyclically, every few milliseconds." },
      { icon: "watch", text: "Watch Heartbeat climb once a second in the ladder view." },
      { icon: "bolt", text: "Cut the drive's mains from its popover. With no running reply for 8 s, the PLC latches a comms fault." },
    ],
    io: [VS.start, VS.stop, VS.ready, VS.running, VS.reset, VS.pot, VS.run, VS.faultLamp, VS.runLamp, VS.ref],
    steps: [
      { line: 2, text: "Ready is checked only to start. After that the watchdog decides, and the run command drops on a communications fault." },
      { line: 4, text: "The setpoint word goes straight to the drive." },
      { line: 5, text: "Beat_T restarts itself every second." },
      { line: 6, text: "Each second the heartbeat word goes up by one. The drive would watch it change." },
      { line: 7, text: "The watchdog: commanded to run, but no running reply for 8 s." },
      { line: 8, text: "Latch the fault so it is seen." },
      { line: 9, text: "RESET clears it once the cause is fixed." },
    ],
    code: [
      "// Run a drive over the network with a heartbeat and a reply watchdog.",
      "RUNG 1: (XIC(Start_PB) XIC(Drive_Ready) OR XIC(Run_Cmd)) AND XIC(Stop_PB) AND XIO(Comms_Fault) OTE(Run_Cmd)",
      "RUNG 2: XIC(Run_Cmd) OTE(Drive_Run)",
      "RUNG 3: MOV(Speed_Pot, Speed_Ref)",
      "RUNG 4: XIO(Beat_T.DN) TON(Beat_T, 1000)",
      "RUNG 5: XIC(Beat_T.DN) ADD(Heartbeat, 1, Heartbeat)",
      "RUNG 6: XIC(Drive_Run) XIO(Drive_Running) TON(Reply_T, 8000)",
      "RUNG 7: XIC(Reply_T.DN) OTL(Comms_Fault)",
      "RUNG 8: XIC(Reset_PB) OTU(Comms_Fault)",
      "RUNG 9: XIC(Comms_Fault) OTE(Fault_Lamp)",
      "RUNG 10: XIC(Drive_Running) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Heartbeat", value: "1 s" },
      { label: "Watchdog", value: "8 s" },
      { label: "Words", value: "Control · setpoint · status" },
      { label: "Level", value: "Advanced" },
    ],
  },

  "a-hmi": {
    difficulty: "advanced",
    checkpoint: { steps: [(m) => m.State === 2, (m) => m.State === 3], message: "drove the HMI state from filling to a low level alarm" },
    summary:
      "An HMI screen does not read wires, it reads tags. Good programs prepare those tags: a level in percent instead of raw counts, one state number the screen turns into words and colours, and alarms that stay on until someone acknowledges them and the cause has gone.",
    facts: [
      { icon: "info", text: "State: 0 off, 1 auto and idle, 2 filling, 3 low level alarm. Later rungs win, so the highest priority is last." },
      { icon: "press", text: "Tap AUTO and watch State go to 2 while filling." },
      { icon: "bolt", text: "Tap OFF and raise the demand. Below 15 % the alarm latches. OFF acknowledges it once the level is back." },
    ],
    io: [TK.start, TK.stop, TK.low, TK.high, TK.raw, TK.valve, TK.lamp, TK.alarm],
    steps: [
      { line: 2, text: "AUTO seals in, OFF drops it." },
      { line: 3, text: "Fill below the low float, stop at the high float." },
      { line: 7, text: "Scale the level to percent for the screen." },
      { line: 9, text: "Start from 0 every scan, then let each condition raise the state." },
      { line: 12, text: "Below 15 % latch the low level alarm." },
      { line: 13, text: "The alarm becomes 3, the highest priority state." },
      { line: 14, text: "OFF acknowledges, but only once the level is back above 15 %." },
    ],
    code: [
      "// Tags an HMI reads: a percent level, a state number and a latched alarm.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Auto)) AND XIC(Stop_PB) OTE(Auto)",
      "RUNG 2: XIC(Auto) XIO(Float_Low) OTL(Filling)",
      "RUNG 3: XIC(Float_High) OR XIO(Auto) OTU(Filling)",
      "RUNG 4: XIC(Filling) OTE(Inlet_Valve)",
      "RUNG 5: XIC(Auto) OTE(Run_Lamp)",
      "RUNG 6: MUL(Level_Raw, 100, Level_x100)",
      "RUNG 7: DIV(Level_x100, 27648, Level_Pct)",
      "RUNG 8: MOV(0, State)",
      "RUNG 9: XIC(Auto) MOV(1, State)",
      "RUNG 10: XIC(Filling) MOV(2, State)",
      "RUNG 11: LES(Level_Pct, 15) OTL(Low_Alarm)",
      "RUNG 12: XIC(Low_Alarm) MOV(3, State)",
      "RUNG 13: XIC(Low_Alarm) XIO(Stop_PB) GEQ(Level_Pct, 15) OTU(Low_Alarm)",
      "RUNG 14: XIC(Low_Alarm) OTE(Alarm_Lamp)",
    ],
    specs: [
      { label: "States", value: "Off · idle · filling · alarm" },
      { label: "Alarm", value: "Below 15 %" },
      { label: "Acknowledge", value: "OFF, once clear" },
      { label: "Level", value: "Advanced" },
    ],
  },

  "a-fault-finding": {
    difficulty: "advanced",
    checkpoint: {
      steps: [(m, _i, f) => Boolean(f.stuckStart) && Boolean(m.Start_Stuck), (m, _i, f) => Boolean(f.jam) && Boolean(m.Stalled) && !m.Motor_Run],
      message: "caught a stuck button and a stalled motor with built in diagnostics",
    },
    summary:
      "Most downtime is spent finding the fault, not fixing it. A program can do half the finding for you: it knows how long a button should be pressed and how much current a running motor should draw. When something is outside that, it stops safely and says exactly what it saw.",
    facts: [
      { icon: "bolt", text: "Stick the Start button from its popover. After 5 s the program flags a stuck button and will not start." },
      { icon: "bolt", text: "Jam the shaft while running. Over 6 A for 1.5 s is a stall: the program stops the motor before the overload has to." },
      { icon: "watch", text: "Clear the cause, then tap AUX to reset. The beacon shows a latched diagnostic." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.estop, IO.aux, IO.amps, IO.run, IO.runLamp, IO.faultLamp, IO.beacon],
    steps: [
      { line: 2, text: "The seal refuses while a diagnostic is latched." },
      { line: 4, text: "Nobody holds Start for 5 s. If it reads pressed that long, it is stuck." },
      { line: 5, text: "Latch Start_Stuck." },
      { line: 6, text: "Starting current falls below 6 A within half a second. Above 6 A for 1.5 s while running is a stall." },
      { line: 7, text: "Latch Stalled. The seal drops and K1 opens." },
      { line: 8, text: "AUX resets both, but only once Start has been released." },
      { line: 9, text: "Either diagnostic lights the beacon." },
    ],
    code: [
      "// Diagnostics: a stuck start button and a stalled motor.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Seal)) AND XIO(Stop_PB) AND XIC(Overload_OK) AND XIC(EStop_OK) AND XIO(Start_Stuck) AND XIO(Stalled) OTE(Run_Seal)",
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "RUNG 3: XIC(Start_PB) TON(Held_T, 5000)",
      "RUNG 4: XIC(Held_T.DN) OTL(Start_Stuck)",
      "RUNG 5: XIC(Motor_Run) GRT(Motor_Amps, 60) TON(Stall_T, 1500)",
      "RUNG 6: XIC(Stall_T.DN) OTL(Stalled)",
      "RUNG 7: XIO(Start_PB) XIC(Aux_PB) OTU(Start_Stuck) OTU(Stalled)",
      "RUNG 8: XIC(Start_Stuck) OR XIC(Stalled) OTE(Beacon)",
      "RUNG 9: XIO(Overload_OK) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Stuck button", value: "Held 5 s" },
      { label: "Stall", value: "Over 6 A for 1.5 s" },
      { label: "Reset", value: "AUX" },
      { label: "Level", value: "Advanced" },
    ],
  },

  "a-documentation": {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => Number(m.Run_Secs) >= 5, (m) => Number(m.Starts) >= 2], message: "logged run time and starts for the handover pack" },
    summary:
      "A program is handed over with the machine. Whoever opens it next needs to know what each rung is for, which drawing it matches, and what the maintenance numbers mean. Comments, clear tag names and run hours and start counts make the program part of the documentation.",
    facts: [
      { icon: "info", text: "Every block of rungs starts with a comment naming its purpose and the drawing it comes from." },
      { icon: "watch", text: "Run_Secs counts seconds of running, Starts counts starts. Both go in the maintenance log." },
      { icon: "press", text: "Run the motor for 5 s, stop it and start it again." },
    ],
    io: [IO.start, IO.stop, IO.ol, IO.estop, IO.run, IO.runLamp, IO.faultLamp],
    steps: [
      { line: 1, text: "The header names the motor, the panel and the drawing sheet." },
      { line: 3, text: "The seal-in, with its stop conditions spelled out in the comment above." },
      { line: 5, text: "Outputs, with their devices and addresses in the comment." },
      { line: 7, text: "A one second clock while running." },
      { line: 8, text: "Each tick adds one to Run_Secs." },
      { line: 10, text: "A one shot counts each start once." },
      { line: 12, text: "The fault lamp, documented with both of its causes." },
    ],
    code: [
      "// Motor M1, conveyor drive. Panel CP1, drawing E-102 sheet 3.",
      "// Start and stop with seal-in. Stops on Stop, overload F2 or E-stop S0.",
      SEAL,
      "// Outputs: contactor K1 on Q0.0, run lamp H1 on Q0.1.",
      "RUNG 2: XIC(Run_Seal) OTE(Motor_Run) OTE(Run_Lamp)",
      "// Run time in seconds for the maintenance log.",
      "RUNG 3: XIC(Motor_Run) XIO(Sec_T.DN) TON(Sec_T, 1000)",
      "RUNG 4: XIC(Sec_T.DN) ADD(Run_Secs, 1, Run_Secs)",
      "// Start count for the maintenance log.",
      "RUNG 5: XIC(Motor_Run) ONS(Start_OS) ADD(Starts, 1, Starts)",
      "// Fault lamp H2 on Q0.2: overload tripped or E-stop pressed.",
      "RUNG 6: XIO(Overload_OK) OR XIO(EStop_OK) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "6" },
      { label: "Logged", value: "Run seconds · starts" },
      { label: "Drawing", value: "E-102 sheet 3" },
      { label: "Level", value: "Intermediate" },
    ],
  },
};
