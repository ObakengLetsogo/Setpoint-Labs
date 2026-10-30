import { ann } from "./process";
import type { LiveReadout, PlcTerminal, RigDef } from "./types";

/*
 * A motor control centre with two feeders and an incomer energy meter.
 * Feeder 1: a soft starter on a 15 kW pump (full load 30 A). Feeder 2: a direct on line starter
 * on a 7.5 kW conveyor motor (full load 15 A), protected by a motor protection relay with a thermal
 * model. The relay's trip contact is wired in the contactor coil circuit, so it stops the motor
 * whatever the PLC asks. Currents are in amps, power in tenths of a kW, energy in tenths of a kWh.
 */

export const MCC = { fla1: 30, fla2: 15, tau: 30, cool: 60, trip: 112, warn: 90, resetBelow: 50 };
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const none: LiveReadout = { text: null, ring: null };
const TRIP_TEXT = ["", "overload", "phase loss", "earth fault", "jam"];

const terminals: PlcTerminal[] = [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  ...Array.from({ length: 8 }, (_, i): PlcTerminal => ({ id: `I0.${i}`, label: `I0.${i}`, kind: "input" })),
  ...["I1.0", "I1.1", "I1.2"].map((id): PlcTerminal => ({ id, label: id, kind: "input" })),
  ...Array.from({ length: 6 }, (_, i): PlcTerminal => ({ id: `Q0.${i}`, label: `Q0.${i}`, kind: "output" })),
];


