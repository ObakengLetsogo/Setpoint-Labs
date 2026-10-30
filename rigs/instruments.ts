import { ann, terminals } from "./process";
import type { LiveReadout, PhysicalState, RigDef } from "./types";

/*
 * An instrument bench: four 4-20 mA transmitters wired to analogue inputs, a loop calibrator that
 * can stand in for the pressure transmitter, and a HART communicator for the smart pressure
 * transmitter. Inputs read raw counts the way an S7 card does: 4 mA is 0, 20 mA is 27648, and the
 * value carries on below and above, so a dead loop (0 mA) reads -6912.
 */

export const RAW_FULL = 27648;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const none: LiveReadout = { text: null, ring: null };
/** mA for a fraction of range, limited to what a transmitter can drive. */
const signal = (frac: number) => clamp(4 + 16 * frac, 3.8, 20.5);
const raw = (mA: number) => Math.round(((mA - 4) / 16) * RAW_FULL);

/** Loop current of each transmitter, with the bench faults applied. Exported for the 3D model. */
export function loops(p: PhysicalState, f: Record<string, boolean>) {
  const urv = Number(p.ptUrv);
  let pt = signal(Number(p.pressure) / urv);
  if (f.zeroErr && !p.zeroTrimmed) pt += 0.48;
  if (f.spanErr && !p.spanTrimmed) pt = 4 + (pt - 4) * 1.08;
  if (f.ptSensor) pt = 3.6; // NAMUR NE43: drive below 3.6 mA on a sensor fault
  if (p.calSource) pt = Number(p.calmA);
  const lt = signal(Number(p.level));
  const ft = f.ftOpen ? 0 : signal(Number(p.flow));
  const tt = f.rtdBreak ? 21.5 : signal(Number(p.temp) / 150); // upscale burnout on a broken RTD
  return { pt, lt, ft, tt };
}

const LABS = ["p-inst-tx", "p-inst-cal", "p-inst-hart"];

