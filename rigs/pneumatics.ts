import type { Annotation, LiveReadout, PlcTerminal, RigDef } from "./types";

/*
 * A pick and place cell. Cylinder A, horizontal, pushes a part out of the magazine onto the
 * press station. Cylinder B, vertical, comes down and presses it. A is on a 5/2 single solenoid
 * valve with spring return; B is on a 5/2 double solenoid valve that stays where it was last
 * sent. Each cylinder has a reed switch at each end. Positions run 0 (home) to 1 (out).
 */

const terminals = (inputs: number, outputs: number): PlcTerminal[] => [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  ...Array.from({ length: inputs }, (_, i): PlcTerminal => ({ id: `I0.${i}`, label: `I0.${i}`, kind: "input" })),
  ...Array.from({ length: outputs }, (_, i): PlcTerminal => ({ id: `Q0.${i}`, label: `Q0.${i}`, kind: "output" })),
];
const ann = (n: number, part: string, title: string, text: string, labs: string[], side: "left" | "right", icon: string): Annotation => ({ n, part, title, text, labs, more: 0, side, icon });
const none: LiveReadout = { text: null, ring: null };

/** Full stroke times in seconds with 6 bar supply. */
export const STROKE = { a: 0.8, b: 0.6 };
const END = 0.97;
const HOME = 0.03;
const LABS = ["f-pneu-air", "f-pneu-seq", "p-ep-machine"];

