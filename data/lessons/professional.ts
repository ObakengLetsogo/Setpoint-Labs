import type { IoPoint, LessonContent } from "../types";

// Professional lessons added from the Curriculum and Lecture Guide.

const io = (address: string, tagName: string, color: string, connectsTo: string, description: string): IoPoint => ({ address, tagName, color, connectsTo, description });

/* ------------------------------------------------------------------ PID */

const LP = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Auto start pushbutton", "Momentary, normally open"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
  sel: io("I0.2", "Auto_Sel", "#6b6f76", "Hand / auto selector", "1 in auto"),
  lt: io("IW64", "Level_PV", "#6b4fa0", "Level transmitter LT1", "0.0 to 100.0 %, scaled by the card"),
  ft: io("IW66", "Flow_PV", "#6b4fa0", "Flow transmitter FT1", "0.0 to 100.0 %, scaled by the card"),
  sp: io("HMI", "Level_SP", "#2457a6", "Level setpoint", "Set on the faceplate, %"),
  hand: io("HMI", "Hand_CV", "#2457a6", "Hand output", "The valve opening the operator sets in hand, %"),
  cv: io("QW80", "Valve_CV", "#2457a6", "Control valve FV1", "0 to 100 % open, 4-20 mA"),
  lamp: io("Q0.0", "Run_Lamp", "#2e9e5b", "Auto lamp", "Lit while the loop is in auto"),
};

const AUTO = "RUNG 1: (XIC(Start_PB) OR XIC(Run_Lamp)) AND XIC(Stop_PB) AND XIC(Auto_Sel) OTE(Run_Lamp)";
const LEVEL_PID = "XIC(Run_Lamp) PID(LIC1, Level_PV, Level_SP, Valve_CV)";
const HAND = "XIO(Run_Lamp) MOV(Hand_CV, Valve_CV)";

