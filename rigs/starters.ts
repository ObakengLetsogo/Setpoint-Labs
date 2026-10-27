import type { Memory } from "@/engine/scan";
import type { Control, FieldDevice, LiveReadout, PhysicalState, PlcTerminal, RigDef, RigTag, WireDef } from "./types";

/*
 * Two more motor starter benches built from the same parts:
 *   star-delta  K1 main, K2 star, K3 delta, for a soft start on a bigger motor
 *   reversing   KF forward, KR reverse, swapping two phases to change direction
 * Closing K2 and K3 together, or KF and KR together, shorts the supply and trips the breaker.
 */

const RATED_A = 14;

const TERMINALS: PlcTerminal[] = [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  ...["I0.0", "I0.1", "I0.2", "I0.3", "I0.4", "I0.5"].map((id): PlcTerminal => ({ id, label: id, kind: "input" })),
  ...["Q0.0", "Q0.1", "Q0.2", "Q0.3"].map((id): PlcTerminal => ({ id, label: id, kind: "output" })),
];

interface Common {
  stopPressed: boolean;
  estopPressed: boolean;
  overloadTripped: boolean;
  mcbTripped: boolean;
  motorSpeed: number;
  current: number;
  heat: number;
}

function heatStep(p: Common, current: number, dt: number) {
  const ratio = current / RATED_A;
  const heating = ratio > 1.15 ? (ratio - 1.15) * 0.09 : 0;
  const heat = Math.max(0, Math.min(1, p.heat + (heating - 0.05) * dt));
  return { heat, overloadTripped: p.overloadTripped || heat >= 1 };
}

const protection: Control[] = [
  { kind: "toggle", part: "estop", label: "Mushroom head", key: "estopPressed", on: "Pressed", off: "Released", logOn: "safety · e-stop pressed", logOff: "safety · e-stop released" },
  { kind: "meter", part: "overload", label: "Thermal load", key: "heat", max: 1, scale: 100, unit: "%", tone: "#f26b1d" },
  { kind: "action", part: "overload", label: "Trip", danger: true, patch: (p) => ({ ...p, overloadTripped: true, heat: 1 }), log: "fault · overload tripped by hand" },
  { kind: "action", part: "overload", label: "Reset", patch: (p) => ({ ...p, overloadTripped: false, heat: Math.min(Number(p.heat), 0.6) }), log: "overload reset" },
  { kind: "status", part: "mcb", label: "Breaker", value: (p) => ({ text: p.mcbTripped ? "Tripped" : "On", on: !p.mcbTripped }) },
  { kind: "action", part: "mcb", label: "Reset breaker", patch: (p) => ({ ...p, mcbTripped: false }), log: "breaker reset" },
  { kind: "meter", part: "motor", label: "Speed", key: "motorSpeed", max: 1, scale: 1460, unit: "rpm", tone: "#2457a6" },
  { kind: "meter", part: "motor", label: "Current", key: "current", max: 100, unit: "A", tone: "#6b4fa0" },
];

function motorLive(p: PhysicalState, unit = "rpm"): LiveReadout {
  const speed = Number(p.motorSpeed);
  const current = Number(p.current);
  if (Math.abs(speed) < 0.02) return { text: null, ring: null };
  return { text: `${Math.round(Math.abs(speed) * 1460)} ${unit}${speed < 0 ? " reverse" : ""} · ${current.toFixed(0)} A`, ring: current > RATED_A * 2 ? "warn" : "run" };
}

const shortEvent = (b: PhysicalState, a: PhysicalState): [string, "info" | "fault"][] => {
  const out: [string, "info" | "fault"][] = [];
  if (!b.mcbTripped && a.mcbTripped) out.push(["fault · phase to phase short, breaker tripped", "fault"]);
  if (!b.overloadTripped && a.overloadTripped) out.push(["fault · overload tripped on high current", "fault"]);
  return out;
};

/* ------------------------------------------------------------ star-delta */