export const pickPlace: RigDef = {
  id: "pickplace",
  name: "Pick and place cell",
  headline: ["Pick", "place"],
  tagline: "Cylinders · Reed switches · 5/2 valves",
  view: { target: [0.2, 1.4, 0.2], scale: 1.0 },
  tags: [
    { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Cycle start pushbutton, NO" },
    { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Stop pushbutton, NC" },
    { tag: "Air_OK", address: "I0.2", kind: "input", color: "#3d8fd6", connectsTo: "Pressure switch, 1 above 4 bar" },
    { tag: "Part_In", address: "I0.3", kind: "input", color: "#3d434a", connectsTo: "Magazine sensor, 1 while a part waits" },
    { tag: "A_Home", address: "I0.4", kind: "input", color: "#6b6f76", connectsTo: "Reed switch, cylinder A retracted" },
    { tag: "A_End", address: "I0.5", kind: "input", color: "#6b6f76", connectsTo: "Reed switch, cylinder A extended" },
    { tag: "B_Home", address: "I0.6", kind: "input", color: "#6b6f76", connectsTo: "Reed switch, cylinder B up" },
    { tag: "B_End", address: "I0.7", kind: "input", color: "#6b6f76", connectsTo: "Reed switch, cylinder B down" },
    { tag: "A_Extend", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Valve Y1, cylinder A out (spring return)" },
    { tag: "B_Extend", address: "Q0.1", kind: "output", color: "#2457a6", connectsTo: "Valve Y2, cylinder B down" },
    { tag: "B_Retract", address: "Q0.2", kind: "output", color: "#2457a6", connectsTo: "Valve Y3, cylinder B up" },
    { tag: "Run_Lamp", address: "Q0.3", kind: "output", color: "#2e9e5b", connectsTo: "Green cycle lamp" },
  ],
  parts: [
    { id: "start", name: "Cycle start", kicker: "INPUT · I0.0", spec: "22 MM · GREEN · 1 NO", description: "Starts a cycle.", anchor: [-4.2, 1.4, 3.0], explode: 1.4 },
    { id: "stop", name: "Stop", kicker: "INPUT · I0.1 · NC", spec: "22 MM · RED · 1 NC", description: "Normally closed: 1 at rest, 0 when pressed.", anchor: [-3.5, 1.4, 3.0], explode: 1.4 },
    { id: "frl", name: "Air service unit", kicker: "INPUT · I0.2", spec: "FILTER · REGULATOR · 6 BAR", description: "Cleans and regulates the compressed air. Its pressure switch tells the PLC the air is on.", anchor: [-4.2, 1.6, -1.6], explode: 0.8 },
    { id: "valves", name: "Valve manifold", kicker: "OUTPUTS · Q0.0 TO Q0.2", spec: "5/2 VALVES · 24 V DC COILS", description: "Y1 sends cylinder A out and a spring brings it back. Y2 and Y3 send cylinder B down and up, and it stays where it was sent.", anchor: [-2.2, 1.4, -1.8], explode: 0.8 },
    { id: "cylA", name: "Cylinder A", kicker: "INPUTS · I0.4 · I0.5", spec: "DOUBLE ACTING · 32 MM BORE · 200 MM", description: "Pushes a part from the magazine onto the press station.", anchor: [0, 1.2, 0.6], explode: 0.6 },
    { id: "cylB", name: "Cylinder B", kicker: "INPUTS · I0.6 · I0.7", spec: "DOUBLE ACTING · 25 MM BORE · 100 MM", description: "Comes down and presses the part.", anchor: [2.6, 3.4, 0.6], explode: 0.6 },
    { id: "magazine", name: "Magazine", kicker: "INPUT · I0.3", spec: "GRAVITY FEED · 10 PARTS", description: "Holds the parts. A sensor sees whether one is waiting.", anchor: [-1.4, 1.8, 0.6], explode: 0.6 },
    { id: "plc", name: "Controller", kicker: "CPU · 8 DI / 4 DQ", spec: "24 V DC · SCAN 100 MS", description: "Runs the sequence: push, press, lift, return.", anchor: [3.8, 1.6, -2.6], explode: 2.2 },
  ],
  annotations: [
    ann(1, "start", "Pushbuttons", "Cycle start and a normally closed Stop.", LABS, "left", "pushbuttons"),
    ann(2, "frl", "Air supply", "Filter, regulator and pressure switch. No air, no movement.", LABS, "left", "terminals"),
    ann(3, "valves", "Valves", "5/2 valves: single solenoid with spring return, and double solenoid that remembers.", LABS, "left", "contactor"),
    ann(4, "cylA", "Cylinder A", "Pushes the part. Reed switches at both ends.", LABS, "right", "motor"),
    ann(5, "cylB", "Cylinder B", "Presses the part. Reed switches at both ends.", LABS, "right", "motor"),
    ann(6, "plc", "Controller", "One step at a time, each step waiting for its sensor.", LABS, "right", "plc"),
  ],
  initial: { startPressed: false, stopPressed: false, air: true, a: 0, b: 0, bTarget: 0, parts: 10, cycles: 0, pressed: false },
  faults: [
    { key: "airLoss", label: "Air supply lost", part: "frl" },
    { key: "reedA", label: "A end switch out of position", part: "cylA" },
    { key: "stuckB", label: "Cylinder B sticking", part: "cylB" },
  ],
  controls: [
    { kind: "hold", part: "start", label: "Hold to press", key: "startPressed", tone: "#2e9e5b" },
    { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
    { kind: "toggle", part: "frl", label: "Air supply", key: "air", on: "On", off: "Off", logOn: "air on", logOff: "air off" },
    { kind: "meter", part: "cylA", label: "Stroke", key: "a", max: 1, scale: 100, unit: "%", tone: "#2457a6" },
    { kind: "meter", part: "cylB", label: "Stroke", key: "b", max: 1, scale: 100, unit: "%", tone: "#2457a6" },
    { kind: "action", part: "magazine", label: "Refill the magazine", patch: (p) => ({ ...p, parts: 10 }), log: "magazine refilled" },
  ],
  wiring: {
    terminals: terminals(8, 4),
    devices: [
      { id: "start", name: "Cycle start S1", terminals: ["13", "14"], tone: "#22a061" },
      { id: "stop", name: "Stop S2, NC", terminals: ["11", "12"], tone: "#d23c3c" },
      { id: "ps", name: "Pressure switch B1", terminals: ["1", "4"], tone: "#3d8fd6" },
      { id: "mag", name: "Magazine sensor B2", terminals: ["BN", "BK", "BU"], tone: "#3d434a" },
      { id: "reeds", name: "Reed switches B3 to B6", terminals: ["BN", "BK", "BU"], tone: "#6b6f76" },
      { id: "valves", name: "Valve coils Y1 to Y3", terminals: ["1", "2"], tone: "#2457a6" },
      { id: "lamp", name: "Cycle lamp H1", terminals: ["X1", "X2"], tone: "#22a061" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the inputs", caption: "Supply for the buttons and sensors.", role: "supply" },
      { n: 2, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Cycle start to I0.0", caption: "1 while pressed.", role: "start", signal: "Start_PB" },
      { n: 3, plc: "I0.1", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop NC to I0.1", caption: "1 at rest, 0 when pressed.", role: "stop healthy", signal: "Stop_PB" },
      { n: 4, plc: "I0.2", device: "ps", terminal: "4", color: "#3d8fd6", title: "Pressure switch to I0.2", caption: "1 while the air is above 4 bar.", role: "air on", signal: "Air_OK" },
      { n: 5, plc: "I0.3", device: "mag", terminal: "BK", color: "#2f2f2f", title: "Magazine sensor to I0.3", caption: "1 while a part waits.", role: "part waiting", signal: "Part_In" },
      { n: 6, plc: "I0.4", device: "reeds", terminal: "BK", color: "#2f2f2f", title: "Reed switches to I0.4 to I0.7", caption: "A home, A end, B home, B end.", role: "positions", signal: "A_Home" },
      { n: 7, plc: "Q0.0", device: "valves", terminal: "1", color: "#2f6fd6", title: "Q0.0 to Q0.2 to the valve coils", caption: "Y1 A out, Y2 B down, Y3 B up.", role: "valves", signal: "A_Extend" },
      { n: 8, plc: "Q0.3", device: "lamp", terminal: "X1", color: "#2f6fd6", title: "Q0.3 to the cycle lamp", caption: "Lit while a cycle runs.", role: "cycle", signal: "Run_Lamp" },
    ],
  },
  readInputs: (p, f) => {
    const a = Number(p.a);
    const b = Number(p.b);
    return {
      Start_PB: Boolean(p.startPressed),
      Stop_PB: !p.stopPressed,
      Air_OK: Boolean(p.air) && !f.airLoss,
      Part_In: Number(p.parts) > 0,
      A_Home: a < HOME,
      A_End: f.reedA ? false : a > END,
      B_Home: b < HOME,
      B_End: b > END,
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    const air = Boolean(p.air) && !f.airLoss;
    // A: single solenoid, spring return. B: double solenoid, remembers the last command.
    const aTarget = m.A_Extend ? 1 : 0;
    let bTarget = Number(p.bTarget);
    if (m.B_Extend && !m.B_Retract) bTarget = 1;
    if (m.B_Retract && !m.B_Extend) bTarget = 0;
    const move = (pos: number, target: number, stroke: number, slow = 1) => (air ? pos + Math.sign(target - pos) * Math.min(Math.abs(target - pos), (dt / stroke) * slow) : pos);
    const a = move(Number(p.a), aTarget, STROKE.a);
    const b = move(Number(p.b), bTarget, STROKE.b, f.stuckB ? 0.15 : 1);
    // A push that reaches the end takes a part out of the magazine; B pressing it finishes a cycle.
    let parts = Number(p.parts);
    let cycles = Number(p.cycles);
    let pressed = Boolean(p.pressed);
    if (Number(p.a) <= END && a > END && parts > 0) {
      parts -= 1;
      pressed = false;
    }
    if (!pressed && Number(p.b) <= END && b > END && a > END) {
      cycles += 1;
      pressed = true;
    }
    return { ...p, a, b, bTarget, parts, cycles, pressed };
  },
  events: (b, a) => {
    const out: [string, "info" | "fault"][] = [];
    if (Number(a.cycles) > Number(b.cycles)) out.push([`part pressed · ${a.cycles} done`, "info"]);
    if (Number(b.parts) > 0 && Number(a.parts) === 0) out.push(["magazine empty", "fault"]);
    return out;
  },
  live: (part, p, m) => {
    if (part === "cylA") return Number(p.a) > HOME ? { text: `${Math.round(Number(p.a) * 100)} % out`, ring: m.A_Extend ? "run" : "warn" } : none;
    if (part === "cylB") return Number(p.b) > HOME ? { text: `${Math.round(Number(p.b) * 100)} % down`, ring: "run" } : none;
    if (part === "magazine") return { text: `${p.parts} parts · ${p.cycles} done`, ring: Number(p.parts) > 0 ? "idle" : "fault" };
    if (part === "frl") return { text: p.air ? "6 bar" : "no air", ring: p.air ? "run" : "fault" };
    if (part === "valves") return m.A_Extend || m.B_Extend || m.B_Retract ? { text: [m.A_Extend && "Y1", m.B_Extend && "Y2", m.B_Retract && "Y3"].filter(Boolean).join(" "), ring: "run" } : none;
    return none;
  },
};