export const instruments: RigDef = {
  id: "instruments",
  name: "Instrument bench",
  headline: ["Instrument", "bench"],
  tagline: "4-20 mA transmitters · Calibrator · HART",
  view: { target: [0, 1.4, 0.4], scale: 0.82 },
  tags: [
    { tag: "PT_Raw", address: "IW64", kind: "input", color: "#6b4fa0", connectsTo: "Pressure transmitter PT1, 4-20 mA", analog: true },
    { tag: "LT_Raw", address: "IW66", kind: "input", color: "#6b4fa0", connectsTo: "Level transmitter LT1, 4-20 mA", analog: true },
    { tag: "FT_Raw", address: "IW68", kind: "input", color: "#6b4fa0", connectsTo: "Flow transmitter FT1, 4-20 mA", analog: true },
    { tag: "TT_Raw", address: "IW70", kind: "input", color: "#6b4fa0", connectsTo: "Temperature transmitter TT1 with PT100, 0 to 150 °C", analog: true },
    { tag: "PT_URV", address: "HART", kind: "input", color: "#0f766e", connectsTo: "PT1 upper range value from HART, in tenths of a bar", analog: true },
    { tag: "PT_Status", address: "HART", kind: "input", color: "#0f766e", connectsTo: "PT1 device status from HART: 0 healthy, 1 sensor fault", analog: true },
    { tag: "Fault_Lamp", address: "Q0.0", kind: "output", color: "#d64545", connectsTo: "Red instrument fault lamp" },
  ],
  parts: [
    { id: "pt", name: "Pressure transmitter", kicker: "ANALOG · IW64 · HART", spec: "0-10 BAR · 4-20 MA · SMART", description: "A smart transmitter: 4-20 mA for the value, with HART digital data on the same two wires.", anchor: [-3.2, 2.2, 0], explode: 0.8 },
    { id: "lt", name: "Level transmitter", kicker: "ANALOG · IW66", spec: "DP CELL · 0-100 %", description: "Measures level from the pressure of the water above it.", anchor: [-1.1, 2.2, 0], explode: 0.8 },
    { id: "ft", name: "Flow transmitter", kicker: "ANALOG · IW68", spec: "MAG FLOW · 0-100 %", description: "A magnetic flowmeter: no moving parts in the pipe.", anchor: [1.1, 2.2, 0], explode: 0.8 },
    { id: "tt", name: "Temperature transmitter", kicker: "ANALOG · IW70", spec: "PT100 · 0-150 °C", description: "A PT100 resistance sensor with a head mounted transmitter.", anchor: [3.2, 2.2, 0], explode: 0.8 },
    { id: "cal", name: "Loop calibrator", kicker: "TEST EQUIPMENT", spec: "SOURCE · MEASURE · 0-24 MA", description: "Measures loop current, or sources a known current in place of the transmitter.", anchor: [-2.6, 1.2, 2.6], explode: 0.6 },
    { id: "hart", name: "HART communicator", kicker: "TEST EQUIPMENT", spec: "HART 7", description: "Talks to the smart transmitter: tag, range, trim and diagnostics.", anchor: [-0.6, 1.2, 2.6], explode: 0.6 },
    { id: "plc", name: "Controller", kicker: "CPU · AI 4 · HART", spec: "24 V DC · LOOP POWER", description: "Powers the loops and reads them as raw counts.", anchor: [3.4, 1.4, -2.6], explode: 2.0 },
  ],
  annotations: [
    ann(1, "pt", "Pressure transmitter", "Smart, with HART. 0 to 10 bar as 4 to 20 mA.", LABS, "left", "plc"),
    ann(2, "lt", "Level transmitter", "A pressure cell measuring level.", ["p-inst-tx"], "left", "plc"),
    ann(3, "cal", "Loop calibrator", "Measure the loop, or source a test current.", ["p-inst-cal"], "left", "terminals"),
    ann(4, "ft", "Flow transmitter", "Disconnect it to see a dead loop.", ["p-inst-tx"], "right", "plc"),
    ann(5, "tt", "Temperature", "PT100 sensor. A broken wire drives it upscale.", ["p-inst-tx"], "right", "plc"),
    ann(6, "hart", "HART communicator", "Re-range and read diagnostics.", ["p-inst-hart"], "right", "terminals"),
  ],
  initial: { pressure: 4, level: 0.5, flow: 0.4, temp: 60, ptUrv: 10, calSource: false, calmA: 4, zeroTrimmed: false, spanTrimmed: false },
  faults: [
    { key: "zeroErr", label: "PT1 zero shifted", part: "pt" },
    { key: "spanErr", label: "PT1 span 8 % high", part: "pt" },
    { key: "ptSensor", label: "PT1 sensor failed", part: "pt" },
    { key: "ftOpen", label: "FT1 loop open", part: "ft" },
    { key: "rtdBreak", label: "TT1 RTD wire broken", part: "tt" },
  ],
  controls: [
    { kind: "slider", part: "pt", label: "Applied pressure", key: "pressure", min: 0, max: 16, step: 0.5, unit: "bar" },
    { kind: "slider", part: "lt", label: "Level", key: "level", min: 0, max: 1, step: 0.05, unit: "" },
    { kind: "slider", part: "ft", label: "Flow", key: "flow", min: 0, max: 1, step: 0.05, unit: "" },
    { kind: "slider", part: "tt", label: "Temperature", key: "temp", min: 0, max: 150, step: 5, unit: "°C" },
    { kind: "toggle", part: "cal", label: "Calibrator", key: "calSource", on: "Sourcing into PT1 loop", off: "Measuring", logOn: "calibrator · sourcing", logOff: "calibrator · measuring" },
    { kind: "slider", part: "cal", label: "Source current", key: "calmA", min: 0, max: 24, step: 0.5, unit: "mA" },
    { kind: "slider", part: "hart", label: "PT1 upper range", key: "ptUrv", min: 6, max: 16, step: 2, unit: "bar" },
    { kind: "action", part: "hart", label: "Zero trim PT1", patch: (p) => ({ ...p, zeroTrimmed: true }), log: "hart · PT1 zero trimmed" },
    { kind: "action", part: "hart", label: "Span trim PT1", patch: (p) => ({ ...p, spanTrimmed: true }), log: "hart · PT1 span trimmed" },
  ],
  wiring: {
    terminals: [...terminals(0, 1).filter((t) => t.kind !== "input"), ...["AI0", "AI1", "AI2", "AI3"].map((id) => ({ id, label: id, kind: "input" as const }))],
    devices: [
      { id: "pt", name: "PT1 pressure", terminals: ["+", "-"], tone: "#6b4fa0" },
      { id: "lt", name: "LT1 level", terminals: ["+", "-"], tone: "#6b4fa0" },
      { id: "ft", name: "FT1 flow", terminals: ["+", "-"], tone: "#6b4fa0" },
      { id: "tt", name: "TT1 temperature", terminals: ["+", "-"], tone: "#6b4fa0" },
      { id: "lamp", name: "Fault lamp H1", terminals: ["X1", "X2"], tone: "#d23c3c" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "pt", terminal: "+", color: "#c9372c", title: "+24 V loop supply to PT1 +", caption: "Two wire transmitters take their power from the loop.", role: "loop power" },
      { n: 2, plc: "AI0", device: "pt", terminal: "-", color: "#6b4fa0", title: "PT1 - to AI0", caption: "The loop current returns through the input.", role: "pressure", signal: "PT_Raw" },
      { n: 3, plc: "AI1", device: "lt", terminal: "-", color: "#6b4fa0", title: "LT1 - to AI1", caption: "4-20 mA level.", role: "level", signal: "LT_Raw" },
      { n: 4, plc: "AI2", device: "ft", terminal: "-", color: "#6b4fa0", title: "FT1 - to AI2", caption: "4-20 mA flow.", role: "flow", signal: "FT_Raw" },
      { n: 5, plc: "AI3", device: "tt", terminal: "-", color: "#6b4fa0", title: "TT1 - to AI3", caption: "4-20 mA temperature.", role: "temperature", signal: "TT_Raw" },
      { n: 6, plc: "Q0.0", device: "lamp", terminal: "X1", color: "#2f6fd6", title: "Q0.0 to fault lamp", caption: "Lit on any instrument fault.", role: "fault", signal: "Fault_Lamp" },
    ],
  },
  readInputs: (p, f) => {
    const l = loops(p, f);
    return {
      PT_Raw: raw(l.pt),
      LT_Raw: raw(l.lt),
      FT_Raw: raw(l.ft),
      TT_Raw: raw(l.tt),
      PT_URV: Math.round(Number(p.ptUrv) * 10),
      PT_Status: f.ptSensor ? 1 : 0,
    };
  },
  step: (p) => p,
  live: (part, p, m) => {
    void m;
    const l = loops(p, {});
    if (part === "pt") return { text: p.calSource ? `cal ${Number(p.calmA).toFixed(1)} mA` : `${Number(p.pressure).toFixed(1)} bar`, ring: null };
    if (part === "lt") return { text: `${l.lt.toFixed(2)} mA`, ring: null };
    if (part === "ft") return { text: `${l.ft.toFixed(2)} mA`, ring: null };
    if (part === "tt") return { text: `${Number(p.temp)} °C`, ring: null };
    if (part === "cal") return { text: p.calSource ? `source ${Number(p.calmA).toFixed(1)} mA` : "measure", ring: p.calSource ? "warn" : null };
    if (part === "hart") return { text: `range 0-${Number(p.ptUrv)} bar`, ring: null };
    return none;
  },
};