export const mcc: RigDef = {
  id: "mcc",
  name: "Motor control centre",
  headline: ["Motor", "control"],
  tagline: "Soft starter · Protection relay · Energy meter",
  view: { target: [0, 1.8, 0], scale: 1.1 },
  tags: [
    { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Start pushbutton, NO" },
    { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Stop pushbutton, NC" },
    { tag: "Reset_PB", address: "I0.2", kind: "input", color: "#3d434a", connectsTo: "Reset pushbutton, NO" },
    { tag: "SS_Ready", address: "I0.3", kind: "input", color: "#2457a6", connectsTo: "Soft starter relay: ready" },
    { tag: "SS_TOR", address: "I0.4", kind: "input", color: "#2457a6", connectsTo: "Soft starter relay: top of ramp, bypass closed" },
    { tag: "SS_Fault", address: "I0.5", kind: "input", color: "#d64545", connectsTo: "Soft starter relay: fault" },
    { tag: "F2_Remote", address: "I0.6", kind: "input", color: "#6b6f76", connectsTo: "Feeder 2 local / remote selector, 1 in remote" },
    { tag: "F2_Isol", address: "I0.7", kind: "input", color: "#6b6f76", connectsTo: "Feeder 2 isolator auxiliary, 1 when on" },
    { tag: "F2_Run_FB", address: "I1.0", kind: "input", color: "#2457a6", connectsTo: "Feeder 2 contactor auxiliary 13-14" },
    { tag: "MPR_Warn", address: "I1.1", kind: "input", color: "#e0a526", connectsTo: "Protection relay warning output" },
    { tag: "MPR_Trip", address: "I1.2", kind: "input", color: "#d64545", connectsTo: "Protection relay trip output" },
    { tag: "M1_Amps", address: "IW64", kind: "input", color: "#6b4fa0", connectsTo: "Pump current from the soft starter, A", analog: true },
    { tag: "M2_Amps", address: "MPR", kind: "input", color: "#6b4fa0", connectsTo: "Conveyor current from the relay, A", analog: true },
    { tag: "M2_Thermal", address: "MPR", kind: "input", color: "#6b4fa0", connectsTo: "Relay thermal capacity used, %", analog: true },
    { tag: "MPR_Code", address: "MPR", kind: "input", color: "#6b4fa0", connectsTo: "Trip cause: 1 overload, 2 phase loss, 3 earth fault, 4 jam", analog: true },
    { tag: "Total_kW", address: "Modbus", kind: "input", color: "#0f766e", connectsTo: "Incomer energy meter: power, tenths of a kW", analog: true },
    { tag: "Total_kWh", address: "Modbus", kind: "input", color: "#0f766e", connectsTo: "Incomer energy meter: energy, tenths of a kWh", analog: true },
    { tag: "PF_x100", address: "Modbus", kind: "input", color: "#0f766e", connectsTo: "Incomer energy meter: power factor × 100", analog: true },
    { tag: "SS_Run", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Soft starter run input" },
    { tag: "K2_Run", address: "Q0.1", kind: "output", color: "#2457a6", connectsTo: "Feeder 2 contactor coil, through the relay trip contact" },
    { tag: "MPR_Reset", address: "Q0.2", kind: "output", color: "#2457a6", connectsTo: "Remote reset to the soft starter and the protection relay" },
    { tag: "Run_Lamp", address: "Q0.3", kind: "output", color: "#2e9e5b", connectsTo: "Green run lamp" },
    { tag: "Fault_Lamp", address: "Q0.4", kind: "output", color: "#d64545", connectsTo: "Red fault lamp" },
    { tag: "Warn_Lamp", address: "Q0.5", kind: "output", color: "#e0a526", connectsTo: "Amber warning lamp" },
  ],
  parts: [
    { id: "start", name: "Start", kicker: "INPUT · I0.0", spec: "22 MM · GREEN · 1 NO", description: "Starts the lesson's motor.", anchor: [-4.4, 1.4, 3.2], explode: 1.4 },
    { id: "stop", name: "Stop", kicker: "INPUT · I0.1 · NC", spec: "22 MM · RED · 1 NC", description: "Normally closed: 1 at rest.", anchor: [-3.7, 1.4, 3.2], explode: 1.4 },
    { id: "reset", name: "Reset", kicker: "INPUT · I0.2", spec: "22 MM · BLUE · 1 NO", description: "Resets a trip once its cause has gone.", anchor: [-3.0, 1.4, 3.2], explode: 1.4 },
    { id: "ss", name: "Soft starter", kicker: "FEEDER 1 · PUMP 15 KW", spec: "RAMP · CURRENT LIMIT · BYPASS", description: "Ramps the motor voltage up to limit starting current, then closes an internal bypass contactor.", anchor: [-2.0, 3.6, -1.6], explode: 0.8 },
    { id: "mpr", name: "Protection relay", kicker: "FEEDER 2 · CONVEYOR 7.5 KW", spec: "THERMAL · PHASE · EARTH · JAM", description: "Measures the motor's current and models its heating. Its trip contact drops the contactor directly.", anchor: [0, 3.6, -1.6], explode: 0.8 },
    { id: "f2", name: "Feeder 2 bucket", kicker: "WITHDRAWABLE · DOL", spec: "ISOLATOR · CONTACTOR · LOCAL / REMOTE", description: "The isolator handle, the local / remote selector and the contactor of feeder 2.", anchor: [0, 2.2, -1.6], explode: 0.8 },
    { id: "meter", name: "Energy meter", kicker: "INCOMER · MODBUS", spec: "KW · KWH · PF", description: "Measures everything the MCC draws.", anchor: [2.0, 3.6, -1.6], explode: 0.8 },
    { id: "m1", name: "Pump motor", kicker: "M1 · 15 KW · 30 A", spec: "400 V · 4 POLE", description: "Driven by the soft starter.", anchor: [-2.6, 1.2, 1.4], explode: 0.6 },
    { id: "m2", name: "Conveyor motor", kicker: "M2 · 7.5 KW · 15 A", spec: "400 V · 4 POLE", description: "Started direct on line. Load it up from its popover.", anchor: [1.6, 1.2, 1.4], explode: 0.6 },
    { id: "plc", name: "Controller", kicker: "CPU · DI 11 / DQ 6", spec: "PROFINET · MODBUS TCP", description: "Commands the feeders and reads the relay and meter over the network.", anchor: [4.2, 1.4, -1.6], explode: 2.0 },
  ],
  annotations: [
    ann(1, "ss", "Soft starter", "Ramped start for the pump, then bypass.", ["p-soft-starter", "p-energy"], "left", "contactor"),
    ann(2, "f2", "Feeder 2", "Isolator, local / remote and contactor.", ["p-mpr", "p-mcc", "p-energy"], "left", "contactor"),
    ann(3, "m1", "Pump motor", "Its starting current shows on the soft starter.", ["p-soft-starter", "p-energy"], "left", "motor"),
    ann(4, "mpr", "Protection relay", "Thermal model, phase loss, earth fault and jam.", ["p-mpr", "p-mcc"], "right", "plc"),
    ann(5, "meter", "Energy meter", "kW, kWh and power factor for the whole MCC.", ["p-energy"], "right", "plc"),
    ann(6, "m2", "Conveyor motor", "Load it to heat the relay's thermal model.", ["p-mpr", "p-mcc", "p-energy"], "right", "motor"),
  ],
  initial: {
    startPressed: false, stopPressed: false, resetPressed: false,
    ssRamp: 1, ssInit: 80, ssLimit: 6, ssStop: 0, load1: 0.8,
    v1: 0, s1: 0, a1: 0, ssPhase: 0, ssStall: 0, ssFault: false,
    f2Remote: true, f2Isol: true, load2: 0.7, s2: 0, a2: 0, k2: false, th: 0, trip: 0, phaseT: 0, resetPrev: false,
    kwh: 0, kw: 0, pf: 0, peak1: 0,
  },
  faults: [
    { key: "contactorFail", label: "Feeder 2 contactor coil open", part: "f2" },
    { key: "phaseLoss", label: "Feeder 2 phase lost", part: "mpr" },
    { key: "earthFault", label: "M2 earth fault", part: "m2" },
    { key: "jam", label: "Conveyor jammed", part: "m2" },
  ],
  controls: [
    { kind: "hold", part: "start", label: "Hold to press", key: "startPressed", tone: "#2e9e5b" },
    { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
    { kind: "hold", part: "reset", label: "Hold to press", key: "resetPressed", tone: "#2457a6" },
    { kind: "slider", part: "ss", label: "Ramp time", key: "ssRamp", min: 1, max: 20, step: 1, unit: "s" },
    { kind: "slider", part: "ss", label: "Initial voltage", key: "ssInit", min: 20, max: 80, step: 5, unit: "%" },
    { kind: "slider", part: "ss", label: "Current limit", key: "ssLimit", min: 2, max: 6, step: 0.5, unit: "× FLA" },
    { kind: "slider", part: "ss", label: "Soft stop time", key: "ssStop", min: 0, max: 20, step: 1, unit: "s" },
    { kind: "meter", part: "ss", label: "Pump current", key: "a1", max: 200, unit: "A", tone: "#6b4fa0" },
    { kind: "slider", part: "m1", label: "Pump load", key: "load1", min: 0.1, max: 1, step: 0.1, unit: "" },
    { kind: "toggle", part: "f2", label: "Local / remote", key: "f2Remote", on: "Remote", off: "Local", logOn: "feeder 2 · remote", logOff: "feeder 2 · local" },
    { kind: "toggle", part: "f2", label: "Isolator", key: "f2Isol", on: "On", off: "Off", logOn: "feeder 2 · isolator on", logOff: "feeder 2 · isolator off" },
    { kind: "slider", part: "m2", label: "Conveyor load", key: "load2", min: 0.1, max: 1.5, step: 0.1, unit: "" },
    { kind: "meter", part: "mpr", label: "Thermal capacity", key: "th", max: 120, unit: "%", tone: "#e0a526" },
    { kind: "meter", part: "meter", label: "Power", key: "kw", max: 40, unit: "kW", tone: "#0f766e" },
  ],
  wiring: {
    terminals,
    devices: [
      { id: "start", name: "Start S1", terminals: ["13", "14"], tone: "#22a061" },
      { id: "stop", name: "Stop S2, NC", terminals: ["11", "12"], tone: "#d23c3c" },
      { id: "reset", name: "Reset S3", terminals: ["13", "14"], tone: "#2457a6" },
      { id: "ss", name: "Soft starter U1", terminals: ["IN1", "R1", "R2", "R3", "AO"], tone: "#2457a6" },
      { id: "f2", name: "Feeder 2: Q2, S4, K2", terminals: ["Q2.13", "S4.14", "K2.A1", "K2.14"], tone: "#2457a6" },
      { id: "mpr", name: "Protection relay F2", terminals: ["98", "96", "W", "RST"], tone: "#e0a526" },
      { id: "lamps", name: "Lamps H1 H2 H3", terminals: ["H1", "H2", "H3"], tone: "#22a061" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the inputs", caption: "Supply for buttons and auxiliary contacts.", role: "supply" },
      { n: 2, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Start to I0.0", caption: "1 while pressed.", role: "start", signal: "Start_PB" },
      { n: 3, plc: "I0.1", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop NC to I0.1", caption: "1 at rest.", role: "stop healthy", signal: "Stop_PB" },
      { n: 4, plc: "I0.2", device: "reset", terminal: "14", color: "#2457a6", title: "Reset to I0.2", caption: "1 while pressed.", role: "reset", signal: "Reset_PB" },
      { n: 5, plc: "I0.4", device: "ss", terminal: "R2", color: "#2457a6", title: "Soft starter top of ramp to I0.4", caption: "1 once the bypass has closed.", role: "top of ramp", signal: "SS_TOR" },
      { n: 6, plc: "I0.5", device: "ss", terminal: "R3", color: "#d23c3c", title: "Soft starter fault to I0.5", caption: "1 while tripped.", role: "fault", signal: "SS_Fault" },
      { n: 7, plc: "Q0.0", device: "ss", terminal: "IN1", color: "#2f6fd6", title: "Q0.0 to soft starter run", caption: "Start ramp on, soft stop off.", role: "run", signal: "SS_Run" },
      { n: 8, plc: "I0.6", device: "f2", terminal: "S4.14", color: "#6b6f76", title: "Local / remote to I0.6", caption: "1 in remote.", role: "remote", signal: "F2_Remote" },
      { n: 9, plc: "I0.7", device: "f2", terminal: "Q2.13", color: "#6b6f76", title: "Isolator auxiliary to I0.7", caption: "1 with the isolator on.", role: "isolator on", signal: "F2_Isol" },
      { n: 10, plc: "I1.0", device: "f2", terminal: "K2.14", color: "#2457a6", title: "Contactor auxiliary to I1.0", caption: "Proves the contactor has pulled in.", role: "running", signal: "F2_Run_FB" },
      { n: 11, plc: "Q0.1", device: "f2", terminal: "K2.A1", color: "#2f6fd6", title: "Q0.1 to K2 coil via relay 95-96", caption: "The relay's trip contact is in series: a trip drops K2 directly.", role: "run", signal: "K2_Run" },
      { n: 12, plc: "I1.1", device: "mpr", terminal: "W", color: "#e0a526", title: "Relay warning to I1.1", caption: "1 above 90 % thermal.", role: "warning", signal: "MPR_Warn" },
      { n: 13, plc: "I1.2", device: "mpr", terminal: "98", color: "#d23c3c", title: "Relay trip to I1.2", caption: "1 while tripped.", role: "trip", signal: "MPR_Trip" },
      { n: 14, plc: "Q0.2", device: "mpr", terminal: "RST", color: "#2f6fd6", title: "Q0.2 to relay remote reset", caption: "A pulse resets the relay once it is cool enough.", role: "reset", signal: "MPR_Reset" },
      { n: 15, plc: "Q0.3", device: "lamps", terminal: "H1", color: "#2f6fd6", title: "Q0.3 to Q0.5 to the lamps", caption: "Run, fault and warning.", role: "lamps", signal: "Run_Lamp" },
    ],
  },
  readInputs: (p) => ({
    Start_PB: Boolean(p.startPressed),
    Stop_PB: !p.stopPressed,
    Reset_PB: Boolean(p.resetPressed),
    SS_Ready: !p.ssFault,
    SS_TOR: Number(p.ssPhase) === 2,
    SS_Fault: Boolean(p.ssFault),
    F2_Remote: Boolean(p.f2Remote),
    F2_Isol: Boolean(p.f2Isol),
    F2_Run_FB: Boolean(p.k2),
    MPR_Warn: Number(p.th) >= MCC.warn,
    MPR_Trip: Number(p.trip) > 0,
    M1_Amps: Math.round(Number(p.a1)),
    M2_Amps: Math.round(Number(p.a2)),
    M2_Thermal: Math.round(Number(p.th)),
    MPR_Code: Number(p.trip),
    Total_kW: Math.round(Number(p.kw) * 10),
    Total_kWh: Math.floor(Number(p.kwh) * 10),
    PF_x100: Math.round(Number(p.pf) * 100),
  }),
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    /* ---- feeder 1: soft starter */
    let { v1, s1, ssPhase, ssStall, ssFault } = { v1: Number(p.v1), s1: Number(p.s1), ssPhase: Number(p.ssPhase), ssStall: Number(p.ssStall), ssFault: Boolean(p.ssFault) };
    const run1 = Boolean(m.SS_Run) && !ssFault;
    const limit = Number(p.ssLimit) * MCC.fla1;
    const lr = (v: number, s: number) => v * 6 * MCC.fla1 * (1 - s) + MCC.fla1 * (0.3 + 0.7 * Number(p.load1)) * s * v;
    if (run1 && ssPhase !== 2) {
      if (ssPhase !== 1) {
        ssPhase = 1;
        v1 = Math.max(v1, Number(p.ssInit) / 100);
      }
      const next = Math.min(1, v1 + ((1 - Number(p.ssInit) / 100) / Number(p.ssRamp)) * dt);
      // Hold the voltage while the current is at the limit.
      v1 = lr(next, s1) <= limit ? next : Math.max(v1, Math.min(next, limit / Math.max(1, lr(1, s1))));
      ssStall = s1 < 0.9 ? ssStall + dt : 0;
      if (v1 >= 1 && s1 > 0.9) ssPhase = 2;
      if (ssStall > 30) ssFault = true;
    } else if (!run1) {
      ssStall = 0;
      const stopS = Number(p.ssStop);
      v1 = ssFault || stopS === 0 ? 0 : Math.max(0, v1 - dt / stopS);
      ssPhase = v1 > 0 ? 3 : 0;
    }
    const torque = v1 * v1 - 0.2 * Number(p.load1) - 0.05;
    s1 = clamp(s1 + (torque > 0 ? torque * 0.9 * (1 - s1) : -0.25 * s1) * dt);
    if (v1 === 0) s1 = Math.max(0, s1 - 0.3 * dt);
    const a1 = v1 > 0 ? lr(v1, s1) : 0;
    if (m.MPR_Reset && ssFault) ssFault = false;

    /* ---- feeder 2: DOL with protection relay */
    let th = Number(p.th);
    let trip = Number(p.trip);
    let phaseT = Number(p.phaseT);
    const k2 = Boolean(m.K2_Run) && Boolean(p.f2Isol) && trip === 0 && !f.contactorFail;
    let s2 = Number(p.s2);
    s2 = k2 ? (f.jam ? Math.max(0, s2 - dt) : Math.min(1, s2 + dt * 1.5)) : Math.max(0, s2 - dt * 0.6);
    let a2 = 0;
    if (k2) {
      a2 = s2 < 0.95 && !f.jam ? 6 * MCC.fla2 * (1 - s2) + MCC.fla2 * 0.4 : MCC.fla2 * (0.35 + 0.65 * Number(p.load2));
      if (f.jam) a2 = 6 * MCC.fla2;
      if (f.phaseLoss) a2 *= 1.7;
    }
    const ratio = a2 / MCC.fla2;
    th = a2 > 0 ? th + ((ratio * ratio * 100 - th) / MCC.tau) * dt : Math.max(0, th - (th / MCC.cool) * dt);
    if (trip === 0 && k2) {
      if (f.earthFault) trip = 3;
      else if (f.jam && s2 < 0.2 && a2 > 4 * MCC.fla2) trip = 4;
      else if (f.phaseLoss && (phaseT += dt) > 2) trip = 2;
      else if (th >= MCC.trip) trip = 1;
    }
    if (!f.phaseLoss) phaseT = 0;
    const resetNow = Boolean(m.MPR_Reset) && !p.resetPrev;
    if (resetNow && trip > 0 && th < MCC.resetBelow && !(trip === 3 && f.earthFault)) trip = 0;

    /* ---- incomer meter */
    const kw1 = a1 > 0 ? (0.4 * 1.732 * a1 * (0.25 + 0.6 * Number(p.load1) * s1)) : 0;
    const kw2 = a2 > 0 ? (0.4 * 1.732 * a2 * (0.25 + 0.55 * Math.min(1, Number(p.load2)) * s2)) : 0;
    const kw = kw1 + kw2;
    const kva = 0.4 * 1.732 * (a1 + a2);
    const pf = kva > 0 ? kw / kva : 0;
    const kwh = Number(p.kwh) + (kw * dt) / 3600;
    return { ...p, v1, s1, a1, ssPhase, ssStall, ssFault, k2, s2, a2, th, trip, phaseT, resetPrev: Boolean(m.MPR_Reset), kw, pf, kwh, peak1: Math.max(Number(p.peak1), a1) };
  },
  events: (b, a) => {
    const out: [string, "info" | "fault"][] = [];
    if (Number(b.trip) === 0 && Number(a.trip) > 0) out.push([`fault · relay tripped, ${TRIP_TEXT[Number(a.trip)]}`, "fault"]);
    if (Number(b.trip) > 0 && Number(a.trip) === 0) out.push(["relay reset", "info"]);
    if (!b.ssFault && a.ssFault) out.push(["fault · soft starter, start time exceeded", "fault"]);
    if (Number(b.ssPhase) !== 2 && Number(a.ssPhase) === 2) out.push(["soft starter · top of ramp, bypass closed", "info"]);
    return out;
  },
  live: (part, p) => {
    if (part === "ss") return Number(p.v1) > 0 ? { text: `${Math.round(Number(p.a1))} A · ${Math.round(Number(p.v1) * 100)} % V`, ring: p.ssFault ? "fault" : Number(p.ssPhase) === 2 ? "run" : "warn" } : p.ssFault ? { text: "fault", ring: "fault" } : { text: "ready", ring: null };
    if (part === "mpr") return Number(p.trip) > 0 ? { text: `trip · ${TRIP_TEXT[Number(p.trip)]}`, ring: "fault" } : { text: `${Math.round(Number(p.th))} % thermal`, ring: Number(p.th) >= MCC.warn ? "warn" : null };
    if (part === "f2") return { text: `${p.f2Remote ? "remote" : "local"} · ${p.f2Isol ? "on" : "isolated"}`, ring: p.k2 ? "run" : null };
    if (part === "meter") return { text: `${Number(p.kw).toFixed(1)} kW · PF ${Number(p.pf).toFixed(2)}`, ring: null };
    if (part === "m1") return Number(p.s1) > 0.02 ? { text: `${Math.round(Number(p.s1) * 1480)} rpm`, ring: "run" } : none;
    if (part === "m2") return Number(p.s2) > 0.02 ? { text: `${Math.round(Number(p.s2) * 1460)} rpm · ${Math.round(Number(p.a2))} A`, ring: "run" } : none;
    return none;
  },
};