export const PRO_PID: Record<string, LessonContent> = {
  "p-pid-what": {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => Boolean(m.Run_Lamp), (m) => Boolean(m.Run_Lamp) && Math.abs(Number(m.Level_PV) - Number(m.Level_SP)) < 10], message: "put the loop in auto and brought the level near its setpoint with proportional control" },
    summary:
      "On and off control slams a valve open and shut, so the level swings between two limits. A closed loop controller measures the level (PV), compares it with the setpoint (SP) and opens a control valve (CV) by just the right amount. This first program uses only the P of PID: the further the level is from setpoint, the more the valve opens. Watch what happens when the demand changes.",
    facts: [
      { icon: "press", text: "Turn the selector to auto and tap Start. The valve opens in proportion to the error." },
      { icon: "watch", text: "The level settles, but not on setpoint. That gap is offset, and P alone always leaves one." },
      { icon: "bolt", text: "Turn the plant demand up. The offset grows: more flow needs more error to hold it open." },
    ],
    io: [LP.start, LP.stop, LP.sel, LP.lt, LP.sp, LP.hand, LP.cv, LP.lamp],
    steps: [
      { line: 2, text: "The loop runs in auto only with the selector in auto and Start pressed." },
      { line: 3, text: "KP is the gain: 3 % of valve for each 1 % of level error." },
      { line: 4, text: "TI 0 switches the integral off. This is proportional only control." },
      { line: 5, text: "In auto, PID compares Level_PV with Level_SP and writes Valve_CV." },
      { line: 6, text: "In hand, the operator's output goes straight to the valve." },
    ],
    code: ["// Proportional only: the valve opens with the error.", AUTO, "RUNG 2: MOV(3, LIC1.KP)", "RUNG 3: MOV(0, LIC1.TI)", `RUNG 4: ${LEVEL_PID}`, `RUNG 5: ${HAND}`],
    specs: [
      { label: "Loop", value: "LIC1, tank level" },
      { label: "Mode", value: "P only" },
      { label: "KP", value: "3" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "p-pid-block": {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => !m.Run_Lamp && Number(m.Valve_CV) > 0, (m) => Boolean(m.Run_Lamp), (m) => Boolean(m.Run_Lamp) && Math.abs(Number(m.Level_PV) - Number(m.Level_SP)) < 2], message: "ran the valve by hand, switched to auto without a bump and held the setpoint" },
    summary:
      "A real PID block needs its tuning, a direction, and a hand mode. Adding integral (TI) removes the offset: it keeps moving the valve as long as any error is left. In hand the operator sets the valve and the block tracks it, so switching to auto does not bump the valve. That is called bumpless transfer.",
    facts: [
      { icon: "press", text: "In hand, set the hand output to 30 % on the valve's popover. The valve follows you." },
      { icon: "watch", text: "Switch to auto and tap Start. The valve carries on from 30 %, then the PID takes over." },
      { icon: "info", text: "The level settles on setpoint this time. The integral removed the offset." },
    ],
    io: [LP.start, LP.stop, LP.sel, LP.lt, LP.sp, LP.hand, LP.cv, LP.lamp],
    steps: [
      { line: 3, text: "KP 4: the proportional part reacts to the size of the error." },
      { line: 4, text: "TI 120 s: the integral repeats the P action every 120 s while an error remains." },
      { line: 5, text: "TD 0: no derivative. Most level and flow loops do not need it." },
      { line: 6, text: "In auto the PID writes the valve." },
      { line: 7, text: "In hand the operator writes the valve, and the PID's integral quietly follows." },
    ],
    code: ["// A complete level loop: tuning, auto and hand.", AUTO, "RUNG 2: MOV(4, LIC1.KP)", "RUNG 3: MOV(120, LIC1.TI)", "RUNG 4: MOV(0, LIC1.TD)", `RUNG 5: ${LEVEL_PID}`, `RUNG 6: ${HAND}`],
    specs: [
      { label: "KP", value: "4" },
      { label: "TI", value: "120 s" },
      { label: "TD", value: "0" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "p-pid-tune": {
    difficulty: "advanced",
    checkpoint: { steps: [(m) => Boolean(m.Run_Lamp), (m) => Boolean(m["Settled.DN"])], message: "tuned the loop so the level held within 2 % of setpoint for 15 s" },
    summary:
      "This loop is tuned far too hard: KP 8 and TI 5 s. Put it in auto and watch the trend swing. Tuning means changing KP and TI until the level reaches setpoint quickly and stays there. A safe method on site: start gentle, raise KP until the loop just starts to swing, halve it, then shorten TI until offsets clear in a reasonable time.",
    facts: [
      { icon: "watch", text: "Run it as it is. The valve slams between 0 and 100 % and the level never settles." },
      { icon: "press", text: "Change KP to 4 and TI to 120, then run again. Settled turns on after 15 s inside 2 %." },
      { icon: "bolt", text: "Try the stiction fault on the valve: a sticking valve makes a sawtooth no tuning can fix." },
    ],
    io: [LP.start, LP.stop, LP.sel, LP.lt, LP.sp, LP.hand, LP.cv, LP.lamp],
    steps: [
      { line: 3, text: "KP 8 is too much gain for this tank." },
      { line: 4, text: "TI 5 s is far too short: the integral piles up error faster than the tank can respond." },
      { line: 7, text: "Err is how far the level is from setpoint." },
      { line: 8, text: "Settled times while the error stays within plus or minus 2 %, and resets as soon as it leaves." },
    ],
    code: [
      "// Tune me: change KP and TI until the level settles.",
      AUTO,
      "RUNG 2: MOV(8, LIC1.KP)",
      "RUNG 3: MOV(5, LIC1.TI)",
      `RUNG 4: ${LEVEL_PID}`,
      `RUNG 5: ${HAND}`,
      "RUNG 6: SUB(Level_PV, Level_SP, Err)",
      "RUNG 7: XIC(Run_Lamp) GRT(Err, -2) LES(Err, 2) TON(Settled, 15000)",
    ],
    specs: [
      { label: "Start", value: "KP 8, TI 5 s" },
      { label: "Goal", value: "Within 2 % for 15 s" },
      { label: "Method", value: "Gentle first, then tighten" },
      { label: "Level", value: "Advanced" },
    ],
  },

  "p-pid-cascade": {
    difficulty: "advanced",
    checkpoint: { steps: [(m) => Boolean(m.Run_Lamp), (m) => Boolean(m.Run_Lamp) && Number(m["FIC1.KP"]) > 0 && Math.abs(Number(m.Level_PV) - Number(m.Level_SP)) < 2], message: "ran a level loop cascaded onto a flow loop and held the setpoint" },
    summary:
      "When the supply pressure upstream changes, the same valve opening gives a different flow. A single level loop only notices once the level has moved. In cascade, the level loop (the master) sets a flow setpoint, and a fast flow loop (the slave) moves the valve to get exactly that flow. The flow loop corrects a supply change in seconds, before the level has time to move.",
    facts: [
      { icon: "press", text: "Run in auto until the level settles. Then drop the supply pressure to 0.6 on its gauge." },
      { icon: "watch", text: "The flow loop opens the valve within seconds. The level hardly moves." },
      { icon: "info", text: "Compare with the tuning lesson's single loop: the same supply drop costs it 4 % of level and minutes to recover." },
    ],
    io: [LP.start, LP.stop, LP.sel, LP.lt, LP.ft, LP.sp, LP.hand, LP.cv, LP.lamp],
    steps: [
      { line: 3, text: "The master is slow and gentle: the tank is slow." },
      { line: 5, text: "The slave is fast: flow answers the valve in a second or two." },
      { line: 7, text: "LIC1 turns the level error into a flow setpoint, Flow_SP." },
      { line: 8, text: "FIC1 turns the flow error into a valve opening." },
      { line: 9, text: "In hand the operator sets the valve." },
      { line: 10, text: "In hand Flow_SP tracks the measured flow, so going to auto is bumpless for both loops." },
    ],
    code: [
      "// Cascade: the level loop sets the flow loop's setpoint.",
      AUTO,
      "RUNG 2: MOV(3, LIC1.KP)",
      "RUNG 3: MOV(120, LIC1.TI)",
      "RUNG 4: MOV(0.4, FIC1.KP)",
      "RUNG 5: MOV(2, FIC1.TI)",
      "RUNG 6: XIC(Run_Lamp) PID(LIC1, Level_PV, Level_SP, Flow_SP)",
      "RUNG 7: XIC(Run_Lamp) PID(FIC1, Flow_PV, Flow_SP, Valve_CV)",
      `RUNG 8: ${HAND}`,
      "RUNG 9: XIO(Run_Lamp) MOV(Flow_PV, Flow_SP)",
    ],
    specs: [
      { label: "Master", value: "LIC1, KP 3, TI 120 s" },
      { label: "Slave", value: "FIC1, KP 0.4, TI 2 s" },
      { label: "Rejects", value: "Supply pressure changes" },
      { label: "Level", value: "Advanced" },
    ],
  },
};

/* ------------------------------------------------------- instrumentation */

const IN = {
  pt: io("IW64", "PT_Raw", "#6b4fa0", "Pressure transmitter PT1", "4-20 mA for 0 to 10 bar: 0 to 27648"),
  lt: io("IW66", "LT_Raw", "#6b4fa0", "Level transmitter LT1", "4-20 mA for 0 to 100 %"),
  ft: io("IW68", "FT_Raw", "#6b4fa0", "Flow transmitter FT1", "4-20 mA for 0 to 100 %"),
  tt: io("IW70", "TT_Raw", "#6b4fa0", "Temperature transmitter TT1", "4-20 mA for 0 to 150 °C"),
  urv: io("HART", "PT_URV", "#0f766e", "PT1 upper range, over HART", "In tenths of a bar: 100 is 10.0 bar"),
  status: io("HART", "PT_Status", "#0f766e", "PT1 device status, over HART", "0 healthy, 1 sensor fault"),
  lamp: io("Q0.0", "Fault_Lamp", "#d64545", "Instrument fault lamp", "Lit on any instrument fault"),
};

/** 3.6 mA and 21 mA in raw counts: the NAMUR NE43 limits for a failed transmitter. */
const LOW = -691;
const HIGH = 29376;

export const PRO_INSTRUMENTS: Record<string, LessonContent> = {
  "p-inst-tx": {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => Number(m.Temp_C) >= 100, (m) => Boolean(m.FT_Fault), (m) => Boolean(m.TT_Fault)], message: "scaled four transmitters and caught a dead loop and a broken sensor" },
    summary:
      "A transmitter turns a process value into a current: 4 mA at the bottom of its range, 20 mA at the top. The analogue card turns that into a number, 0 to 27648 on a Siemens card. The program scales it back into bar, percent or degrees. Because 0 % is 4 mA and not 0 mA, the program can tell a real zero from a broken wire.",
    facts: [
      { icon: "press", text: "Raise the temperature to 100 °C on TT1. Temp_C follows." },
      { icon: "bolt", text: "Open FT1's loop from its popover. FT_Raw falls below zero and FT_Fault lights the lamp." },
      { icon: "bolt", text: "Break TT1's RTD wire. The transmitter drives above 21 mA: upscale burnout." },
    ],
    io: [IN.pt, IN.lt, IN.ft, IN.tt, IN.lamp],
    steps: [
      { line: 2, text: "Pressure: raw times 100 divided by 27648 gives tenths of a bar, 0 to 100 for 0 to 10 bar. Adding 13824, half of 27648, first makes the division round instead of cut off." },
      { line: 3, text: "Level and flow scale to percent the same way." },
      { line: 5, text: "Temperature: raw times 150 divided by 27648 gives 0 to 150 °C." },
      { line: 6, text: "Below 3.6 mA the loop is dead or the transmitter has failed low." },
      { line: 7, text: "Above 21 mA the transmitter has failed high, as a broken RTD does." },
      { line: 8, text: "Either fault lights the lamp." },
    ],
    code: [
      "// Four transmitters, scaled to engineering units.",
      "RUNG 1: MUL(PT_Raw, 100, T_P) ADD(T_P, 13824, T_P) DIV(T_P, 27648, Press_dBar)",
      "RUNG 2: MUL(LT_Raw, 100, T_L) ADD(T_L, 13824, T_L) DIV(T_L, 27648, Level_Pct)",
      "RUNG 3: MUL(FT_Raw, 100, T_F) ADD(T_F, 13824, T_F) DIV(T_F, 27648, Flow_Pct)",
      "RUNG 4: MUL(TT_Raw, 150, T_T) ADD(T_T, 13824, T_T) DIV(T_T, 27648, Temp_C)",
      `RUNG 5: LES(FT_Raw, ${LOW}) OTE(FT_Fault)`,
      `RUNG 6: GRT(TT_Raw, ${HIGH}) OTE(TT_Fault)`,
      "RUNG 7: XIC(FT_Fault) OR XIC(TT_Fault) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Signal", value: "4-20 mA, two wire" },
      { label: "Card", value: "0 to 27648" },
      { label: "Fault limits", value: "Below 3.6, above 21 mA" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "p-inst-cal": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [
        (_m, i) => Math.abs(Number(i.PT_Raw)) <= 140,
        (_m, i) => Math.abs(Number(i.PT_Raw) - 6912) <= 140,
        (_m, i) => Math.abs(Number(i.PT_Raw) - 13824) <= 140,
        (_m, i) => Math.abs(Number(i.PT_Raw) - 20736) <= 140,
        (_m, i) => Math.abs(Number(i.PT_Raw) - 27648) <= 140,
      ],
      message: "injected 4, 8, 12, 16 and 20 mA and proved the loop at five points",
    },
    summary:
      "Calibration proves an instrument reads true, and loop testing proves the whole signal path from the field to the PLC. A loop calibrator can measure the current or replace the transmitter and source a known current. The standard check is five points: 0, 25, 50, 75 and 100 % of range, recorded as found, then adjusted and recorded as left.",
    facts: [
      { icon: "press", text: "Switch the calibrator to source. Inject 4, 8, 12, 16 and 20 mA in turn and read Press_dBar." },
      { icon: "info", text: "Expected: 0, 25, 50, 75 and 100 tenths of a bar. Each point should be within 0.5 %." },
      { icon: "bolt", text: "Inject 3 mA or 22 mA: the fault lamp proves the PLC's fault detection works too." },
    ],
    io: [IN.pt, IN.lamp],
    steps: [
      { line: 2, text: "The same scaling as the transmitter lesson: this is what the operator will see." },
      { line: 3, text: "Outside 3.6 to 21 mA is a fault, whatever the cause." },
    ],
    code: ["// Loop test PT1 from the field end.", "RUNG 1: MUL(PT_Raw, 100, T_P) ADD(T_P, 13824, T_P) DIV(T_P, 27648, Press_dBar)", `RUNG 2: LES(PT_Raw, ${LOW}) OR GRT(PT_Raw, ${HIGH}) OTE(Fault_Lamp)`],
    specs: [
      { label: "Points", value: "0, 25, 50, 75, 100 %" },
      { label: "Records", value: "As found, as left" },
      { label: "Tolerance", value: "Typically 0.5 %" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "p-inst-hart": {
    difficulty: "advanced",
    checkpoint: { steps: [(m, i) => Number(i.PT_URV) !== 100 && Number(m.Press_dBar) > 0, (m) => Boolean(m.PT_Diag)], message: "re-ranged a smart transmitter over HART, kept the reading right and caught its sensor fault" },
    summary:
      "A smart transmitter sends HART digital data on top of its 4-20 mA signal, on the same two wires. With a HART communicator you can read its tag, change its range, trim it and read its diagnostics without opening it. A HART-capable input card also passes the range and status to the PLC, so the program can scale with the transmitter's real range and alarm on its own diagnosis.",
    facts: [
      { icon: "press", text: "Set 4 bar on PT1. Then re-range it to 0-16 bar on the HART communicator. Press_dBar still reads 40." },
      { icon: "info", text: "A program with a fixed 0-10 bar scaling would now read 25: a classic site mistake." },
      { icon: "bolt", text: "Fail PT1's sensor. It drives to 3.6 mA and reports the fault over HART: PT_Diag lights." },
    ],
    io: [IN.pt, IN.urv, IN.status, IN.lamp],
    steps: [
      { line: 2, text: "Scale with the range the transmitter reports, not a number typed in years ago." },
      { line: 3, text: "The transmitter's own diagnosis, read over HART." },
      { line: 4, text: "A low current is caught too, in case HART is lost." },
      { line: 5, text: "Either one lights the fault lamp." },
    ],
    code: [
      "// Scale from the range the smart transmitter reports.",
      "RUNG 1: MUL(PT_Raw, PT_URV, T_P) ADD(T_P, 13824, T_P) DIV(T_P, 27648, Press_dBar)",
      "RUNG 2: GRT(PT_Status, 0) OTE(PT_Diag)",
      `RUNG 3: LES(PT_Raw, ${LOW}) OTE(PT_Low)`,
      "RUNG 4: XIC(PT_Diag) OR XIC(PT_Low) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Protocol", value: "HART on 4-20 mA" },
      { label: "Tools", value: "Communicator, HART card" },
      { label: "Failure", value: "NAMUR NE43, 3.6 mA" },
      { label: "Level", value: "Advanced" },
    ],
  },
};

/* ------------------------------------------------ machines and drives */

const PP = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Cycle start pushbutton", "Momentary, normally open"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
  air: io("I0.2", "Air_OK", "#3d8fd6", "Air pressure switch", "1 when the supply is above 4 bar"),
  part: io("I0.3", "Part_In", "#6b6f76", "Magazine sensor", "1 when a part is waiting"),
  aHome: io("I0.4", "A_Home", "#6b6f76", "Reed switch, A home", "1 when cylinder A is in"),
  aEnd: io("I0.5", "A_End", "#6b6f76", "Reed switch, A out", "1 when cylinder A is fully out"),
  bHome: io("I0.6", "B_Home", "#6b6f76", "Reed switch, B up", "1 when cylinder B is up"),
  bEnd: io("I0.7", "B_End", "#6b6f76", "Reed switch, B down", "1 when cylinder B is fully down"),
  aExt: io("Q0.0", "A_Extend", "#2457a6", "Valve Y1", "Cylinder A out; a spring brings it back"),
  bExt: io("Q0.1", "B_Extend", "#2457a6", "Valve Y2", "Cylinder B down"),
  bRet: io("Q0.2", "B_Retract", "#2457a6", "Valve Y3", "Cylinder B up"),
  lamp: io("Q0.3", "Run_Lamp", "#2e9e5b", "Cycle lamp", "Steady in auto, flashing on a fault"),
};

const VD = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Start pushbutton", "Momentary, normally open"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
  ready: io("I0.2", "Drive_Ready", "#2457a6", "Drive relay 1", "1 when ready to run"),
  running: io("I0.3", "Drive_Running", "#2457a6", "Drive relay 2", "1 while the motor turns"),
  atSpeed: io("I0.5", "At_Speed", "#2e9e5b", "Drive digital out", "1 at the reference speed"),
  reset: io("I0.6", "Reset_PB", "#3d434a", "Fault reset pushbutton", "Momentary"),
  pot: io("IW64", "Speed_Pot", "#6b4fa0", "Speed potentiometer", "0 to 27648"),
  hz: io("IW66", "Motor_Hz", "#6b4fa0", "Drive analog out", "Frequency × 10"),
  run: io("Q0.0", "Drive_Run", "#2457a6", "Drive DI1", "Run forward"),
  ref: io("QW64", "Speed_Ref", "#6b4fa0", "Drive AI1", "Speed reference, 0 to 27648"),
  runLamp: io("Q0.3", "Run_Lamp", "#2e9e5b", "Run lamp", "Lit while the motor runs"),
  faultLamp: io("Q0.2", "Fault_Lamp", "#d64545", "Fault lamp", "Lit while the drive is tripped"),
  stw: io("QW256", "Drive_STW", "#0f766e", "PROFINET control word STW1", "16#047F run, 16#047E stop, 16#04FE acknowledge"),
  nsoll: io("QW258", "Drive_NSOLL", "#0f766e", "PROFINET speed setpoint", "16384 = 100 % = 50 Hz"),
  zsw: io("IW256", "Drive_ZSW", "#0f766e", "PROFINET status word ZSW1", "Bit 2 running, bit 3 fault, bit 8 at speed"),
  nist: io("IW258", "Drive_NIST", "#0f766e", "PROFINET actual speed", "16384 = 100 %"),
};

