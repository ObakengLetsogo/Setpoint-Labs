import type { Annotation, Control, FieldDevice, LiveReadout, PlcTerminal, RigDef, RigPart, RigTag, WireDef } from "./types";

/*
 * Process rigs: a header tank with an inlet valve, a two pump wet well, and a batch mixer.
 * Levels are 0..1 of the vessel height. Analog transmitters report 0..27648 raw counts, the
 * full scale value of a typical 0-10 V or 4-20 mA input card.
 */

export const RAW_FULL = 27648;

export const terminals = (inputs: number, outputs: number): PlcTerminal[] => [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  ...Array.from({ length: inputs }, (_, i): PlcTerminal => ({ id: `I0.${i}`, label: `I0.${i}`, kind: "input" })),
  ...Array.from({ length: outputs }, (_, i): PlcTerminal => ({ id: `Q0.${i}`, label: `Q0.${i}`, kind: "output" })),
];

export const ann = (n: number, part: string, title: string, text: string, labs: string[], side: "left" | "right", icon: string): Annotation => ({ n, part, title, text, labs, more: 0, side, icon });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const none: LiveReadout = { text: null, ring: null };

export const autoControls: Control[] = [
  { kind: "hold", part: "start", label: "Hold to press", key: "startPressed", tone: "#2e9e5b" },
  { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
];

export const stationParts = (x = -4.4): RigPart[] => [
  { id: "start", name: "Auto start", kicker: "INPUT · I0.0", spec: "22 MM · GREEN · 1 NO", description: "Puts the process into automatic.", anchor: [x, 1.4, 3.2], explode: 1.4 },
  { id: "stop", name: "Stop", kicker: "INPUT · I0.1 · NC", spec: "22 MM · RED · 1 NC", description: "Normally closed: 1 at rest, 0 when pressed.", anchor: [x + 0.7, 1.4, 3.2], explode: 1.4 },
  { id: "plc", name: "Controller", kicker: "CPU · DI / DQ / AI", spec: "24 V DC · SCAN 100 MS", description: "Reads the level switches and transmitter and drives the valves and pumps.", anchor: [-3.8, 1.6, -2.6], explode: 2.2 },
];

export const stationWires = (): WireDef[] => [
  { n: 1, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the station and switches", caption: "Supply for every input.", role: "supply" },
  { n: 2, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Auto start to I0.0", caption: "Pressing it puts 24 V on I0.0.", role: "auto start", signal: "Start_PB" },
  { n: 3, plc: "I0.1", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop NC to I0.1", caption: "Normally closed, 1 at rest.", role: "stop healthy", signal: "Stop_PB" },
];

export const stationDevices: FieldDevice[] = [
  { id: "start", name: "Auto start S1", terminals: ["13", "14"], tone: "#22a061" },
  { id: "stop", name: "Stop S2, NC", terminals: ["11", "12"], tone: "#d23c3c" },
];

export const stationTags: RigTag[] = [
  { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Auto start pushbutton, NO" },
  { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Stop pushbutton, NC" },
];

/* ------------------------------------------------------------------ tank */

export const TANK = { low: 0.25, high: 0.8, highHigh: 0.92 };

export const tank: RigDef = {
  id: "tank",
  name: "Header tank",
  headline: ["Tank", "level"],
  tagline: "Float switches · Transmitter · Inlet valve",
  view: { target: [0, 1.6, 0.4], scale: 1.12 },
  tags: [
    ...stationTags,
    { tag: "Float_Low", address: "I0.2", kind: "input", color: "#3d8fd6", connectsTo: "Low float switch, 1 when covered" },
    { tag: "Float_High", address: "I0.3", kind: "input", color: "#3d8fd6", connectsTo: "High float switch, 1 when covered" },
    { tag: "Level_Raw", address: "IW64", kind: "input", color: "#6b4fa0", connectsTo: "Level transmitter LT1, 0 to 27648", analog: true },
    { tag: "Inlet_Valve", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Inlet solenoid valve" },
    { tag: "Run_Lamp", address: "Q0.1", kind: "output", color: "#2e9e5b", connectsTo: "Green auto lamp" },
    { tag: "Alarm_Lamp", address: "Q0.2", kind: "output", color: "#d64545", connectsTo: "Red high level alarm lamp" },
  ],
  parts: [
    ...stationParts(),
    { id: "tank", name: "Tank", kicker: "VESSEL · 1000 L", spec: "STAINLESS · SIGHT GLASS", description: "Water flows in through the inlet valve and out to the plant at whatever rate the plant demands.", anchor: [0.4, 4.6, 0.2], explode: 0.6 },
    { id: "valve", name: "Inlet valve", kicker: "OUTPUT · Q0.0", spec: "SOLENOID · 24 V DC · NC", description: "Opens when energised and lets water into the tank.", anchor: [-1.4, 5.0, 0.2], explode: 0.8 },
    { id: "floats", name: "Float switches", kicker: "INPUTS · I0.2 · I0.3", spec: "LOW 25 % · HIGH 80 %", description: "Each float lifts and closes its contact when the water reaches it.", anchor: [1.7, 3.6, 0.2], explode: 0.8 },
    { id: "lt", name: "Level transmitter", kicker: "ANALOG · IW64", spec: "4-20 MA · 0 TO 27648", description: "Reports the level as a number, so the program can work in percent.", anchor: [-0.6, 4.6, 1.4], explode: 0.8 },
    { id: "demand", name: "Outlet", kicker: "PROCESS DEMAND", spec: "HAND VALVE", description: "How much water the plant takes. Turn it up and down to test your control.", anchor: [2.6, 1.0, 1.6], explode: 0.6 },
  ],
  annotations: [
    ann(1, "start", "Pushbuttons", "Auto start and a normally closed Stop.", ["p-tank-level", "p-analog"], "left", "pushbuttons"),
    ann(2, "plc", "Controller", "Opens the inlet when the level is low, closes it when high.", ["p-tank-level", "p-analog"], "left", "plc"),
    ann(3, "valve", "Inlet valve", "A solenoid valve. Energise to open.", ["p-tank-level", "p-analog"], "left", "contactor"),
    ann(4, "floats", "Float switches", "Low at 25 %, high at 80 %. Simple and very reliable.", ["p-tank-level"], "right", "terminals"),
    ann(5, "lt", "Transmitter", "The level as a number from 0 to 27648.", ["p-analog"], "right", "plc"),
    ann(6, "demand", "Outlet", "The plant's demand. Change it to test your control.", ["p-tank-level", "p-analog"], "right", "terminals"),
  ],
  initial: { startPressed: false, stopPressed: false, level: 0.4, demand: 0.5, inflow: 0, overflowed: 0 },
  faults: [
    { key: "highFloatStuck", label: "High float stuck down", part: "floats" },
    { key: "valveStuck", label: "Inlet valve stuck open", part: "valve" },
  ],
  controls: [
    ...autoControls,
    { kind: "slider", part: "demand", label: "Plant demand", key: "demand", min: 0, max: 1, step: 0.05, unit: "" },
    { kind: "meter", part: "tank", label: "Level", key: "level", max: 1, scale: 100, unit: "%", tone: "#3d8fd6" },
    { kind: "status", part: "valve", label: "Inlet", value: (p) => ({ text: Number(p.inflow) > 0 ? "Open" : "Closed", on: Number(p.inflow) > 0 }) },
  ],
  wiring: {
    terminals: terminals(4, 3),
    devices: [
      ...stationDevices,
      { id: "fLow", name: "Low float LS1", terminals: ["1", "2"], tone: "#3d8fd6" },
      { id: "fHigh", name: "High float LS2", terminals: ["1", "2"], tone: "#3d8fd6" },
      { id: "valve", name: "Inlet valve Y1", terminals: ["1", "2"], tone: "#2457a6" },
      { id: "runLamp", name: "Auto lamp H1", terminals: ["X1", "X2"], tone: "#22a061" },
      { id: "alarm", name: "Alarm lamp H2", terminals: ["X1", "X2"], tone: "#d23c3c" },
    ],
    wires: [
      ...stationWires(),
      { n: 4, plc: "I0.2", device: "fLow", terminal: "2", color: "#3d8fd6", title: "Low float to I0.2", caption: "1 while the water covers the low float.", role: "level above low", signal: "Float_Low" },
      { n: 5, plc: "I0.3", device: "fHigh", terminal: "2", color: "#3d8fd6", title: "High float to I0.3", caption: "1 while the water covers the high float.", role: "level above high", signal: "Float_High" },
      { n: 6, plc: "Q0.0", device: "valve", terminal: "1", color: "#2f6fd6", title: "Q0.0 to inlet valve", caption: "Energise to open.", role: "fill", signal: "Inlet_Valve" },
      { n: 7, plc: "Q0.1", device: "runLamp", terminal: "X1", color: "#2f6fd6", title: "Q0.1 to auto lamp", caption: "Lit in automatic.", role: "auto", signal: "Run_Lamp" },
      { n: 8, plc: "Q0.2", device: "alarm", terminal: "X1", color: "#2f6fd6", title: "Q0.2 to alarm lamp", caption: "Lit on a high level alarm.", role: "alarm", signal: "Alarm_Lamp" },
    ],
  },
  readInputs: (p, f) => {
    const level = Number(p.level);
    return {
      Start_PB: Boolean(p.startPressed),
      Stop_PB: !p.stopPressed,
      Float_Low: level >= TANK.low,
      Float_High: f.highFloatStuck ? false : level >= TANK.high,
      Level_Raw: Math.round(clamp01(level) * RAW_FULL),
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    const inflow = m.Inlet_Valve || f.valveStuck ? 0.09 : 0;
    const out = Number(p.demand) * 0.06 * Math.sqrt(Math.max(0, Number(p.level)));
    let level = Number(p.level) + (inflow - out) * dt;
    let overflowed = Number(p.overflowed);
    if (level > 1) {
      overflowed += level - 1;
      level = 1;
    }
    return { ...p, level: Math.max(0, level), inflow, overflowed };
  },
  events: (b, a) => (Number(b.overflowed) === 0 && Number(a.overflowed) > 0 ? [["fault · tank overflowed", "fault"]] : []),
  live: (part, p, m) => {
    const level = Number(p.level);
    if (part === "tank") return { text: `${Math.round(level * 100)} %`, ring: level > TANK.highHigh ? "fault" : level < TANK.low ? "warn" : "run" };
    if (part === "valve") return Number(p.inflow) > 0 ? { text: "open · filling", ring: "run" } : none;
    if (part === "lt") return { text: `${Math.round(level * RAW_FULL)} raw`, ring: null };
    if (part === "demand") return { text: `demand ${Math.round(Number(p.demand) * 100)} %`, ring: null };
    if (part === "floats") return { text: `${level >= TANK.low ? "low on" : "low off"} · ${level >= TANK.high ? "high on" : "high off"}`, ring: null };
    void m;
    return none;
  },
};

/* ----------------------------------------------------------------- pumps */

export const WELL = { low: 0.15, lead: 0.5, lag: 0.72, highHigh: 0.9 };

export const pumps: RigDef = {
  id: "pumps",
  name: "Duplex pump station",
  headline: ["Duty", "standby"],
  tagline: "Lead and lag · Alternation · Alarms",
  view: { target: [0, 1.2, 0.4], scale: 1.05 },
  tags: [
    ...stationTags,
    { tag: "LS_Low", address: "I0.2", kind: "input", color: "#3d8fd6", connectsTo: "Low level float, 1 when covered" },
    { tag: "LS_Lead", address: "I0.3", kind: "input", color: "#3d8fd6", connectsTo: "Lead start float, 1 when covered" },
    { tag: "LS_Lag", address: "I0.4", kind: "input", color: "#3d8fd6", connectsTo: "Lag start float, 1 when covered" },
    { tag: "LS_HighHigh", address: "I0.5", kind: "input", color: "#d64545", connectsTo: "High-high alarm float, 1 when covered" },
    { tag: "P1_OK", address: "I0.6", kind: "input", color: "#f26b1d", connectsTo: "Pump 1 overload, NC" },
    { tag: "P2_OK", address: "I0.7", kind: "input", color: "#f26b1d", connectsTo: "Pump 2 overload, NC" },
    { tag: "Ack_PB", address: "I1.0", kind: "input", color: "#3d434a", connectsTo: "Alarm acknowledge pushbutton" },
    { tag: "Level_Raw", address: "IW64", kind: "input", color: "#6b4fa0", connectsTo: "Level transmitter, 0 to 27648", analog: true },
    { tag: "P1_Run", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Pump 1 contactor" },
    { tag: "P2_Run", address: "Q0.1", kind: "output", color: "#2457a6", connectsTo: "Pump 2 contactor" },
    { tag: "Horn", address: "Q0.2", kind: "output", color: "#e0a526", connectsTo: "Alarm horn and beacon" },
    { tag: "Alarm_Lamp", address: "Q0.3", kind: "output", color: "#d64545", connectsTo: "Red alarm lamp" },
  ],
  parts: [
    ...stationParts(),
    { id: "ack", name: "Acknowledge", kicker: "INPUT · I1.0", spec: "22 MM · BLACK · 1 NO", description: "Silences the horn and acknowledges alarms.", anchor: [-3.0, 1.4, 3.2], explode: 1.4 },
    { id: "well", name: "Wet well", kicker: "SUMP · 2000 L", spec: "CONCRETE · INFLOW FROM PLANT", description: "Waste water runs in from the plant. The pumps keep the level between the floats.", anchor: [0.8, 3.3, 0.6], explode: 0.6 },
    { id: "floats", name: "Floats", kicker: "INPUTS · I0.2 TO I0.5", spec: "LOW · LEAD · LAG · HIGH-HIGH", description: "Four float switches at different heights.", anchor: [0.8, 3.6, -0.6], explode: 0.8 },
    { id: "p1", name: "Pump 1", kicker: "OUTPUT · Q0.0", spec: "4 KW · 25 L/S", description: "One of two identical pumps. Either can be duty.", anchor: [3.2, 2.0, -0.9], explode: 0.9 },
    { id: "p2", name: "Pump 2", kicker: "OUTPUT · Q0.1", spec: "4 KW · 25 L/S", description: "The other pump. Alternating duty shares the wear.", anchor: [3.2, 2.0, 1.6], explode: 0.9 },
    { id: "inflow", name: "Inflow", kicker: "PROCESS", spec: "0 TO 45 L/S", description: "How fast water arrives. Above three quarters, more than one pump can handle, the lag pump is needed.", anchor: [-1.4, 3.6, 0.6], explode: 0.6 },
    { id: "horn", name: "Horn", kicker: "OUTPUT · Q0.2", spec: "BEACON AND SOUNDER", description: "Sounds on a new alarm until acknowledged.", anchor: [-1.4, 2.6, 2.8], explode: 0.6 },
  ],
  annotations: [
    ann(1, "start", "Pushbuttons", "Auto start, Stop and alarm acknowledge.", ["p-duplex", "p-alarms"], "left", "pushbuttons"),
    ann(2, "plc", "Controller", "Chooses the lead pump and swaps it every cycle.", ["p-duplex", "p-alarms"], "left", "plc"),
    ann(3, "inflow", "Inflow", "Turn it up past one pump's capacity to bring in the lag pump.", ["p-duplex"], "left", "terminals"),
    ann(4, "floats", "Floats", "Stop, lead start, lag start and high-high alarm.", ["p-duplex", "p-alarms"], "right", "terminals"),
    ann(5, "p1", "Pump 1", "Duty or standby. Its overload feeds back on I0.6.", ["p-duplex", "p-alarms"], "right", "motor"),
    ann(6, "p2", "Pump 2", "The other pump. Takes over if pump 1 trips.", ["p-duplex", "p-alarms"], "right", "motor"),
  ],
  initial: { startPressed: false, stopPressed: false, ackPressed: false, level: 0.3, inflow: 0.6, p1Speed: 0, p2Speed: 0, p1Hours: 0, p2Hours: 0, overflowed: 0 },
  faults: [
    { key: "p1Trip", label: "Pump 1 overload tripped", part: "p1" },
    { key: "p2Trip", label: "Pump 2 overload tripped", part: "p2" },
    { key: "lagFloatStuck", label: "Lag float stuck down", part: "floats" },
  ],
  controls: [
    ...autoControls,
    { kind: "hold", part: "ack", label: "Hold to press", key: "ackPressed", tone: "#3d434a" },
    { kind: "slider", part: "inflow", label: "Inflow", key: "inflow", min: 0, max: 1, step: 0.05, unit: "" },
    { kind: "meter", part: "well", label: "Level", key: "level", max: 1, scale: 100, unit: "%", tone: "#3d8fd6" },
    { kind: "meter", part: "p1", label: "Run hours", key: "p1Hours", max: 600, unit: "s", tone: "#2457a6" },
    { kind: "meter", part: "p2", label: "Run hours", key: "p2Hours", max: 600, unit: "s", tone: "#2457a6" },
  ],
  wiring: {
    terminals: [...terminals(8, 4), { id: "I1.0", label: "I1.0", kind: "input" }],
    devices: [
      ...stationDevices,
      { id: "fLow", name: "Low float LS1", terminals: ["1", "2"], tone: "#3d8fd6" },
      { id: "fLead", name: "Lead float LS2", terminals: ["1", "2"], tone: "#3d8fd6" },
      { id: "fLag", name: "Lag float LS3", terminals: ["1", "2"], tone: "#3d8fd6" },
      { id: "fHH", name: "High-high float LS4", terminals: ["1", "2"], tone: "#d23c3c" },
      { id: "ol1", name: "Pump 1 overload F1", terminals: ["95", "96"], tone: "#f26b1d" },
      { id: "ol2", name: "Pump 2 overload F2", terminals: ["95", "96"], tone: "#f26b1d" },
      { id: "k1", name: "Pump 1 contactor K1", terminals: ["A1", "A2"], tone: "#2457a6" },
      { id: "k2", name: "Pump 2 contactor K2", terminals: ["A1", "A2"], tone: "#2457a6" },
      { id: "horn", name: "Horn H1", terminals: ["X1", "X2"], tone: "#e0a526" },
    ],
    wires: [
      ...stationWires(),
      { n: 4, plc: "I0.2", device: "fLow", terminal: "2", color: "#3d8fd6", title: "Low float to I0.2", caption: "1 while covered: below it, every pump stops.", role: "low", signal: "LS_Low" },
      { n: 5, plc: "I0.3", device: "fLead", terminal: "2", color: "#3d8fd6", title: "Lead float to I0.3", caption: "Starts the duty pump.", role: "lead start", signal: "LS_Lead" },
      { n: 6, plc: "I0.4", device: "fLag", terminal: "2", color: "#3d8fd6", title: "Lag float to I0.4", caption: "Starts the second pump when one is not keeping up.", role: "lag start", signal: "LS_Lag" },
      { n: 7, plc: "I0.5", device: "fHH", terminal: "2", color: "#d23c3c", title: "High-high float to I0.5", caption: "Raises the high level alarm.", role: "high-high", signal: "LS_HighHigh" },
      { n: 8, plc: "I0.6", device: "ol1", terminal: "96", color: "#f26b1d", title: "Pump 1 overload to I0.6", caption: "1 while healthy.", role: "P1 healthy", signal: "P1_OK" },
      { n: 9, plc: "I0.7", device: "ol2", terminal: "96", color: "#f26b1d", title: "Pump 2 overload to I0.7", caption: "1 while healthy.", role: "P2 healthy", signal: "P2_OK" },
      { n: 10, plc: "Q0.0", device: "k1", terminal: "A1", color: "#2f6fd6", title: "Q0.0 to pump 1 contactor", caption: "Runs pump 1.", role: "pump 1", signal: "P1_Run" },
      { n: 11, plc: "Q0.1", device: "k2", terminal: "A1", color: "#2f6fd6", title: "Q0.1 to pump 2 contactor", caption: "Runs pump 2.", role: "pump 2", signal: "P2_Run" },
      { n: 12, plc: "Q0.2", device: "horn", terminal: "X1", color: "#2f6fd6", title: "Q0.2 to horn", caption: "Sounds until acknowledged.", role: "horn", signal: "Horn" },
    ],
  },
  readInputs: (p, f) => {
    const level = Number(p.level);
    return {
      Start_PB: Boolean(p.startPressed),
      Stop_PB: !p.stopPressed,
      LS_Low: level >= WELL.low,
      LS_Lead: level >= WELL.lead,
      LS_Lag: f.lagFloatStuck ? false : level >= WELL.lag,
      LS_HighHigh: level >= WELL.highHigh,
      P1_OK: !f.p1Trip,
      P2_OK: !f.p2Trip,
      Ack_PB: Boolean(p.ackPressed),
      Level_Raw: Math.round(clamp01(level) * RAW_FULL),
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    const run1 = Boolean(m.P1_Run) && !f.p1Trip;
    const run2 = Boolean(m.P2_Run) && !f.p2Trip;
    const p1Speed = Number(p.p1Speed) + ((run1 ? 1 : 0) - Number(p.p1Speed)) * Math.min(1, dt / 0.6);
    const p2Speed = Number(p.p2Speed) + ((run2 ? 1 : 0) - Number(p.p2Speed)) * Math.min(1, dt / 0.6);
    const inflow = Number(p.inflow) * 0.16;
    const pumped = (p1Speed + p2Speed) * 0.12 * (Number(p.level) > 0.02 ? 1 : 0);
    let level = Number(p.level) + (inflow - pumped) * dt;
    let overflowed = Number(p.overflowed);
    if (level > 1) {
      overflowed += level - 1;
      level = 1;
    }
    return {
      ...p,
      level: Math.max(0, level),
      p1Speed,
      p2Speed,
      p1Hours: Number(p.p1Hours) + (run1 ? dt : 0),
      p2Hours: Number(p.p2Hours) + (run2 ? dt : 0),
      overflowed,
    };
  },
  events: (b, a) => (Number(b.overflowed) === 0 && Number(a.overflowed) > 0 ? [["fault · wet well overflowed", "fault"]] : []),
  live: (part, p, m) => {
    const level = Number(p.level);
    if (part === "well") return { text: `${Math.round(level * 100)} %`, ring: level >= WELL.highHigh ? "fault" : level >= WELL.lag ? "warn" : "run" };
    if (part === "p1") return Number(p.p1Speed) > 0.05 ? { text: `running · ${Math.round(Number(p.p1Hours))} s`, ring: "run" } : none;
    if (part === "p2") return Number(p.p2Speed) > 0.05 ? { text: `running · ${Math.round(Number(p.p2Hours))} s`, ring: "run" } : none;
    if (part === "inflow") return { text: `${Math.round(Number(p.inflow) * 45)} L/s in`, ring: null };
    if (part === "horn") return m.Horn ? { text: "sounding", ring: "fault" } : none;
    return none;
  },
};

/* ----------------------------------------------------------------- mixer */

export const MIX = { low: 0.08, mid: 0.45, full: 0.85 };

export const mixer: RigDef = {
  id: "mixer",
  name: "Batch mixer",
  headline: ["Batch", "mixer"],
  tagline: "Sequence steps · Fill, mix, drain",
  view: { target: [0, 2.2, 0.4], scale: 1.2 },
  tags: [
    ...stationTags,
    { tag: "LS_Low", address: "I0.2", kind: "input", color: "#3d8fd6", connectsTo: "Low level switch, 1 when covered" },
    { tag: "LS_Mid", address: "I0.3", kind: "input", color: "#3d8fd6", connectsTo: "Mid level switch, 1 when covered" },
    { tag: "LS_Full", address: "I0.4", kind: "input", color: "#3d8fd6", connectsTo: "Full level switch, 1 when covered" },
    { tag: "Valve_A", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Ingredient A valve" },
    { tag: "Valve_B", address: "Q0.1", kind: "output", color: "#e0a526", connectsTo: "Ingredient B valve" },
    { tag: "Agitator", address: "Q0.2", kind: "output", color: "#6b6f76", connectsTo: "Agitator motor contactor" },
    { tag: "Drain_Valve", address: "Q0.3", kind: "output", color: "#3d434a", connectsTo: "Drain valve" },
    { tag: "Done_Lamp", address: "Q0.4", kind: "output", color: "#2e9e5b", connectsTo: "Green batch complete lamp" },
  ],
  parts: [
    ...stationParts(),
    { id: "vessel", name: "Mixing vessel", kicker: "VESSEL · 500 L", spec: "STAINLESS · SIGHT GLASS", description: "Ingredients A and B go in, get mixed, and leave through the drain.", anchor: [0.6, 4.8, 0.4], explode: 0.6 },
    { id: "valveA", name: "Valve A", kicker: "OUTPUT · Q0.0", spec: "SOLENOID · BLUE LINE", description: "Ingredient A, up to the mid level.", anchor: [-0.9, 5.4, -0.4], explode: 0.8 },
    { id: "valveB", name: "Valve B", kicker: "OUTPUT · Q0.1", spec: "SOLENOID · AMBER LINE", description: "Ingredient B, from mid to full.", anchor: [2.1, 5.4, -0.4], explode: 0.8 },
    { id: "agitator", name: "Agitator", kicker: "OUTPUT · Q0.2", spec: "0.75 KW · 120 RPM", description: "Mixes the batch. The colour changes as A and B blend.", anchor: [0.6, 6.4, 0.4], explode: 1.0 },
    { id: "drain", name: "Drain valve", kicker: "OUTPUT · Q0.3", spec: "SOLENOID · DN50", description: "Empties the vessel at the end of the batch.", anchor: [0.6, 1.0, 1.6], explode: 0.6 },
    { id: "levels", name: "Level switches", kicker: "INPUTS · I0.2 TO I0.4", spec: "LOW · MID · FULL", description: "Capacitive switches on the vessel wall.", anchor: [2.0, 3.6, 0.4], explode: 0.8 },
  ],
  annotations: [
    ann(1, "start", "Pushbuttons", "Start a batch, or Stop it at any step.", ["m-mixer"], "left", "pushbuttons"),
    ann(2, "plc", "Controller", "Steps through fill A, fill B, mix and drain, one step at a time.", ["m-mixer"], "left", "plc"),
    ann(3, "valveA", "Valve A", "Fills ingredient A to the mid switch.", ["m-mixer"], "left", "contactor"),
    ann(4, "valveB", "Valve B", "Tops up with ingredient B to the full switch.", ["m-mixer"], "right", "contactor"),
    ann(5, "agitator", "Agitator", "Runs for a timed mix.", ["m-mixer"], "right", "motor"),
    ann(6, "drain", "Drain", "Empties the vessel until the low switch clears.", ["m-mixer"], "right", "contactor"),
  ],
  initial: { startPressed: false, stopPressed: false, level: 0, fracA: 0, mixed: 0, agitator: 0, batches: 0 },
  faults: [{ key: "drainBlocked", label: "Drain blocked", part: "drain" }],
  controls: [
    ...autoControls,
    { kind: "meter", part: "vessel", label: "Level", key: "level", max: 1, scale: 100, unit: "%", tone: "#3d8fd6" },
    { kind: "meter", part: "agitator", label: "Mixed", key: "mixed", max: 1, scale: 100, unit: "%", tone: "#2e9e5b" },
  ],
  wiring: {
    terminals: terminals(5, 5),
    devices: [
      ...stationDevices,
      { id: "lsLow", name: "Low switch LS1", terminals: ["BN", "BK", "BU"], tone: "#3d8fd6" },
      { id: "lsMid", name: "Mid switch LS2", terminals: ["BN", "BK", "BU"], tone: "#3d8fd6" },
      { id: "lsFull", name: "Full switch LS3", terminals: ["BN", "BK", "BU"], tone: "#3d8fd6" },
      { id: "va", name: "Valve A Y1", terminals: ["1", "2"], tone: "#2457a6" },
      { id: "vb", name: "Valve B Y2", terminals: ["1", "2"], tone: "#e0a526" },
      { id: "ag", name: "Agitator K1", terminals: ["A1", "A2"], tone: "#6b6f76" },
      { id: "dv", name: "Drain valve Y3", terminals: ["1", "2"], tone: "#3d434a" },
      { id: "done", name: "Done lamp H1", terminals: ["X1", "X2"], tone: "#22a061" },
    ],
    wires: [
      ...stationWires(),
      { n: 4, plc: "I0.2", device: "lsLow", terminal: "BK", color: "#2f2f2f", title: "Low switch to I0.2", caption: "1 while liquid covers it.", role: "low", signal: "LS_Low" },
      { n: 5, plc: "I0.3", device: "lsMid", terminal: "BK", color: "#2f2f2f", title: "Mid switch to I0.3", caption: "End of ingredient A.", role: "mid", signal: "LS_Mid" },
      { n: 6, plc: "I0.4", device: "lsFull", terminal: "BK", color: "#2f2f2f", title: "Full switch to I0.4", caption: "End of ingredient B.", role: "full", signal: "LS_Full" },
      { n: 7, plc: "Q0.0", device: "va", terminal: "1", color: "#2f6fd6", title: "Q0.0 to valve A", caption: "Ingredient A.", role: "valve A", signal: "Valve_A" },
      { n: 8, plc: "Q0.1", device: "vb", terminal: "1", color: "#2f6fd6", title: "Q0.1 to valve B", caption: "Ingredient B.", role: "valve B", signal: "Valve_B" },
      { n: 9, plc: "Q0.2", device: "ag", terminal: "A1", color: "#2f6fd6", title: "Q0.2 to agitator", caption: "Runs the mixer.", role: "agitator", signal: "Agitator" },
      { n: 10, plc: "Q0.3", device: "dv", terminal: "1", color: "#2f6fd6", title: "Q0.3 to drain valve", caption: "Empties the vessel.", role: "drain", signal: "Drain_Valve" },
      { n: 11, plc: "Q0.4", device: "done", terminal: "X1", color: "#2f6fd6", title: "Q0.4 to done lamp", caption: "Lit when a batch completes.", role: "done", signal: "Done_Lamp" },
    ],
  },
  readInputs: (p) => {
    const level = Number(p.level);
    return {
      Start_PB: Boolean(p.startPressed),
      Stop_PB: !p.stopPressed,
      LS_Low: level >= MIX.low,
      LS_Mid: level >= MIX.mid,
      LS_Full: level >= MIX.full,
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    const level0 = Number(p.level);
    const inA = m.Valve_A ? 0.08 : 0;
    const inB = m.Valve_B ? 0.08 : 0;
    const out = m.Drain_Valve && !f.drainBlocked ? 0.1 : 0;
    const level = Math.max(0, Math.min(1, level0 + (inA + inB - out) * dt));
    const volA = level0 * Number(p.fracA) + inA * dt - out * dt * Number(p.fracA);
    const fracA = level > 0.001 ? Math.max(0, Math.min(1, volA / level)) : 0;
    const agitator = Number(p.agitator) + ((m.Agitator ? 1 : 0) - Number(p.agitator)) * Math.min(1, dt / 0.5);
    // Fresh ingredient unmixes the batch a little; the agitator blends it.
    let mixed = Number(p.mixed);
    if (inA + inB > 0) mixed = Math.max(0, mixed - dt * 0.15);
    mixed = Math.min(1, mixed + agitator * dt * 0.12);
    if (level < 0.01) mixed = 0;
    const batches = Number(p.batches) + (level0 > 0.01 && level <= 0.01 && out > 0 ? 1 : 0);
    return { ...p, level, fracA, mixed, agitator, batches };
  },
  live: (part, p, m) => {
    if (part === "vessel") return { text: `${Math.round(Number(p.level) * 100)} % · ${Math.round(Number(p.mixed) * 100)} % mixed`, ring: null };
    if (part === "agitator") return Number(p.agitator) > 0.05 ? { text: "mixing", ring: "run" } : none;
    if (part === "valveA") return m.Valve_A ? { text: "open", ring: "run" } : none;
    if (part === "valveB") return m.Valve_B ? { text: "open", ring: "run" } : none;
    if (part === "drain") return m.Drain_Valve ? { text: "draining", ring: "run" } : none;
    return none;
  },
};
