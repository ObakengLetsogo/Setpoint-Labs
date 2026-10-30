import { ann, autoControls, stationDevices, stationParts, stationTags, stationWires, terminals } from "./process";
import type { LiveReadout, RigDef } from "./types";

/*
 * A level and flow loop trainer. A control valve (0..100 %) feeds the tank through a flow
 * transmitter; the plant draws water out at the demand set by the learner. The analogue card
 * scales both transmitters to 0.0..100.0 %. Upstream supply pressure is a disturbance the flow
 * loop must reject, which is what cascade control is for.
 */

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const none: LiveReadout = { text: null, ring: null };
const pct = (v: number) => `${Math.round(v)} %`;
/** Valve travel speed: full stroke in 4 s. */
const STROKE_PER_S = 0.25;
/** Flow through a fully open valve at normal supply pressure, in tank heights per second. */
const FLOW_GAIN = 0.02;
const FLOW_LAG_S = 1.5;
const LT_LAG_S = 6;

export const pid: RigDef = {
  id: "pid",
  name: "Level and flow loop",
  headline: ["Loop", "control"],
  tagline: "Control valve · Flow and level transmitters · PID",
  view: { target: [0, 1.6, 0.4], scale: 1.12 },
  tags: [
    ...stationTags,
    { tag: "Auto_Sel", address: "I0.2", kind: "input", color: "#6b6f76", connectsTo: "Hand / auto selector, 1 in auto" },
    { tag: "Level_PV", address: "IW64", kind: "input", color: "#6b4fa0", connectsTo: "Level transmitter LT1, card scaled 0.0 to 100.0 %", analog: true },
    { tag: "Flow_PV", address: "IW66", kind: "input", color: "#6b4fa0", connectsTo: "Flow transmitter FT1, card scaled 0.0 to 100.0 %", analog: true },
    { tag: "Level_SP", address: "HMI", kind: "marker", color: "#2457a6", connectsTo: "Level setpoint from the faceplate, %", analog: true },
    { tag: "Hand_CV", address: "HMI", kind: "marker", color: "#2457a6", connectsTo: "Manual valve output from the faceplate, %", analog: true },
    { tag: "Valve_CV", address: "QW80", kind: "output", color: "#2457a6", connectsTo: "Control valve FV1 positioner, 4-20 mA for 0 to 100 %", analog: true },
    { tag: "Run_Lamp", address: "Q0.0", kind: "output", color: "#2e9e5b", connectsTo: "Green loop in auto lamp" },
  ],
  parts: [
    ...stationParts(),
    { id: "tank", name: "Tank", kicker: "VESSEL · 1000 L", spec: "STAINLESS · SIGHT GLASS", description: "Water comes in through the control valve and leaves at the plant's demand.", anchor: [0.4, 4.6, 0.2], explode: 0.6 },
    { id: "valve", name: "Control valve", kicker: "ANALOG OUTPUT · QW80", spec: "GLOBE · POSITIONER · 4-20 MA", description: "Opens in proportion to its signal, not just open or shut. It takes about 4 s to stroke fully.", anchor: [-1.4, 5.0, 0.2], explode: 0.8 },
    { id: "ft", name: "Flow transmitter", kicker: "ANALOG · IW66", spec: "MAG FLOW · 4-20 MA", description: "Measures the water going into the tank.", anchor: [-3.0, 5.0, 0.2], explode: 0.8 },
    { id: "lt", name: "Level transmitter", kicker: "ANALOG · IW64", spec: "4-20 MA · 0 TO 100 %", description: "Measures the level. The card scales it to percent.", anchor: [-0.6, 4.6, 1.4], explode: 0.8 },
    { id: "demand", name: "Outlet", kicker: "LOAD DISTURBANCE", spec: "HAND VALVE", description: "How much the plant takes. A change here is a load disturbance.", anchor: [2.6, 1.0, 1.6], explode: 0.6 },
    { id: "supply", name: "Supply pressure", kicker: "SUPPLY DISTURBANCE", spec: "HEADER 2 TO 5 BAR", description: "The pressure upstream of the valve. When it changes, the same valve opening gives a different flow.", anchor: [-4.6, 3.2, 0.2], explode: 0.6 },
    { id: "faceplate", name: "Loop faceplate", kicker: "HMI · LIC1", spec: "SP · PV · CV · TREND", description: "Shows the setpoint, the measured level and the valve output, with a 60 s trend.", anchor: [4.3, 3.2, -1.6], explode: 0.6 },
    { id: "auto", name: "Hand / auto", kicker: "INPUT · I0.2", spec: "2 POSITION SELECTOR", description: "Hand: the operator sets the valve. Auto: the PID does.", anchor: [-2.9, 1.4, 3.2], explode: 1.4 },
  ],
  annotations: [
    ann(1, "auto", "Hand / auto", "Choose who moves the valve: the operator or the PID.", ["p-pid-what", "p-pid-block", "p-pid-tune", "p-pid-cascade"], "left", "pushbuttons"),
    ann(2, "plc", "Controller", "Runs the PID blocks every scan.", ["p-pid-what", "p-pid-block", "p-pid-tune", "p-pid-cascade"], "left", "plc"),
    ann(3, "valve", "Control valve", "0 to 100 % open, set by the analogue output.", ["p-pid-what", "p-pid-block", "p-pid-tune", "p-pid-cascade"], "left", "contactor"),
    ann(4, "lt", "Level transmitter", "The measured value of the level loop.", ["p-pid-what", "p-pid-block", "p-pid-tune", "p-pid-cascade"], "right", "plc"),
    ann(5, "ft", "Flow transmitter", "The measured value of the flow loop.", ["p-pid-cascade"], "right", "plc"),
    ann(6, "demand", "Outlet", "Change the demand to disturb the loop.", ["p-pid-what", "p-pid-block", "p-pid-tune", "p-pid-cascade"], "right", "terminals"),
  ],
  initial: { startPressed: false, stopPressed: false, auto: false, level: 0.3, measured: 0.3, demand: 0.5, valve: 0, inflow: 0, supply: 1, sp: 60, handCv: 0 },
  faults: [
    { key: "stiction", label: "Valve sticking (stiction)", part: "valve" },
    { key: "noisyLt", label: "Noisy level signal", part: "lt" },
    { key: "ftFail", label: "Flow transmitter failed low", part: "ft" },
  ],
  controls: [
    ...autoControls,
    { kind: "toggle", part: "auto", label: "Selector", key: "auto", on: "Auto", off: "Hand", logOn: "loop · auto selected", logOff: "loop · hand selected" },
    { kind: "slider", part: "tank", label: "Level setpoint", key: "sp", min: 10, max: 90, step: 5, unit: "%" },
    { kind: "slider", part: "valve", label: "Hand output", key: "handCv", min: 0, max: 100, step: 5, unit: "%" },
    { kind: "meter", part: "valve", label: "Valve position", key: "valve", max: 1, scale: 100, unit: "%", tone: "#2457a6" },
    { kind: "meter", part: "tank", label: "Level", key: "level", max: 1, scale: 100, unit: "%", tone: "#3d8fd6" },
    { kind: "slider", part: "demand", label: "Plant demand", key: "demand", min: 0, max: 1, step: 0.05, unit: "" },
    { kind: "slider", part: "supply", label: "Supply pressure", key: "supply", min: 0.5, max: 1.5, step: 0.1, unit: "×" },
  ],
  wiring: {
    terminals: [...terminals(3, 1), { id: "AI0", label: "AI0", kind: "input" }, { id: "AI1", label: "AI1", kind: "input" }, { id: "AQ0", label: "AQ0", kind: "output" }],
    devices: [
      ...stationDevices,
      { id: "sel", name: "Hand / auto S3", terminals: ["13", "14"], tone: "#6b6f76" },
      { id: "lt", name: "Level transmitter LT1", terminals: ["+", "-"], tone: "#6b4fa0" },
      { id: "ft", name: "Flow transmitter FT1", terminals: ["+", "-"], tone: "#6b4fa0" },
      { id: "fv", name: "Control valve FV1", terminals: ["+", "-"], tone: "#2457a6" },
      { id: "lamp", name: "Auto lamp H1", terminals: ["X1", "X2"], tone: "#22a061" },
    ],
    wires: [
      ...stationWires(),
      { n: 4, plc: "I0.2", device: "sel", terminal: "14", color: "#6b6f76", title: "Selector to I0.2", caption: "1 in auto.", role: "auto selected", signal: "Auto_Sel" },
      { n: 5, plc: "AI0", device: "lt", terminal: "+", color: "#6b4fa0", title: "LT1 to AI0", caption: "4-20 mA, two wire, loop powered.", role: "level", signal: "Level_PV" },
      { n: 6, plc: "AI1", device: "ft", terminal: "+", color: "#6b4fa0", title: "FT1 to AI1", caption: "4-20 mA flow signal.", role: "flow", signal: "Flow_PV" },
      { n: 7, plc: "AQ0", device: "fv", terminal: "+", color: "#2f6fd6", title: "AQ0 to FV1 positioner", caption: "4 mA shut, 20 mA fully open.", role: "valve demand", signal: "Valve_CV" },
      { n: 8, plc: "Q0.0", device: "lamp", terminal: "X1", color: "#2f6fd6", title: "Q0.0 to auto lamp", caption: "Lit while the loop is in auto.", role: "auto", signal: "Run_Lamp" },
    ],
  },
  readInputs: (p, f) => {
    const noise = f.noisyLt ? (Math.random() - 0.5) * 8 : 0;
    const flow = Number(p.inflow) / (FLOW_GAIN * 1.5);
    return {
      Start_PB: Boolean(p.startPressed),
      Stop_PB: !p.stopPressed,
      Auto_Sel: Boolean(p.auto),
      Level_PV: Math.round(clamp(Number(p.measured) * 100 + noise, 0, 100) * 10) / 10,
      Flow_PV: f.ftFail ? 0 : Math.round(clamp(flow * 100, 0, 100) * 10) / 10,
      Level_SP: Number(p.sp),
      Hand_CV: Number(p.handCv),
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    const target = clamp(Number(m.Valve_CV ?? 0) / 100);
    let valve = Number(p.valve);
    const gap = target - valve;
    // A sticking valve ignores small changes, then jumps: the classic sawtooth on a trend.
    if (!(f.stiction && Math.abs(gap) < 0.06)) valve += Math.sign(gap) * Math.min(Math.abs(gap), STROKE_PER_S * dt);
    // Flow builds up behind the valve, and the transmitter is damped: the lags that make a loop
    // oscillate when it is tuned too hard.
    const inflow = Number(p.inflow) + (valve * Number(p.supply) * FLOW_GAIN - Number(p.inflow)) * Math.min(1, dt / FLOW_LAG_S);
    const out = Number(p.demand) * 0.014 * Math.sqrt(Math.max(0, Number(p.level)));
    const level = clamp(Number(p.level) + (inflow - out) * dt);
    const measured = Number(p.measured) + (level - Number(p.measured)) * Math.min(1, dt / LT_LAG_S);
    return { ...p, valve, inflow, level, measured };
  },
  live: (part, p, m) => {
    if (part === "tank") return { text: `${pct(Number(p.level) * 100)} · SP ${pct(Number(p.sp))}`, ring: m.Run_Lamp ? "run" : "idle" };
    if (part === "valve") return { text: `${pct(Number(p.valve) * 100)} open`, ring: Number(p.valve) > 0.01 ? "run" : null };
    if (part === "lt") return { text: `${Number(m.Level_PV ?? 0).toFixed(1)} %`, ring: null };
    if (part === "ft") return { text: `${Number(m.Flow_PV ?? 0).toFixed(1)} %`, ring: null };
    if (part === "demand") return { text: `demand ${pct(Number(p.demand) * 100)}`, ring: null };
    if (part === "supply") return { text: `${Number(p.supply).toFixed(1)} × normal`, ring: Number(p.supply) === 1 ? null : "warn" };
    if (part === "auto") return { text: p.auto ? "auto" : "hand", ring: p.auto ? "run" : "idle" };
    return none;
  },
};
