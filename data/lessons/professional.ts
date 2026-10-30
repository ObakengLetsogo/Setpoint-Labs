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