const SD_TAGS: RigTag[] = [
  { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Start pushbutton, NO" },
  { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Stop pushbutton, NC" },
  { tag: "Overload_OK", address: "I0.2", kind: "input", color: "#f26b1d", connectsTo: "Overload 95-96, NC" },
  { tag: "EStop_OK", address: "I0.3", kind: "input", color: "#c9a227", connectsTo: "E-stop monitoring, NC" },
  { tag: "K2_Fb", address: "I0.4", kind: "input", color: "#6b6f76", connectsTo: "K2 star aux contact 13-14" },
  { tag: "Motor_Amps", address: "IW64", kind: "input", color: "#6b4fa0", connectsTo: "Current transducer, 1 A per count", analog: true },
  { tag: "K1_Main", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "K1 main contactor coil" },
  { tag: "K2_Star", address: "Q0.1", kind: "output", color: "#2457a6", connectsTo: "K2 star contactor coil" },
  { tag: "K3_Delta", address: "Q0.2", kind: "output", color: "#2457a6", connectsTo: "K3 delta contactor coil" },
  { tag: "Run_Lamp", address: "Q0.3", kind: "output", color: "#2e9e5b", connectsTo: "Green run lamp" },
];

interface SdPhys extends Common {
  startPressed: boolean;
  /** Real state of K2's contacts, including a weld, read back through its aux contact. */
  k2Closed: boolean;
}

function sdStep(ps: PhysicalState, f: Record<string, boolean>, m: Memory, dtMs: number): PhysicalState {
  const p = ps as unknown as SdPhys;
  const dt = dtMs / 1000;
  const healthy = !p.mcbTripped && !p.overloadTripped && !p.estopPressed;
  const k1 = healthy && Boolean(m.K1_Main);
  const k2 = healthy && (Boolean(m.K2_Star) || Boolean(f.k2Welded));
  const k3 = healthy && Boolean(m.K3_Delta);
  let mcbTripped = p.mcbTripped;
  if (k2 && k3) mcbTripped = true;
  const star = k1 && k2 && !k3;
  const delta = k1 && k3 && !k2;
  const load = f.jam ? 0.08 : 1;
  const target = delta ? 1 * load : star ? 0.9 * load : 0;
  const tau = star || delta ? 0.9 : 2.2;
  const motorSpeed = p.motorSpeed + (target - p.motorSpeed) * Math.min(1, dt / tau);
  const slip = 1 - motorSpeed;
  // Star puts a third of the line current through the motor while it accelerates.
  const current = delta ? RATED_A * (0.35 + 5.6 * slip * slip) : star ? RATED_A * (0.3 + 1.9 * slip * slip) : 0;
  return { ...p, mcbTripped, motorSpeed, current, k2Closed: k2, ...heatStep(p, current, dt) } as unknown as PhysicalState;
}

export const starDelta: RigDef = {
  id: "star-delta",
  name: "Star-delta starter",
  headline: ["Star", "delta"],
  tagline: "Soft start · Timer changeover · Interlocks",
  tags: SD_TAGS,
  parts: [
    { id: "start", name: "Start", kicker: "INPUT · I0.0", spec: "22 MM · GREEN · 1 NO", description: "Momentary start button.", anchor: [-4.3, 1.4, 3.0], explode: 1.4 },
    { id: "stop", name: "Stop", kicker: "INPUT · I0.1 · NC", spec: "22 MM · RED · 1 NC", description: "Wired normally closed: reads 1 at rest, 0 when pressed or when the wire breaks.", anchor: [-3.5, 1.4, 3.0], explode: 1.4 },
    { id: "estop", name: "E-stop", kicker: "SAFETY · HARDWIRED", spec: "40 MM MUSHROOM", description: "Breaks all three coil circuits through a safety relay.", anchor: [-2.4, 1.6, 2.9], explode: 1.4 },
    { id: "plc", name: "Controller", kicker: "CPU · 6 DI / 4 DQ", spec: "24 V DC · SCAN 100 MS", description: "Runs the start sequence: main and star together, then delta after the changeover time.", anchor: [-3.6, 1.6, -2.2], explode: 2.2 },
    { id: "mcb", name: "Breaker", kicker: "PROTECTION · 3 POLE", spec: "D CURVE · 32 A", description: "Trips instantly on a short circuit, such as star and delta closing together.", anchor: [-1.5, 1.6, -2.2], explode: 2.2 },
    { id: "k1", name: "K1 main", kicker: "OUTPUT · Q0.0", spec: "AC-3 32 A", description: "Feeds the start of each winding, U1 V1 W1. Closed for the whole run.", anchor: [0.0, 1.5, -2.2], explode: 2.2 },
    { id: "k2", name: "K2 star", kicker: "OUTPUT · Q0.1", spec: "AC-3 18 A", description: "Joins the ends of the windings, W2 U2 V2, into a star point for the start.", anchor: [1.3, 1.5, -2.2], explode: 2.2 },
    { id: "k3", name: "K3 delta", kicker: "OUTPUT · Q0.2", spec: "AC-3 32 A", description: "Connects each winding end to the next phase for full voltage running.", anchor: [2.6, 1.5, -2.2], explode: 2.2 },
    { id: "overload", name: "Overload", kicker: "INPUT · I0.2 · NC", spec: "THERMAL · 9 TO 14 A", description: "In the winding circuit, set to the phase current, about 58 % of the line current.", anchor: [0.0, 1.15, -0.9], explode: 1.4 },
    { id: "motor", name: "Motor", kicker: "LOAD · 7.5 KW", spec: "400 V DELTA · 14 A · 1460 RPM", description: "Six terminal motor. In star it starts on a third of the current and torque.", anchor: [3.3, 2.2, 2.15], explode: 0.9 },
  ],
  annotations: [
    { n: 1, part: "start", title: "Pushbuttons", text: "Start, and a Stop wired normally closed so a broken wire stops the motor.", labs: ["M1", "M2"], more: 0, side: "left", icon: "pushbuttons" },
    { n: 2, part: "plc", title: "Controller", text: "Times the changeover from star to delta, about 5 s for this motor.", labs: ["M1", "M2"], more: 0, side: "left", icon: "plc" },
    { n: 3, part: "mcb", title: "Breaker", text: "A star and delta closing together is a dead short. The breaker trips at once.", labs: ["M2"], more: 0, side: "left", icon: "breaker" },
    { n: 4, part: "k2", title: "Star contactor", text: "Makes the star point for the start. Must be open before delta closes.", labs: ["M1", "M2"], more: 0, side: "right", icon: "contactor" },
    { n: 5, part: "k3", title: "Delta contactor", text: "Full voltage across each winding for running. Interlocked against K2.", labs: ["M1", "M2"], more: 0, side: "right", icon: "contactor" },
    { n: 6, part: "motor", title: "Motor", text: "Starts in star on a third of the current, then runs in delta at full power.", labs: ["M1", "M2"], more: 0, side: "right", icon: "motor" },
  ],
  initial: { startPressed: false, stopPressed: false, estopPressed: false, overloadTripped: false, mcbTripped: false, motorSpeed: 0, current: 0, heat: 0, k2Closed: false },
  faults: [
    { key: "k2Welded", label: "K2 contacts welded", part: "k2" },
    { key: "brokenStop", label: "Stop wire broken", part: "stop" },
    { key: "jam", label: "Jam the shaft", part: "motor" },
  ],
  controls: [
    { kind: "hold", part: "start", label: "Hold to press", key: "startPressed", tone: "#2e9e5b" },
    { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
    ...protection,
    { kind: "status", part: "k1", label: "Main contacts", value: (_p, m, r) => ({ text: r && m.K1_Main ? "Closed" : "Open", on: Boolean(r && m.K1_Main) }) },
    { kind: "status", part: "k2", label: "Star contacts", value: (_p, m, r) => ({ text: r && m.K2_Star ? "Closed" : "Open", on: Boolean(r && m.K2_Star) }) },
    { kind: "status", part: "k3", label: "Delta contacts", value: (_p, m, r) => ({ text: r && m.K3_Delta ? "Closed" : "Open", on: Boolean(r && m.K3_Delta) }) },
  ],
  wiring: {
    terminals: TERMINALS,
    devices: [
      { id: "start", name: "Start pushbutton S1", terminals: ["13", "14"], tone: "#22a061" },
      { id: "stop", name: "Stop pushbutton S2, NC", terminals: ["11", "12"], tone: "#d23c3c" },
      { id: "overload", name: "Overload relay F2", terminals: ["95", "96"], tone: "#f26b1d" },
      { id: "estop", name: "E-stop S0", terminals: ["11", "12"], tone: "#e0b326" },
      { id: "k1", name: "K1 main coil", terminals: ["A1", "A2"], tone: "#2457a6" },
      { id: "k2", name: "K2 star coil", terminals: ["A1", "A2"], tone: "#2457a6" },
      { id: "k3", name: "K3 delta coil", terminals: ["A1", "A2"], tone: "#2457a6" },
      { id: "runLamp", name: "Run lamp H1", terminals: ["X1", "X2"], tone: "#22a061" },
    ] satisfies FieldDevice[],
    wires: [
      { n: 1, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the station common", caption: "Supply for every input.", role: "supply" },
      { n: 2, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Start to I0.0", caption: "Pressing Start puts 24 V on I0.0.", role: "start", signal: "Start_PB" },
      { n: 3, plc: "I0.1", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop NC to I0.1", caption: "Normally closed: I0.1 reads 1 until Stop is pressed or the wire breaks.", role: "stop healthy", signal: "Stop_PB" },
      { n: 4, plc: "I0.2", device: "overload", terminal: "96", color: "#f26b1d", title: "Overload 96 to I0.2", caption: "1 while healthy, 0 on a trip.", role: "overload healthy", signal: "Overload_OK" },
      { n: 5, plc: "I0.3", device: "estop", terminal: "12", color: "#e0b326", title: "E-stop NC to I0.3", caption: "The PLC watches the safety circuit.", role: "e-stop healthy", signal: "EStop_OK" },
      { n: 6, plc: "Q0.0", device: "k1", terminal: "A1", color: "#2f6fd6", title: "Q0.0 to K1 A1", caption: "Main contactor, closed for the whole run.", role: "main", signal: "K1_Main" },
      { n: 7, plc: "Q0.1", device: "k2", terminal: "A1", color: "#2f6fd6", title: "Q0.1 to K2 A1", caption: "Star contactor, through K3's NC aux contact as a hardware interlock.", role: "star", signal: "K2_Star" },
      { n: 8, plc: "Q0.2", device: "k3", terminal: "A1", color: "#2f6fd6", title: "Q0.2 to K3 A1", caption: "Delta contactor, through K2's NC aux contact.", role: "delta", signal: "K3_Delta" },
      { n: 9, plc: "Q0.3", device: "runLamp", terminal: "X1", color: "#2f6fd6", title: "Q0.3 to run lamp", caption: "Lit once the motor is running in delta.", role: "run lamp", signal: "Run_Lamp" },
      { n: 10, plc: "0V", device: "k1", terminal: "A2", color: "#1b2430", title: "Coils A2 to 0 V", caption: "Every coil returns to 0 V.", role: "coil return" },
    ] satisfies WireDef[],
  },
  readInputs: (ps, f, o) => {
    const p = ps as unknown as SdPhys;
    return {
      Start_PB: p.startPressed,
      // Stop is wired normally closed on this bench.
      Stop_PB: f.brokenStop ? false : o.stopNO ? p.stopPressed : !p.stopPressed,
      Overload_OK: !p.overloadTripped,
      EStop_OK: !p.estopPressed,
      K2_Fb: p.k2Closed,
      Motor_Amps: Math.round(p.current),
    };
  },
  step: sdStep,
  events: shortEvent,
  live: (part, p, m, running) => {
    if (part === "motor") return motorLive(p);
    if (part === "mcb") return p.mcbTripped ? { text: "tripped", ring: "fault" } : { text: null, ring: null };
    if (part === "k2") return running && m.K2_Star ? { text: "star · closed", ring: "run" } : { text: null, ring: null };
    if (part === "k3") return running && m.K3_Delta ? { text: "delta · closed", ring: "run" } : { text: null, ring: null };
    if (part === "start") return p.startPressed ? { text: "start pressed", ring: "run" } : { text: null, ring: null };
    return { text: null, ring: null };
  },
};


/* ------------------------------------------------------------- reversing */

const RV_TAGS: RigTag[] = [
  { tag: "Fwd_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Forward pushbutton, NO" },
  { tag: "Rev_PB", address: "I0.1", kind: "input", color: "#2457a6", connectsTo: "Reverse pushbutton, NO" },
  { tag: "Stop_PB", address: "I0.2", kind: "input", color: "#d64545", connectsTo: "Stop pushbutton, NC" },
  { tag: "Overload_OK", address: "I0.3", kind: "input", color: "#f26b1d", connectsTo: "Overload 95-96, NC" },
  { tag: "Zero_Speed", address: "I0.4", kind: "input", color: "#6b6f76", connectsTo: "Zero speed switch on the shaft" },
  { tag: "KF_Fwd", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "KF forward contactor coil" },
  { tag: "KR_Rev", address: "Q0.1", kind: "output", color: "#2457a6", connectsTo: "KR reverse contactor coil" },
  { tag: "Fwd_Lamp", address: "Q0.2", kind: "output", color: "#2e9e5b", connectsTo: "Green forward lamp" },
  { tag: "Rev_Lamp", address: "Q0.3", kind: "output", color: "#2457a6", connectsTo: "Blue reverse lamp" },
];

interface RvPhys extends Common {
  fwdPressed: boolean;
  revPressed: boolean;
}

function rvStep(ps: PhysicalState, f: Record<string, boolean>, m: Memory, dtMs: number): PhysicalState {
  const p = ps as unknown as RvPhys;
  const dt = dtMs / 1000;
  const healthy = !p.mcbTripped && !p.overloadTripped && !p.estopPressed;
  const fwd = healthy && Boolean(m.KF_Fwd);
  const rev = healthy && Boolean(m.KR_Rev);
  let mcbTripped = p.mcbTripped;
  if (fwd && rev) mcbTripped = true;
  const load = f.jam ? 0.08 : 1;
  const target = fwd && !rev ? load : rev && !fwd ? -load : 0;
  const tau = target !== 0 ? 0.8 : 2.0;
  const motorSpeed = p.motorSpeed + (target - p.motorSpeed) * Math.min(1, dt / tau);
  // Slip measured against the commanded direction: plugging a spinning motor draws even more than a start.
  const slip = target === 0 ? 0 : Math.abs(target - motorSpeed);
  const current = target === 0 ? 0 : RATED_A * (0.35 + 5.6 * Math.min(1.5, slip) ** 2);
  return { ...p, mcbTripped, motorSpeed, current, ...heatStep(p, current, dt) } as unknown as PhysicalState;
}

export const reversing: RigDef = {
  id: "reversing",
  name: "Reversing starter",
  headline: ["Forward", "reverse"],
  tagline: "Two contactors · Interlocks · Zero speed",
  tags: RV_TAGS,
  parts: [
    { id: "fwd", name: "Forward", kicker: "INPUT · I0.0", spec: "22 MM · GREEN · 1 NO", description: "Starts the motor forward.", anchor: [-4.3, 1.4, 3.0], explode: 1.4 },
    { id: "rev", name: "Reverse", kicker: "INPUT · I0.1", spec: "22 MM · BLUE · 1 NO", description: "Starts the motor in reverse.", anchor: [-3.6, 1.4, 3.0], explode: 1.4 },
    { id: "stop", name: "Stop", kicker: "INPUT · I0.2 · NC", spec: "22 MM · RED · 1 NC", description: "Normally closed stop.", anchor: [-2.9, 1.4, 3.0], explode: 1.4 },
    { id: "estop", name: "E-stop", kicker: "SAFETY · HARDWIRED", spec: "40 MM MUSHROOM", description: "Drops both contactors through the safety relay.", anchor: [-1.9, 1.6, 2.9], explode: 1.4 },
    { id: "plc", name: "Controller", kicker: "CPU · 6 DI / 4 DQ", spec: "24 V DC · SCAN 100 MS", description: "Keeps forward and reverse from ever being on together.", anchor: [-3.6, 1.6, -2.2], explode: 2.2 },
    { id: "mcb", name: "Breaker", kicker: "PROTECTION · 3 POLE", spec: "D CURVE · 32 A", description: "Trips on the dead short if both contactors close.", anchor: [-1.5, 1.6, -2.2], explode: 2.2 },
    { id: "kf", name: "KF forward", kicker: "OUTPUT · Q0.0", spec: "AC-3 18 A", description: "Connects L1 L2 L3 to U V W in order.", anchor: [0.3, 1.5, -2.2], explode: 2.2 },
    { id: "kr", name: "KR reverse", kicker: "OUTPUT · Q0.1", spec: "AC-3 18 A", description: "Swaps L1 and L3, so the field turns the other way.", anchor: [1.6, 1.5, -2.2], explode: 2.2 },
    { id: "overload", name: "Overload", kicker: "INPUT · I0.3 · NC", spec: "THERMAL · 9 TO 14 A", description: "Protects the motor in both directions.", anchor: [0.95, 1.15, -0.9], explode: 1.4 },
    { id: "motor", name: "Motor", kicker: "LOAD · 7.5 KW", spec: "400 V · 14 A · 1460 RPM", description: "Reversing a spinning motor, plugging, draws more current than starting it.", anchor: [3.3, 2.2, 2.15], explode: 0.9 },
  ],
  annotations: [
    { n: 1, part: "fwd", title: "Pushbuttons", text: "Forward, Reverse and a normally closed Stop.", labs: ["M3"], more: 0, side: "left", icon: "pushbuttons" },
    { n: 2, part: "plc", title: "Controller", text: "Interlocks the two directions in the program, and waits for zero speed.", labs: ["M3"], more: 0, side: "left", icon: "plc" },
    { n: 3, part: "mcb", title: "Breaker", text: "If both contactors close, two phases short. This trips at once.", labs: ["M3"], more: 0, side: "left", icon: "breaker" },
    { n: 4, part: "kf", title: "Forward contactor", text: "L1 L2 L3 straight through. Its NC aux sits in KR's coil circuit.", labs: ["M3"], more: 0, side: "right", icon: "contactor" },
    { n: 5, part: "kr", title: "Reverse contactor", text: "Swaps two phases. Mechanically and electrically interlocked with KF.", labs: ["M3"], more: 0, side: "right", icon: "contactor" },
    { n: 6, part: "motor", title: "Motor", text: "Turns the way the field turns. Watch the coupling change direction.", labs: ["M3"], more: 0, side: "right", icon: "motor" },
  ],
  initial: { fwdPressed: false, revPressed: false, stopPressed: false, estopPressed: false, overloadTripped: false, mcbTripped: false, motorSpeed: 0, current: 0, heat: 0 },
  faults: [
    { key: "brokenStop", label: "Stop wire broken", part: "stop" },
    { key: "jam", label: "Jam the shaft", part: "motor" },
  ],
  controls: [
    { kind: "hold", part: "fwd", label: "Hold to press", key: "fwdPressed", tone: "#2e9e5b" },
    { kind: "hold", part: "rev", label: "Hold to press", key: "revPressed", tone: "#2457a6" },
    { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
    ...protection,
    { kind: "status", part: "kf", label: "Forward contacts", value: (_p, m, r) => ({ text: r && m.KF_Fwd ? "Closed" : "Open", on: Boolean(r && m.KF_Fwd) }) },
    { kind: "status", part: "kr", label: "Reverse contacts", value: (_p, m, r) => ({ text: r && m.KR_Rev ? "Closed" : "Open", on: Boolean(r && m.KR_Rev) }) },
  ],
  wiring: {
    terminals: TERMINALS,
    devices: [
      { id: "fwd", name: "Forward pushbutton S1", terminals: ["13", "14"], tone: "#22a061" },
      { id: "rev", name: "Reverse pushbutton S2", terminals: ["13", "14"], tone: "#2457a6" },
      { id: "stop", name: "Stop pushbutton S0, NC", terminals: ["11", "12"], tone: "#d23c3c" },
      { id: "overload", name: "Overload relay F2", terminals: ["95", "96"], tone: "#f26b1d" },
      { id: "zero", name: "Zero speed switch B1", terminals: ["BN", "BK"], tone: "#6b6f76" },
      { id: "kf", name: "KF forward coil", terminals: ["A1", "A2"], tone: "#2457a6" },
      { id: "kr", name: "KR reverse coil", terminals: ["A1", "A2"], tone: "#2457a6" },
      { id: "fwdLamp", name: "Forward lamp H1", terminals: ["X1", "X2"], tone: "#22a061" },
      { id: "revLamp", name: "Reverse lamp H2", terminals: ["X1", "X2"], tone: "#2457a6" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "fwd", terminal: "13", color: "#c9372c", title: "+24 V to the station common", caption: "Supply for every input.", role: "supply" },
      { n: 2, plc: "I0.0", device: "fwd", terminal: "14", color: "#22a061", title: "Forward to I0.0", caption: "Pressing Forward puts 24 V on I0.0.", role: "forward", signal: "Fwd_PB" },
      { n: 3, plc: "I0.1", device: "rev", terminal: "14", color: "#2457a6", title: "Reverse to I0.1", caption: "Pressing Reverse puts 24 V on I0.1.", role: "reverse", signal: "Rev_PB" },
      { n: 4, plc: "I0.2", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop NC to I0.2", caption: "Normally closed: 1 until pressed or broken.", role: "stop healthy", signal: "Stop_PB" },
      { n: 5, plc: "I0.3", device: "overload", terminal: "96", color: "#f26b1d", title: "Overload 96 to I0.3", caption: "1 while healthy.", role: "overload healthy", signal: "Overload_OK" },
      { n: 6, plc: "I0.4", device: "zero", terminal: "BK", color: "#6b6f76", title: "Zero speed to I0.4", caption: "1 once the shaft has stopped turning.", role: "zero speed", signal: "Zero_Speed" },
      { n: 7, plc: "Q0.0", device: "kf", terminal: "A1", color: "#2f6fd6", title: "Q0.0 to KF A1", caption: "Through KR's NC aux contact, a hardware interlock.", role: "forward", signal: "KF_Fwd" },
      { n: 8, plc: "Q0.1", device: "kr", terminal: "A1", color: "#2f6fd6", title: "Q0.1 to KR A1", caption: "Through KF's NC aux contact.", role: "reverse", signal: "KR_Rev" },
      { n: 9, plc: "Q0.2", device: "fwdLamp", terminal: "X1", color: "#2f6fd6", title: "Q0.2 to forward lamp", caption: "Lit while running forward.", role: "forward lamp", signal: "Fwd_Lamp" },
      { n: 10, plc: "Q0.3", device: "revLamp", terminal: "X1", color: "#2f6fd6", title: "Q0.3 to reverse lamp", caption: "Lit while running in reverse.", role: "reverse lamp", signal: "Rev_Lamp" },
    ],
  },
  readInputs: (ps, f) => {
    const p = ps as unknown as RvPhys;
    return {
      Fwd_PB: p.fwdPressed,
      Rev_PB: p.revPressed,
      Stop_PB: f.brokenStop ? false : !p.stopPressed,
      Overload_OK: !p.overloadTripped,
      Zero_Speed: Math.abs(p.motorSpeed) < 0.03,
    };
  },
  step: rvStep,
  events: shortEvent,
  live: (part, p, m, running) => {
    if (part === "motor") return motorLive(p);
    if (part === "mcb") return p.mcbTripped ? { text: "tripped", ring: "fault" } : { text: null, ring: null };
    if (part === "kf") return running && m.KF_Fwd ? { text: "forward · closed", ring: "run" } : { text: null, ring: null };
    if (part === "kr") return running && m.KR_Rev ? { text: "reverse · closed", ring: "run" } : { text: null, ring: null };
    return { text: null, ring: null };
  },
};
