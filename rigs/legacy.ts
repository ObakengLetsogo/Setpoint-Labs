import { ann } from "./process";
import type { LiveReadout, PlcTerminal, RigDef } from "./types";

/*
 * A legacy upgrade bench. A conveyor drive is run by an old S5-era PLC whose program nobody has
 * documented. A new PLC is wired in parallel: it reads the same field inputs and can also read the
 * old PLC's outputs. A three position changeover decides who drives the motor: 0 the old PLC,
 * 1 the old PLC with the new one shadowing (its outputs compared, not connected), 2 the new PLC.
 *
 * The old program, as found on site:
 *   - Start runs the motor, with a seal-in; Stop (NC) and the guard stop it.
 *   - The run lamp lights after 3 s of running.
 *   - Undocumented: the motor will not start within 5 s of the guard closing.
 */

const none: LiveReadout = { text: null, ring: null };
const terminals: PlcTerminal[] = [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  ...Array.from({ length: 6 }, (_, i): PlcTerminal => ({ id: `I0.${i}`, label: `I0.${i}`, kind: "input" })),
  ...Array.from({ length: 2 }, (_, i): PlcTerminal => ({ id: `Q0.${i}`, label: `Q0.${i}`, kind: "output" })),
];
const LABS = ["e-upg-why", "e-upg-audit", "e-upg-map", "e-upg-plan", "e-upg-cutover"];

