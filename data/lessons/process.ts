import type { IoPoint, LessonContent } from "../types";

const io = (address: string, tagName: string, color: string, connectsTo: string, description: string): IoPoint => ({ address, tagName, color, connectsTo, description });

const ST = {
  start: io("I0.0", "Start_PB", "#2e9e5b", "Auto start pushbutton", "Momentary, normally open"),
  stop: io("I0.1", "Stop_PB", "#d64545", "Stop pushbutton", "Normally closed: 1 at rest"),
};
const AUTO = "RUNG 1: (XIC(Start_PB) OR XIC(Auto)) AND XIC(Stop_PB) OTE(Auto)";

const TK = {
  low: io("I0.2", "Float_Low", "#3d8fd6", "Low float, 25 %", "1 while the water covers it"),
  high: io("I0.3", "Float_High", "#3d8fd6", "High float, 80 %", "1 while the water covers it"),
  raw: io("IW64", "Level_Raw", "#6b4fa0", "Level transmitter LT1", "0 to 27648 for 0 to 100 %"),
  valve: io("Q0.0", "Inlet_Valve", "#2457a6", "Inlet solenoid valve", "Energise to open"),
  lamp: io("Q0.1", "Run_Lamp", "#2e9e5b", "Auto lamp", "Lit in automatic"),
  alarm: io("Q0.2", "Alarm_Lamp", "#d64545", "High level alarm lamp", "Lit above 90 %"),
};

const WW = {
  low: io("I0.2", "LS_Low", "#3d8fd6", "Low float", "1 while covered; below it every pump stops"),
  lead: io("I0.3", "LS_Lead", "#3d8fd6", "Lead start float", "1 while covered"),
  lag: io("I0.4", "LS_Lag", "#3d8fd6", "Lag start float", "1 while covered"),
  hh: io("I0.5", "LS_HighHigh", "#d64545", "High-high float", "1 while covered: alarm"),
  p1ok: io("I0.6", "P1_OK", "#f26b1d", "Pump 1 overload", "1 while healthy"),
  p2ok: io("I0.7", "P2_OK", "#f26b1d", "Pump 2 overload", "1 while healthy"),
  ack: io("I1.0", "Ack_PB", "#3d434a", "Acknowledge pushbutton", "Momentary"),
  p1: io("Q0.0", "P1_Run", "#2457a6", "Pump 1 contactor", "Runs pump 1"),
  p2: io("Q0.1", "P2_Run", "#2457a6", "Pump 2 contactor", "Runs pump 2"),
  horn: io("Q0.2", "Horn", "#e0a526", "Horn and beacon", "Sounds until acknowledged"),
  alarm: io("Q0.3", "Alarm_Lamp", "#d64545", "Alarm lamp", "Flashes when new, steady once acknowledged"),
};

const CALLS = [
  "RUNG 2: XIC(Auto) XIC(LS_Lead) OTL(Lead_Call)",
  "RUNG 3: XIO(LS_Low) OR XIO(Auto) OTU(Lead_Call)",
  "RUNG 4: XIC(Auto) XIC(LS_Lag) OTL(Lag_Call)",
  "RUNG 5: XIO(LS_Low) OR XIO(Auto) OTU(Lag_Call)",
];