const RUN_CMD = "(XIC(Start_PB) OR XIC(Run_Cmd)) AND XIC(Stop_PB) AND XIC(Drive_Ready) OTE(Run_Cmd)";

export const PRO_MACHINES: Record<string, LessonContent> = {
  "p-ep-machine": {
    difficulty: "advanced",
    checkpoint: { steps: [(m) => Number(m["Cycles.ACC"]) >= 2, (m) => Boolean(m.Fault), (m, i) => !m.Fault && Boolean(i.A_Home) && Boolean(i.B_Home)], message: "ran the cell in continuous auto, caught a sticking cylinder with the step watchdog and recovered it" },
    summary:
      "A production machine does more than run a sequence once. It runs continuously, stops at the end of a cycle so parts are never left half done, and watches every move: if a cylinder does not reach its sensor in time, the step watchdog stops the machine and says where. This is how electro-pneumatic machines are programmed in real factories.",
    facts: [
      { icon: "press", text: "Tap Start. The cell cycles on its own until the magazine is empty or you press Stop." },
      { icon: "watch", text: "Press Stop mid-cycle. The cell finishes the part, then stops at home." },
      { icon: "bolt", text: "Make cylinder B stick. After 3 s on one step the watchdog trips and the lamp flashes. Note that B keeps going down: a double solenoid valve remembers." },
    ],
    io: [PP.start, PP.stop, PP.air, PP.part, PP.aHome, PP.aEnd, PP.bHome, PP.bEnd, PP.aExt, PP.bExt, PP.bRet, PP.lamp],
    steps: [
      { line: 2, text: "Start latches Auto, unless a fault is waiting to be reset." },
      { line: 3, text: "Stop drops Auto. The sequence finishes its cycle and does not start another." },
      { line: 4, text: "A new cycle starts only in Auto, with air, a part and both cylinders home." },
      { line: 10, text: "Each step gets 3 s. Step equals Last only after the step has lasted one scan, so a new step restarts the timer." },
      { line: 11, text: "Remember the step for the next scan." },
      { line: 12, text: "The watchdog latches a fault and drops Auto." },
      { line: 13, text: "Stop resets the fault and sends the sequence home." },
      { line: 14, text: "Outputs are dropped in a fault." },
      { line: 16, text: "At home, B is sent up if it is not already up: the double solenoid will not do it by itself." },
      { line: 20, text: "Steady lamp in auto, flashing in a fault." },
    ],
    code: [
      "// Continuous auto with an end of cycle stop and a step watchdog.",
      "RUNG 1: XIC(Start_PB) XIO(Fault) OTL(Auto)",
      "RUNG 2: XIO(Stop_PB) OTU(Auto)",
      "RUNG 3: XIC(Auto) XIC(Air_OK) XIC(Part_In) XIC(A_Home) XIC(B_Home) EQU(Step, 0) MOV(1, Step)",
      "RUNG 4: EQU(Step, 1) XIC(A_End) MOV(2, Step)",
      "RUNG 5: EQU(Step, 2) XIC(B_End) MOV(3, Step)",
      "RUNG 6: EQU(Step, 3) XIC(B_Home) MOV(4, Step)",
      "RUNG 7: EQU(Step, 4) XIC(A_Home) CTU(Cycles, 999)",
      "RUNG 8: EQU(Step, 4) XIC(A_Home) MOV(0, Step)",
      "RUNG 9: GRT(Step, 0) EQU(Step, Last) TON(Watch, 3000)",
      "RUNG 10: MOV(Step, Last)",
      "RUNG 11: XIC(Watch.DN) OTL(Fault) OTU(Auto)",
      "RUNG 12: XIC(Fault) XIO(Stop_PB) OTU(Fault) MOV(0, Step)",
      "RUNG 13: GEQ(Step, 1) LEQ(Step, 3) XIO(Fault) OTE(A_Extend)",
      "RUNG 14: EQU(Step, 2) XIO(Fault) OTE(B_Extend)",
      "RUNG 15: EQU(Step, 0) XIO(B_Home) OTE(B_Park)",
      "RUNG 16: EQU(Step, 3) OR XIC(B_Park) OTE(B_Retract)",
      "RUNG 17: XIO(Flash_B.DN) TON(Flash_A, 500)",
      "RUNG 18: XIC(Flash_A.DN) TON(Flash_B, 500)",
      "RUNG 19: (XIC(Auto) XIO(Fault)) OR (XIC(Fault) XIC(Flash_A.DN)) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Mode", value: "Continuous auto" },
      { label: "Stop", value: "End of cycle" },
      { label: "Watchdog", value: "3 s per step" },
      { label: "Level", value: "Advanced" },
    ],
  },

  "p-vsd-setup": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [
        (_m, i) => Boolean(i.Drive_Running) && Number(i.Speed_Pot) < 300 && Math.abs(Number(i.Motor_Hz) - 150) <= 5,
        (_m, i) => Boolean(i.At_Speed) && Number(i.Speed_Pot) > 27000 && Math.abs(Number(i.Motor_Hz) - 400) <= 5,
      ],
      message: "commissioned the drive to the fan's limits: 15 Hz minimum and 40 Hz maximum",
    },
    summary:
      "Before a drive runs a motor it is commissioned: the motor's nameplate data goes in, then the limits and ramps the machine needs. These live in the drive, not the PLC. The program here only asks for a speed; the drive's parameters decide what the motor actually does. Your job: set this fan up for its specification.",
    facts: [
      { icon: "info", text: "Spec: rated current 7.5 A, minimum 15 Hz for motor cooling, maximum 40 Hz for the fan, 10 s ramps." },
      { icon: "press", text: "Set the parameters on the drive's keypad from its popover, then run with the pot at 0 and at full." },
      { icon: "watch", text: "At pot 0 the motor runs at 15 Hz. At full it stops at 40 Hz, though the PLC asks for 50." },
    ],
    io: [VD.start, VD.stop, VD.ready, VD.running, VD.atSpeed, VD.pot, VD.hz, VD.run, VD.ref, VD.runLamp],
    steps: [
      { line: 2, text: "Run seals in while the drive is ready." },
      { line: 4, text: "The pot goes straight to the drive. The PLC asks for 0 to 50 Hz." },
      { line: 6, text: "Read back the real frequency, in whole hertz. It shows what the parameters did." },
    ],
    code: ["// The program asks; the drive's parameters decide.", `RUNG 1: ${RUN_CMD}`, "RUNG 2: XIC(Run_Cmd) OTE(Drive_Run)", "RUNG 3: MOV(Speed_Pot, Speed_Ref)", "RUNG 4: XIC(Drive_Running) OTE(Run_Lamp)", "RUNG 5: DIV(Motor_Hz, 10, Actual_Hz)"],
    specs: [
      { label: "P0305", value: "Rated current 7.5 A" },
      { label: "P1080 / P1082", value: "15 Hz / 40 Hz" },
      { label: "P1120 / P1121", value: "10 s / 10 s" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "p-vsd-bus": {
    difficulty: "advanced",
    checkpoint: {
      steps: [(m, i) => Boolean(m.Run_Lamp) && Number(i.Drive_NIST) > 1000, (_m, i) => (Number(i.Drive_ZSW) & 8) !== 0, (m, i) => (Number(i.Drive_ZSW) & 8) === 0 && Boolean(m.Run_Lamp)],
      message: "ran the drive over PROFINET with a control word, caught its fault in the status word and acknowledged it",
    },
    summary:
      "On a modern plant the PLC talks to the drive over a network instead of wires. With PROFINET standard telegram 1, the PLC sends a control word (STW1) and a speed setpoint, and the drive sends back a status word (ZSW1) and its actual speed. One cable replaces every terminal, and the PLC can read far more than three relays could tell it.",
    facts: [
      { icon: "press", text: "On the drive's keypad set P0700 to fieldbus. Then tap Start: STW1 becomes 16#047F and the drive runs." },
      { icon: "info", text: "Speeds use 16384 for 100 %. The program scales the pot into that, and NIST back into hertz." },
      { icon: "bolt", text: "Jam the fan. ZSW1 bit 3 turns on. Clear the jam and press Reset: STW1 bit 7 acknowledges the fault." },
    ],
    io: [VD.start, VD.stop, VD.reset, VD.pot, VD.stw, VD.nsoll, VD.zsw, VD.nist, VD.runLamp, VD.faultLamp],
    steps: [
      { line: 2, text: "Run seals in unless ZSW1 bit 3 says the drive has a fault." },
      { line: 3, text: "16#047E (1150): switched on and enabled, but not running." },
      { line: 4, text: "16#047F (1151): bit 0 on as well, so the drive runs." },
      { line: 5, text: "16#04FE (1278): bit 7 on acknowledges a fault." },
      { line: 6, text: "Scale 0 to 27648 into 0 to 16384, rounding." },
      { line: 7, text: "Scale the actual speed back to hertz." },
      { line: 8, text: "ZSW1 bit 2: operation enabled, the motor is running." },
      { line: 9, text: "ZSW1 bit 3: fault present." },
    ],
    code: [
      "// PROFINET telegram 1: control word out, status word in.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Cmd)) AND XIC(Stop_PB) AND XIO(Drive_ZSW.3) OTE(Run_Cmd)",
      "RUNG 2: MOV(1150, Drive_STW)",
      "RUNG 3: XIC(Run_Cmd) MOV(1151, Drive_STW)",
      "RUNG 4: XIC(Drive_ZSW.3) XIC(Reset_PB) MOV(1278, Drive_STW)",
      "RUNG 5: MUL(Speed_Pot, 16384, T_N) ADD(T_N, 13824, T_N) DIV(T_N, 27648, Drive_NSOLL)",
      "RUNG 6: MUL(Drive_NIST, 50, T_H) ADD(T_H, 8192, T_H) DIV(T_H, 16384, Actual_Hz)",
      "RUNG 7: XIC(Drive_ZSW.2) OTE(Run_Lamp)",
      "RUNG 8: XIC(Drive_ZSW.3) OTE(Fault_Lamp)",
    ],
    specs: [
      { label: "Network", value: "PROFINET, telegram 1" },
      { label: "Out", value: "STW1 + speed setpoint" },
      { label: "In", value: "ZSW1 + actual speed" },
      { label: "Level", value: "Advanced" },
    ],
  },
};

/* ------------------------------------------------- motor management */

const MC = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Start pushbutton", "Momentary, normally open"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
  reset: io("I0.2", "Reset_PB", "#3d434a", "Reset pushbutton", "Momentary"),
  tor: io("I0.4", "SS_TOR", "#2457a6", "Soft starter top of ramp", "1 once the bypass has closed"),
  ssFault: io("I0.5", "SS_Fault", "#d64545", "Soft starter fault relay", "1 while tripped"),
  remote: io("I0.6", "F2_Remote", "#6b6f76", "Feeder 2 local / remote", "1 in remote"),
  isol: io("I0.7", "F2_Isol", "#6b6f76", "Feeder 2 isolator auxiliary", "1 with the isolator on"),
  fb: io("I1.0", "F2_Run_FB", "#2457a6", "Feeder 2 contactor auxiliary", "1 when K2 has pulled in"),
  warn: io("I1.1", "MPR_Warn", "#e0a526", "Protection relay warning", "1 above 90 % thermal"),
  trip: io("I1.2", "MPR_Trip", "#d64545", "Protection relay trip", "1 while tripped"),
  a1: io("IW64", "M1_Amps", "#6b4fa0", "Pump current", "Amps, from the soft starter"),
  a2: io("MPR", "M2_Amps", "#6b4fa0", "Conveyor current", "Amps, from the relay"),
  th: io("MPR", "M2_Thermal", "#6b4fa0", "Thermal capacity used", "% of trip level"),
  code: io("MPR", "MPR_Code", "#6b4fa0", "Trip cause", "1 overload, 2 phase loss, 3 earth fault, 4 jam"),
  kw: io("Modbus", "Total_kW", "#0f766e", "Incomer power", "Tenths of a kW"),
  kwh: io("Modbus", "Total_kWh", "#0f766e", "Incomer energy", "Tenths of a kWh"),
  pf: io("Modbus", "PF_x100", "#0f766e", "Power factor", "× 100"),
  ssRun: io("Q0.0", "SS_Run", "#2457a6", "Soft starter run", "On: ramp up. Off: soft stop"),
  k2: io("Q0.1", "K2_Run", "#2457a6", "Feeder 2 contactor", "Through the relay trip contact"),
  rst: io("Q0.2", "MPR_Reset", "#2457a6", "Remote reset", "To the soft starter and the relay"),
  runLamp: io("Q0.3", "Run_Lamp", "#2e9e5b", "Run lamp", "Green"),
  faultLamp: io("Q0.4", "Fault_Lamp", "#d64545", "Fault lamp", "Red"),
  warnLamp: io("Q0.5", "Warn_Lamp", "#e0a526", "Warning lamp", "Amber"),
};