export const legacy: RigDef = {
  id: "legacy",
  name: "Legacy upgrade bench",
  headline: ["Legacy", "upgrade"],
  tagline: "Old PLC · New PLC · Shadow testing · Cutover",
  view: { target: [0, 1.4, 0], scale: 1.0 },
  tags: [
    { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Start, NO (old address I 32.0)" },
    { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Stop, NC (old address I 32.1)" },
    { tag: "Guard_OK", address: "I0.2", kind: "input", color: "#c9a227", connectsTo: "Guard switch, 1 when closed (old address I 32.2)" },
    { tag: "Old_Motor", address: "I0.3", kind: "input", color: "#6b6f76", connectsTo: "Old PLC's motor output, read back (Q 32.0)" },
    { tag: "Old_Lamp", address: "I0.4", kind: "input", color: "#6b6f76", connectsTo: "Old PLC's lamp output, read back (Q 32.1)" },
    { tag: "Old_Healthy", address: "I0.5", kind: "input", color: "#6b6f76", connectsTo: "Old PLC's run relay, 1 while its CPU runs" },
    { tag: "Cutover", address: "IW64", kind: "input", color: "#2457a6", connectsTo: "Changeover switch: 0 old, 1 shadow, 2 new", analog: true },
    { tag: "Mismatches", address: "TEST", kind: "input", color: "#d64545", connectsTo: "Shadow test set: times the new and old motor outputs disagreed", analog: true },
    { tag: "Motor_FB", address: "I0.6", kind: "input", color: "#2457a6", connectsTo: "Motor contactor auxiliary" },
    { tag: "Motor_Run", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "New PLC motor output (drives the motor only in position 2)" },
    { tag: "Run_Lamp", address: "Q0.1", kind: "output", color: "#2e9e5b", connectsTo: "New PLC run lamp" },
  ],
  parts: [
    { id: "start", name: "Start", kicker: "INPUT · I0.0 · WAS I 32.0", spec: "22 MM · GREEN", description: "Wired to both PLCs during the upgrade.", anchor: [-4.4, 1.4, 3.2], explode: 1.4 },
    { id: "stop", name: "Stop", kicker: "INPUT · I0.1 · WAS I 32.1", spec: "22 MM · RED · NC", description: "Wired to both PLCs.", anchor: [-3.7, 1.4, 3.2], explode: 1.4 },
    { id: "guard", name: "Guard", kicker: "INPUT · I0.2 · WAS I 32.2", spec: "INTERLOCK SWITCH", description: "Open it to stop the motor.", anchor: [-3.0, 1.4, 3.2], explode: 1.4 },
    { id: "old", name: "Old PLC", kicker: "S5 STYLE · 1990", spec: "NO SPARES · NO BACKUP FOUND", description: "Still running, with a program nobody has documented.", anchor: [-3.6, 2.4, -2.2], explode: 1.0 },
    { id: "new", name: "New PLC", kicker: "S7-1500 STYLE", spec: "PARALLEL WIRED", description: "Reads the same inputs and the old PLC's outputs.", anchor: [3.8, 1.6, -2.4], explode: 1.6 },
    { id: "cutover", name: "Changeover switch", kicker: "INPUT · IW64", spec: "0 OLD · 1 SHADOW · 2 NEW", description: "Decides which PLC drives the motor.", anchor: [0, 2.2, -2.2], explode: 0.8 },
    { id: "motor", name: "Conveyor motor", kicker: "M1 · 5.5 KW", spec: "DOL", description: "The machine being upgraded.", anchor: [1.6, 1.4, 1.2], explode: 0.6 },
  ],
  annotations: [
    ann(1, "old", "Old PLC", "Undocumented, unsupported, still running.", LABS, "left", "plc"),
    ann(2, "start", "Field inputs", "Wired to both PLCs during the upgrade.", LABS, "left", "pushbuttons"),
    ann(3, "guard", "Guard", "Hides a rule nobody wrote down.", ["e-upg-audit", "e-upg-map", "e-upg-plan"], "left", "terminals"),
    ann(4, "new", "New PLC", "Shadows the old one before it takes over.", ["e-upg-map", "e-upg-plan", "e-upg-cutover"], "right", "plc"),
    ann(5, "cutover", "Changeover", "Old, shadow, new.", ["e-upg-map", "e-upg-plan", "e-upg-cutover"], "right", "contactor"),
    ann(6, "motor", "Motor", "Driven by whichever PLC is in control.", LABS, "right", "motor"),
  ],
  initial: { startPressed: false, stopPressed: false, guardOpen: false, cutover: 0, speed: 0, oldMotor: false, oldLampT: 0, guardT: 0, mismatchT: 0, mismatches: 0, downtime: 0 },
  faults: [{ key: "oldFail", label: "Old PLC CPU fails", part: "old" }],
  controls: [
    { kind: "hold", part: "start", label: "Hold to press", key: "startPressed", tone: "#2e9e5b" },
    { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
    { kind: "toggle", part: "guard", label: "Guard", key: "guardOpen", on: "Open", off: "Closed", logOn: "guard opened", logOff: "guard closed" },
    { kind: "slider", part: "cutover", label: "Changeover: 0 old, 1 shadow, 2 new", key: "cutover", min: 0, max: 2, step: 1, unit: "" },
    { kind: "meter", part: "motor", label: "Speed", key: "speed", max: 1, scale: 100, unit: "%", tone: "#2457a6" },
  ],
  wiring: {
    terminals,
    devices: [
      { id: "start", name: "Start S1", terminals: ["13", "14"], tone: "#22a061" },
      { id: "stop", name: "Stop S2, NC", terminals: ["11", "12"], tone: "#d23c3c" },
      { id: "guard", name: "Guard B1", terminals: ["11", "12"], tone: "#c9a227" },
      { id: "old", name: "Old PLC outputs", terminals: ["Q32.0", "Q32.1", "RUN"], tone: "#6b6f76" },
      { id: "k1", name: "Motor contactor K1", terminals: ["A1", "13", "14"], tone: "#2457a6" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the inputs", caption: "Field inputs are paralleled to both PLCs.", role: "supply" },
      { n: 2, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Start to I0.0", caption: "Was I 32.0 on the old PLC.", role: "start", signal: "Start_PB" },
      { n: 3, plc: "I0.1", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop to I0.1", caption: "Was I 32.1.", role: "stop", signal: "Stop_PB" },
      { n: 4, plc: "I0.2", device: "guard", terminal: "12", color: "#c9a227", title: "Guard to I0.2", caption: "Was I 32.2.", role: "guard", signal: "Guard_OK" },
      { n: 5, plc: "I0.3", device: "old", terminal: "Q32.0", color: "#6b6f76", title: "Old motor output to I0.3", caption: "Read back for shadow testing.", role: "old motor", signal: "Old_Motor" },
      { n: 6, plc: "I0.5", device: "old", terminal: "RUN", color: "#6b6f76", title: "Old PLC run relay to I0.5", caption: "1 while the old CPU runs.", role: "old healthy", signal: "Old_Healthy" },
      { n: 7, plc: "Q0.0", device: "k1", terminal: "A1", color: "#2f6fd6", title: "Q0.0 to K1 via the changeover", caption: "Connected only in position 2.", role: "motor", signal: "Motor_Run" },
    ],
  },
  readInputs: (p, f) => {
    const healthy = !f.oldFail;
    return {
      Start_PB: Boolean(p.startPressed),
      Stop_PB: !p.stopPressed,
      Guard_OK: !p.guardOpen,
      Old_Motor: healthy && Boolean(p.oldMotor),
      Old_Lamp: healthy && Number(p.oldLampT) >= 3,
      Old_Healthy: healthy,
      Cutover: Number(p.cutover),
      Mismatches: Number(p.mismatches),
      Motor_FB: Number(p.speed) > 0.5,
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    const guardOK = !p.guardOpen;
    const guardT = guardOK ? Number(p.guardT) + dt : 0;
    // The old program, exactly as it behaves, quirks and all.
    let oldMotor = Boolean(p.oldMotor);
    if (f.oldFail) oldMotor = false;
    else {
      const startOK = Boolean(p.startPressed) && guardT > 5;
      oldMotor = (startOK || oldMotor) && !p.stopPressed && guardOK;
    }
    const oldLampT = oldMotor ? Number(p.oldLampT) + dt : 0;
    const cut = Number(p.cutover);
    const motorCmd = cut === 2 ? Boolean(m.Motor_Run) : oldMotor && !f.oldFail;
    const speed = Math.max(0, Math.min(1, Number(p.speed) + (motorCmd ? dt : -dt) * 1.5));
    // The shadow test set counts each time the new PLC's motor output disagrees with the old one for half a second.
    let mismatchT = Number(p.mismatchT);
    let mismatches = Number(p.mismatches);
    if (cut === 1 && !f.oldFail && Boolean(m.Motor_Run) !== oldMotor) {
      mismatchT += dt;
      if (mismatchT >= 0.5 && Number(p.mismatchT) < 0.5) mismatches += 1;
    } else mismatchT = 0;
    const downtime = Number(p.downtime) + (f.oldFail && cut !== 2 ? dt : 0);
    return { ...p, guardT, oldMotor, oldLampT, speed, mismatchT, mismatches, downtime };
  },
  events: (b, a) => (Number(a.mismatches) > Number(b.mismatches) ? [["shadow test · new and old outputs disagree", "fault"]] : []),
  live: (part, p, m) => {
    if (part === "old") return { text: p.oldMotor ? "motor on" : "motor off", ring: null };
    if (part === "cutover") return { text: ["0 · old in control", "1 · new shadowing", "2 · new in control"][Number(p.cutover)] ?? "", ring: Number(p.cutover) === 2 ? "run" : Number(p.cutover) === 1 ? "warn" : null };
    if (part === "new") return { text: `motor ${m.Motor_Run ? "on" : "off"} · ${p.mismatches} mismatches`, ring: Number(p.mismatches) > 0 ? "fault" : null };
    if (part === "motor") return Number(p.speed) > 0.05 ? { text: `${Math.round(Number(p.speed) * 100)} %`, ring: "run" } : none;
    if (part === "guard") return { text: p.guardOpen ? "open" : "closed", ring: p.guardOpen ? "warn" : null };
    return none;
  },
};