/** Lessons on the process control track, plus the batch mixer on the machines track. */
export const PROCESS: Record<string, LessonContent> = {
  "p-tank-level": {
    difficulty: "beginner",
    checkpoint: {
      steps: [(m) => Boolean(m.Inlet_Valve), (m, i) => !m.Inlet_Valve && Boolean(i.Float_High)],
      message: "filled from the low float and stopped at the high float",
    },
    summary:
      "Two float switches keep a tank between 25 % and 80 %. When the water drops below the low float the inlet opens, and it stays open until the high float is reached. The gap between the two is hysteresis: it stops the valve chattering on and off.",
    facts: [
      { icon: "press", text: "Tap AUTO. Watch the level fall as the plant draws water." },
      { icon: "watch", text: "Below 25 % the inlet opens. It stays open past 25 % until 80 %." },
      { icon: "info", text: "Change the plant demand on the outlet and watch the cycle speed up or slow down." },
    ],
    io: [ST.start, ST.stop, TK.low, TK.high, TK.valve, TK.lamp],
    steps: [
      { line: 2, text: "Auto seals in. Stop is normally closed, so it is XIC." },
      { line: 4, text: "Below the low float, latch Filling." },
      { line: 5, text: "At the high float, or out of auto, unlatch it." },
      { line: 6, text: "The inlet valve follows Filling." },
    ],
    code: [
      "// Fill when the water drops below the low float, stop at the high float.",
      AUTO,
      "RUNG 2: XIC(Auto) OTE(Run_Lamp)",
      "RUNG 3: XIC(Auto) XIO(Float_Low) OTL(Filling)",
      "RUNG 4: XIC(Float_High) OR XIO(Auto) OTU(Filling)",
      "RUNG 5: XIC(Filling) OTE(Inlet_Valve)",
    ],
    specs: [
      { label: "Rungs", value: "5" },
      { label: "Band", value: "25 to 80 %" },
      { label: "Idea", value: "Hysteresis" },
      { label: "Level", value: "Beginner" },
    ],
  },

  "p-analog": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(m) => Number(m.Level_Pct) > 0 && Boolean(m.Inlet_Valve), (m) => !m.Inlet_Valve && Number(m.Level_Pct) >= 75],
      message: "scaled the transmitter and controlled the level in percent",
    },
    summary:
      "The transmitter reports the level as a raw number from 0 to 27648. Scaling turns it into percent: multiply by 100, then divide by 27648. With a number to work with, the fill band and a high alarm are just comparisons, and you can change them without moving a float.",
    facts: [
      { icon: "info", text: "27648 is the full scale count of a common analog input card, for 20 mA or 10 V." },
      { icon: "watch", text: "Watch Level_Raw and Level_Pct side by side in the ladder view." },
      { icon: "bolt", text: "Stick the high float from its popover. The analog control still stops the fill." },
    ],
    io: [ST.start, ST.stop, TK.raw, TK.valve, TK.lamp, TK.alarm],
    steps: [
      { line: 4, text: "MUL first, so the integer division in the next rung does not throw the fraction away." },
      { line: 5, text: "DIV by the full scale count gives 0 to 100." },
      { line: 6, text: "Below 30 % latch Filling." },
      { line: 7, text: "At 75 %, or out of auto, unlatch it." },
      { line: 9, text: "Above 90 % light the alarm lamp, a backup to the control." },
    ],
    code: [
      "// Scale the transmitter to percent and control on numbers.",
      AUTO,
      "RUNG 2: XIC(Auto) OTE(Run_Lamp)",
      "RUNG 3: MUL(Level_Raw, 100, Level_x100)",
      "RUNG 4: DIV(Level_x100, 27648, Level_Pct)",
      "RUNG 5: XIC(Auto) LES(Level_Pct, 30) OTL(Filling)",
      "RUNG 6: GEQ(Level_Pct, 75) OR XIO(Auto) OTU(Filling)",
      "RUNG 7: XIC(Filling) OTE(Inlet_Valve)",
      "RUNG 8: GRT(Level_Pct, 90) OTE(Alarm_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "8" },
      { label: "Raw range", value: "0 to 27648" },
      { label: "Band", value: "30 to 75 %" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "p-duplex": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(m) => Boolean(m.P1_Run) && !m.P2_Run, (m) => Boolean(m.P2_Run) && !m.P1_Run],
      message: "alternated the lead pump between cycles",
    },
    summary:
      "A wet well has two pumps. The lead float starts one, the low float stops it. If water comes in faster than one pump can handle, the lag float starts the second. Swapping which pump leads after every cycle shares the wear between them.",
    facts: [
      { icon: "press", text: "Tap AUTO. Pump 1 leads the first cycle." },
      { icon: "watch", text: "After the well empties, the next cycle starts pump 2." },
      { icon: "bolt", text: "Turn the inflow above three quarters. The lag float brings in both pumps." },
    ],
    io: [ST.start, ST.stop, WW.low, WW.lead, WW.lag, WW.p1ok, WW.p2ok, WW.p1, WW.p2],
    steps: [
      { line: 3, text: "The lead float latches Lead_Call; the low float clears it." },
      { line: 5, text: "The lag float latches Lag_Call the same way." },
      { line: 7, text: "Cycle_Mem holds last scan's Lead_Call, so this rung sees the moment a cycle ends." },
      { line: 9, text: "At the end of a cycle, flip Duty_P2: set it if it was off..." },
      { line: 10, text: "...or clear it if it was on. Deciding first and acting after avoids flipping twice." },
      { line: 13, text: "Pump 1 leads unless Duty_P2 is set, and always runs on a lag call." },
      { line: 14, text: "Pump 2 is the mirror image." },
    ],
    code: [
      "// Lead and lag pumps, swapping duty every cycle.",
      AUTO,
      ...CALLS,
      "RUNG 6: XIC(Cycle_Mem) XIO(Lead_Call) OTE(Cycle_End)",
      "RUNG 7: XIC(Lead_Call) OTE(Cycle_Mem)",
      "RUNG 8: XIC(Cycle_End) XIO(Duty_P2) OTE(Set_P2)",
      "RUNG 9: XIC(Cycle_End) XIC(Duty_P2) OTE(Clr_P2)",
      "RUNG 10: XIC(Set_P2) OTL(Duty_P2)",
      "RUNG 11: XIC(Clr_P2) OTU(Duty_P2)",
      "RUNG 12: (XIC(Lead_Call) XIO(Duty_P2) OR XIC(Lag_Call)) AND XIC(P1_OK) OTE(P1_Run)",
      "RUNG 13: (XIC(Lead_Call) XIC(Duty_P2) OR XIC(Lag_Call)) AND XIC(P2_OK) OTE(P2_Run)",
    ],
    specs: [
      { label: "Rungs", value: "13" },
      { label: "Floats", value: "Low · lead · lag" },
      { label: "Duty", value: "Alternates each cycle" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "p-alarms": {
    difficulty: "intermediate",
    checkpoint: {
      steps: [(m, _i, f) => Boolean(f.p1Trip) && Boolean(m.P2_Run), (m) => Boolean(m.Alarm_Ack)],
      message: "changed over to the standby pump and acknowledged the alarm",
    },
    summary:
      "Process alarms tell people something needs attention. Here a pump overload or a high-high level raises an alarm that flashes and sounds until acknowledged. If the duty pump trips, the standby pump takes over automatically, so the alarm is a warning, not a flood.",
    facts: [
      { icon: "press", text: "Tap AUTO and let pump 1 run." },
      { icon: "bolt", text: "Trip pump 1 from its popover. Pump 2 takes over, the horn sounds and the lamp flashes." },
      { icon: "watch", text: "Tap ACK. The horn stops and the lamp goes steady until the fault clears." },
    ],
    io: [ST.start, ST.stop, WW.low, WW.lead, WW.lag, WW.hh, WW.p1ok, WW.p2ok, WW.ack, WW.p1, WW.p2, WW.horn, WW.alarm],
    steps: [
      { line: 7, text: "Pump 1 is duty: it runs on any call while it is healthy." },
      { line: 8, text: "Pump 2 runs on a lag call, or on a lead call when pump 1 is not healthy. That is the automatic changeover." },
      { line: 9, text: "High-high level or either pump tripped latches Alarm." },
      { line: 10, text: "ACK latches Alarm_Ack while the alarm is up." },
      { line: 11, text: "When every cause is clear and it was acknowledged, both bits reset." },
      { line: 14, text: "The lamp flashes before ACK and goes steady after." },
      { line: 15, text: "The horn sounds until ACK." },
    ],
    code: [
      "// Pump fail and high level alarms with automatic changeover.",
      AUTO,
      ...CALLS,
      "RUNG 6: (XIC(Lead_Call) OR XIC(Lag_Call)) AND XIC(P1_OK) OTE(P1_Run)",
      "RUNG 7: (XIC(Lag_Call) OR XIC(Lead_Call) XIO(P1_OK)) AND XIC(P2_OK) OTE(P2_Run)",
      "RUNG 8: XIC(LS_HighHigh) OR XIO(P1_OK) OR XIO(P2_OK) OTL(Alarm)",
      "RUNG 9: XIC(Alarm) XIC(Ack_PB) OTL(Alarm_Ack)",
      "RUNG 10: XIO(LS_HighHigh) XIC(P1_OK) XIC(P2_OK) XIC(Alarm_Ack) OTU(Alarm) OTU(Alarm_Ack)",
      "RUNG 11: XIO(Flash_B.DN) TON(Flash_A, 500)",
      "RUNG 12: XIC(Flash_A.DN) TON(Flash_B, 500)",
      "RUNG 13: XIC(Alarm) (XIO(Alarm_Ack) XIC(Flash_A.DN) OR XIC(Alarm_Ack)) OTE(Alarm_Lamp)",
      "RUNG 14: XIC(Alarm) XIO(Alarm_Ack) OTE(Horn)",
    ],
    specs: [
      { label: "Rungs", value: "14" },
      { label: "Alarms", value: "High-high · P1 trip · P2 trip" },
      { label: "Changeover", value: "Automatic" },
      { label: "Level", value: "Intermediate" },
    ],
  },

  "m-mixer": {
    difficulty: "intermediate",
    checkpoint: { steps: [(m) => Boolean(m.Agitator), (m) => Boolean(m.Done)], message: "ran a full batch: fill, mix and drain" },
    summary:
      "A batch runs in steps: fill ingredient A to the mid switch, top up with B to full, mix for 10 s, drain until empty. Each step is one latched bit. A step ends by setting the next and clearing itself, so exactly one step is active at a time. Watch the colour change as the agitator blends A and B.",
    facts: [
      { icon: "press", text: "Tap START. Valve A opens." },
      { icon: "watch", text: "Each level switch hands over to the next step: B, mix, drain." },
      { icon: "bolt", text: "Press Stop mid batch. Every step clears and every output turns off." },
    ],
    io: [ST.start, ST.stop, io("I0.2", "LS_Low", "#3d8fd6", "Low level switch", "1 while covered"), io("I0.3", "LS_Mid", "#3d8fd6", "Mid level switch", "End of ingredient A"), io("I0.4", "LS_Full", "#3d8fd6", "Full level switch", "End of ingredient B"), io("Q0.0", "Valve_A", "#2457a6", "Valve A", "Ingredient A"), io("Q0.1", "Valve_B", "#e0a526", "Valve B", "Ingredient B"), io("Q0.2", "Agitator", "#6b6f76", "Agitator", "Mixes the batch"), io("Q0.3", "Drain_Valve", "#3d434a", "Drain valve", "Empties the vessel"), io("Q0.4", "Done_Lamp", "#2e9e5b", "Done lamp", "Batch complete")],
    steps: [
      { line: 2, text: "Start, only when no batch is running, sets the first step and clears Done." },
      { line: 3, text: "Step A ends at the mid switch: set step B, clear step A." },
      { line: 4, text: "Step B ends at the full switch and hands over to mixing." },
      { line: 5, text: "Mixing lasts 10 s." },
      { line: 7, text: "Drain runs on for 2 s after the low switch clears, to empty the outlet." },
      { line: 9, text: "Stop clears every step: a safe abort." },
      { line: 10, text: "Busy is on during any step and blocks a second start." },
      { line: 11, text: "Each output simply follows its step." },
    ],
    code: [
      "// Fill A to mid, B to full, mix 10 s, drain, done.",
      "RUNG 1: XIC(Start_PB) XIO(Busy) XIC(Stop_PB) OTL(Step_A) OTU(Done)",
      "RUNG 2: XIC(Step_A) XIC(LS_Mid) OTL(Step_B) OTU(Step_A)",
      "RUNG 3: XIC(Step_B) XIC(LS_Full) OTL(Step_Mix) OTU(Step_B)",
      "RUNG 4: XIC(Step_Mix) TON(Mix_T, 10000)",
      "RUNG 5: XIC(Mix_T.DN) OTL(Step_Drain) OTU(Step_Mix)",
      "RUNG 6: XIC(Step_Drain) XIO(LS_Low) TON(Empty_T, 2000)",
      "RUNG 7: XIC(Empty_T.DN) OTL(Done) OTU(Step_Drain)",
      "RUNG 8: XIO(Stop_PB) OTU(Step_A) OTU(Step_B) OTU(Step_Mix) OTU(Step_Drain)",
      "RUNG 9: XIC(Step_A) OR XIC(Step_B) OR XIC(Step_Mix) OR XIC(Step_Drain) OTE(Busy)",
      "RUNG 10: XIC(Step_A) OTE(Valve_A)",
      "RUNG 11: XIC(Step_B) OTE(Valve_B)",
      "RUNG 12: XIC(Step_Mix) OTE(Agitator)",
      "RUNG 13: XIC(Step_Drain) OTE(Drain_Valve)",
      "RUNG 14: XIC(Done) OTE(Done_Lamp)",
    ],
    specs: [
      { label: "Rungs", value: "14" },
      { label: "Steps", value: "Fill A · fill B · mix · drain" },
      { label: "Mix time", value: "10 s" },
      { label: "Level", value: "Intermediate" },
    ],
  },
};