export const PRO_MOTORS: Record<string, LessonContent> = {
  "p-soft-starter": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(m, i) => Boolean(i.SS_TOR) && Number(m.Peak_A) > 0 && Number(m.Peak_A) <= 105, (m, i) => !m.SS_Run && Number(i.M1_Amps) > 0],
      message: "set the soft starter to keep the pump's starting current under 3.5 times full load, and stopped it softly",
    },
    summary:
      "Started direct on line, a motor draws six to eight times its full load current and slams its load. A soft starter ramps the voltage up instead, limits the current, then closes a bypass contactor and gets out of the way. It cannot change the speed once running: that is a drive's job. On pumps, a soft stop also stops water hammer.",
    facts: [
      { icon: "watch", text: "Run it as set: 80 % initial voltage and a 1 s ramp. Peak_A shows the pump took about 140 A, near five times its 30 A." },
      { icon: "press", text: "On the soft starter set 30 % initial voltage, a 10 s ramp and a 3.5 × current limit. Start again: the peak drops below 105 A." },
      { icon: "bolt", text: "Set a 10 s soft stop and press Stop: current keeps flowing while the voltage ramps down. Set the limit to 2 × and the pump never gets up to speed." },
    ],
    io: [MC.start, MC.stop, MC.reset, MC.tor, MC.ssFault, MC.a1, MC.ssRun, MC.rst, MC.runLamp, MC.faultLamp],
    steps: [
      { line: 2, text: "Run seals in unless the soft starter has faulted." },
      { line: 3, text: "One output: on means ramp up, off means soft stop." },
      { line: 4, text: "Clear the peak at the start of each run." },
      { line: 5, text: "Keep the highest current seen." },
      { line: 6, text: "Top of ramp: the bypass has closed and the motor is on full voltage." },
      { line: 8, text: "Reset a fault from the panel." },
    ],
    code: [
      "// A soft started pump: ramp, bypass, soft stop and the peak current.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Cmd)) AND XIC(Stop_PB) AND XIO(SS_Fault) OTE(Run_Cmd)",
      "RUNG 2: XIC(Run_Cmd) OTE(SS_Run)",
      "RUNG 3: XIC(Run_Cmd) ONS(Start_OS) MOV(0, Peak_A)",
      "RUNG 4: GRT(M1_Amps, Peak_A) MOV(M1_Amps, Peak_A)",
      "RUNG 5: XIC(SS_TOR) OTE(Run_Lamp)",
      "RUNG 6: XIC(SS_Fault) OTE(Fault_Lamp)",
      "RUNG 7: XIC(SS_Fault) XIC(Reset_PB) OTE(MPR_Reset)",
    ],
    specs: [
      { label: "Motor", value: "15 kW pump, 30 A" },
      { label: "Target", value: "Peak below 3.5 × FLA" },
      { label: "Stop", value: "Soft stop for water hammer" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "p-mpr": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(_m, i) => Boolean(i.MPR_Warn), (_m, i) => Boolean(i.MPR_Trip) && Number(i.MPR_Code) === 1, (m, i) => !i.MPR_Trip && Boolean(m.Run_Lamp)],
      message: "saw the relay warn, trip on overload, cool down and reset, then ran again",
    },
    summary:
      "A thermal overload only guesses the motor's heating from its bimetal strips. A motor protection relay measures the current in each phase and models the motor's temperature, so it can warn before it trips, tell you why it tripped, and refuse a reset until the motor has cooled. Its trip contact is wired in the contactor circuit: it stops the motor even if the PLC does not.",
    facts: [
      { icon: "press", text: "Start the conveyor, then raise its load to 1.4. Thermal climbs; at 90 % the amber lamp warns." },
      { icon: "bolt", text: "About 30 s later the relay trips: code 1, overload. The reset is refused until thermal is below 50 %." },
      { icon: "shield", text: "Try an earth fault: code 3. This program will not reset it at all. Earth faults are found and fixed, never reset and retried." },
    ],
    io: [MC.start, MC.stop, MC.reset, MC.fb, MC.warn, MC.trip, MC.a2, MC.th, MC.code, MC.k2, MC.rst, MC.runLamp, MC.faultLamp, MC.warnLamp],
    steps: [
      { line: 2, text: "Run seals in unless the relay has tripped." },
      { line: 3, text: "K2 runs through the relay's trip contact, so a trip drops it directly." },
      { line: 4, text: "The warning gives the operator time to reduce the load." },
      { line: 6, text: "Keep the trip cause for the screen and the fault log." },
      { line: 7, text: "Reset only when cool, and never for an earth fault." },
      { line: 8, text: "The run lamp follows the contactor's own auxiliary contact." },
    ],
    code: [
      "// Feeder 2 with a motor protection relay.",
      "RUNG 1: (XIC(Start_PB) OR XIC(Run_Cmd)) AND XIC(Stop_PB) AND XIO(MPR_Trip) OTE(Run_Cmd)",
      "RUNG 2: XIC(Run_Cmd) OTE(K2_Run)",
      "RUNG 3: XIC(MPR_Warn) OTE(Warn_Lamp)",
      "RUNG 4: XIC(MPR_Trip) OTE(Fault_Lamp)",
      "RUNG 5: XIC(MPR_Trip) MOV(MPR_Code, Last_Trip)",
      "RUNG 6: XIC(MPR_Trip) XIC(Reset_PB) LES(M2_Thermal, 50) NEQ(MPR_Code, 3) OTE(MPR_Reset)",
      "RUNG 7: XIC(F2_Run_FB) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Motor", value: "7.5 kW conveyor, 15 A" },
      { label: "Warn / trip", value: "90 % / 112 % thermal" },
      { label: "Reset", value: "Below 50 %, not earth faults" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "p-mcc": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(m) => Boolean(m.Warn_Lamp), (m) => Boolean(m.FTS), (m, i) => Boolean(i.F2_Run_FB) && !m.FTS],
      message: "showed a feeder unavailable, caught a fail to start and ran the feeder once it was fixed",
    },
    summary:
      "A motor control centre is a row of cabinets, one bucket per motor, each with its isolator, protection, contactor and a local / remote selector. The PLC can only run a feeder that is available: in remote, isolator on, not tripped. And it never trusts its own output: if the contactor's auxiliary contact does not prove the feeder started within 2 s, that is a fail to start.",
    facts: [
      { icon: "press", text: "Turn feeder 2 to local, or switch its isolator off: the amber lamp says not available, and Start does nothing." },
      { icon: "bolt", text: "Back in remote with the isolator on, open the contactor coil from the popover and press Start. After 2 s: fail to start." },
      { icon: "info", text: "Fix the coil, press Reset, then Start. The feedback proves the run." },
    ],
    io: [MC.start, MC.stop, MC.reset, MC.remote, MC.isol, MC.fb, MC.trip, MC.k2, MC.runLamp, MC.faultLamp, MC.warnLamp],
    steps: [
      { line: 2, text: "Available: remote, isolator on and not tripped." },
      { line: 3, text: "The PLC only runs an available feeder, and not after a fail to start." },
      { line: 5, text: "Commanded but no feedback for 2 s." },
      { line: 6, text: "Latch it, so the operator sees it even if the command drops." },
      { line: 7, text: "Reset clears it." },
      { line: 8, text: "The run lamp follows the feedback, not the command." },
      { line: 10, text: "Not available shows amber." },
    ],
    code: [
      "// An MCC feeder: available, commanded, proved.",
      "RUNG 1: XIC(F2_Remote) XIC(F2_Isol) XIO(MPR_Trip) OTE(F2_Avail)",
      "RUNG 2: (XIC(Start_PB) OR XIC(Run_Cmd)) AND XIC(Stop_PB) AND XIC(F2_Avail) AND XIO(FTS) OTE(Run_Cmd)",
      "RUNG 3: XIC(Run_Cmd) OTE(K2_Run)",
      "RUNG 4: XIC(Run_Cmd) XIO(F2_Run_FB) TON(FTS_T, 2000)",
      "RUNG 5: XIC(FTS_T.DN) OTL(FTS)",
      "RUNG 6: XIC(Reset_PB) OTU(FTS)",
      "RUNG 7: XIC(F2_Run_FB) OTE(Run_Lamp)",
      "RUNG 8: XIC(FTS) OR XIC(MPR_Trip) OTE(Fault_Lamp)",
      "RUNG 9: XIO(F2_Avail) OTE(Warn_Lamp)",
    ],
    specs: [
      { label: "Available", value: "Remote, on, healthy" },
      { label: "Proof", value: "Contactor auxiliary" },
      { label: "Fail to start", value: "2 s" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "p-energy": {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => Number(m.Used_kWh) >= 1, (m) => Boolean(m.Idle_Stop)], message: "measured a run's energy and stopped a motor that was running for nothing" },
    summary:
      "Motors use most of the electricity in a plant, and Eskom bills every kWh. An energy meter on the MCC incomer, read over Modbus, tells the PLC the power, energy and power factor. With that the program can report energy per run, flag a poor power factor, and stop a conveyor that is running empty instead of leaving it on all shift.",
    facts: [
      { icon: "press", text: "Start the conveyor at load 0.7. Used_kWh counts up in tenths: about 0.1 kWh a minute." },
      { icon: "bolt", text: "Drop the load to 0.1, an empty belt. Under 2 kW for 20 s, the program stops it: Idle_Stop." },
      { icon: "info", text: "Lightly loaded motors have a poor power factor. Low_PF shows it: right-size motors, or use a drive." },
    ],
    io: [MC.start, MC.stop, MC.fb, MC.trip, MC.kw, MC.kwh, MC.pf, MC.k2, MC.runLamp, MC.warnLamp],
    steps: [
      { line: 2, text: "Start clears an idle stop first." },
      { line: 3, text: "Run, unless tripped or stopped for idling." },
      { line: 5, text: "At the start of each run, remember the meter's reading." },
      { line: 6, text: "Energy used this run is the difference, in tenths of a kWh." },
      { line: 7, text: "Running but drawing under 2 kW for 20 s: the belt is empty." },
      { line: 8, text: "Latch the idle stop." },
      { line: 10, text: "Power factor below 0.70 while running is flagged." },
    ],
    code: [
      "// Energy per run and an idle stop from the incomer meter.",
      "RUNG 1: XIC(Start_PB) OTU(Idle_Stop)",
      "RUNG 2: (XIC(Start_PB) OR XIC(Run_Cmd)) AND XIC(Stop_PB) AND XIO(MPR_Trip) AND XIO(Idle_Stop) OTE(Run_Cmd)",
      "RUNG 3: XIC(Run_Cmd) OTE(K2_Run)",
      "RUNG 4: XIC(Run_Cmd) ONS(Run_OS) MOV(Total_kWh, Start_kWh)",
      "RUNG 5: SUB(Total_kWh, Start_kWh, Used_kWh)",
      "RUNG 6: XIC(F2_Run_FB) LES(Total_kW, 20) TON(Idle_T, 20000)",
      "RUNG 7: XIC(Idle_T.DN) OTL(Idle_Stop)",
      "RUNG 8: XIC(Idle_Stop) OTE(Warn_Lamp)",
      "RUNG 9: XIC(F2_Run_FB) LES(PF_x100, 70) OTE(Low_PF)",
      "RUNG 10: XIC(F2_Run_FB) OTE(Run_Lamp)",
    ],
    specs: [
      { label: "Meter", value: "Incomer, Modbus TCP" },
      { label: "Idle", value: "Under 2 kW for 20 s" },
      { label: "Power factor", value: "Flag below 0.70" },
      { label: "Level", value: "Intermediate" },
    ],
  },
};
