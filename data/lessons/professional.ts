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
const near = (m: Record<string, unknown>, band: number) => Math.abs(Number(m.Level_PV) - Number(m.Level_SP)) < band;

export const PRO_PID: Record<string, LessonContent> = {
  "p-pid-what": {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => Boolean(m.Run_Lamp), (m) => Boolean(m.Run_Lamp) && near(m, 10)], message: "put the loop in auto and brought the level near its setpoint with proportional control" },
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
    checkpoint: { steps: [(m) => !m.Run_Lamp && Number(m.Valve_CV) > 0, (m) => Boolean(m.Run_Lamp), (m) => Boolean(m.Run_Lamp) && near(m, 2)], message: "ran the valve by hand, switched to auto without a bump and held the setpoint" },
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
    checkpoint: { steps: [(m) => Boolean(m.Run_Lamp), (m) => Boolean(m.Run_Lamp) && Number(m["FIC1.KP"]) > 0 && near(m, 2)], message: "ran a level loop cascaded onto a flow loop and held the setpoint" },
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
