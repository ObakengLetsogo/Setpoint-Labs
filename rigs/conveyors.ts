import type { Memory } from "@/engine/scan";
import type { Annotation, Control, FaultDef, FieldDevice, LiveReadout, PhysicalState, PlcTerminal, RigDef, RigPart, RigTag, WireDef } from "./types";

/*
 * Belt conveyors. Items ride a belt along +X from the infeed at x = -4.6 to the discharge at x = 4.7.
 * Physical state is flat: slot n has i{n}x (position), i{n}on (present) and i{n}k (kind, or fill level for bottles).
 */

export const SLOTS = 6;
export const BELT = { from: -4.8, to: 4.8, y: 1.62, z: 0.6, width: 1.3 };
export const SENSORS = { entry: -4.25, exit: 3.7, metal: 0.1, divert: 1.0, filler: 0.6 };
const SPEED = 1.1; // units per second at full belt speed
const GAP = 0.95;

export type Variant = "conveyor" | "sorting" | "bottling";

/** Item kinds: 0 plain carton, 1 metal can, 2 tall carton. Bottles store their fill level in k. */
export const KIND = { plain: 0, metal: 1, tall: 2 };

const TERMINALS: PlcTerminal[] = [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  ...["I0.0", "I0.1", "I0.2", "I0.3", "I0.4", "I0.5", "I0.6", "I0.7"].map((id): PlcTerminal => ({ id, label: id, kind: "input" })),
  ...["Q0.0", "Q0.1", "Q0.2", "Q0.3", "Q0.4"].map((id): PlcTerminal => ({ id, label: id, kind: "output" })),
];

const items = (p: PhysicalState) =>
  Array.from({ length: SLOTS }, (_, n) => ({ n, x: Number(p[`i${n}x`] ?? 0), on: Boolean(p[`i${n}on`]), k: Number(p[`i${n}k`] ?? 0) })).filter((i) => i.on);

const near = (p: PhysicalState, x: number, r: number, pred: (k: number) => boolean = () => true) => items(p).some((i) => Math.abs(i.x - x) < r && pred(i.k));

function initial(): PhysicalState {
  const p: PhysicalState = {
    startPressed: false,
    stopPressed: false,
    estopPressed: false,
    feed: true,
    beltSpeed: 0,
    beltPos: 0,
    spawnT: 2.5,
    seq: 0,
    pusher: 0,
    stopper: 1,
    discharged: 0,
    sortedMetal: 0,
    missorted: 0,
    spilled: 0,
  };
  for (let n = 0; n < SLOTS; n++) Object.assign(p, { [`i${n}x`]: 0, [`i${n}on`]: false, [`i${n}k`]: 0 });
  return p;
}

// Repeating product mix so runs are the same every time.
const MIX = [KIND.plain, KIND.metal, KIND.tall, KIND.metal, KIND.plain, KIND.plain, KIND.metal, KIND.tall];

function step(variant: Variant) {
  return (ps: PhysicalState, f: Record<string, boolean>, m: Memory, dtMs: number): PhysicalState => {
    const dt = dtMs / 1000;
    const p: PhysicalState = { ...ps };
    const healthy = !p.estopPressed;
    const drive = healthy && Boolean(m.Belt_Run);
    const target = drive ? 1 : 0;
    p.beltSpeed = Number(p.beltSpeed) + (target - Number(p.beltSpeed)) * Math.min(1, dt / 0.35);
    const v = Number(p.beltSpeed) * SPEED;
    p.beltPos = (Number(p.beltPos) + v * dt) % 1000;

    // Pusher and stopper cylinders move towards their commands.
    p.pusher = Number(p.pusher) + ((m.Pusher_Out && healthy ? 1 : 0) - Number(p.pusher)) * Math.min(1, dt / 0.15);
    p.stopper = Number(p.stopper) + ((m.Stopper_Down ? 0 : 1) - Number(p.stopper)) * Math.min(1, dt / 0.12);

    // Move items front to back so each keeps its gap to the one ahead.
    const list = items(p).sort((a, b) => b.x - a.x);
    let ahead = Infinity;
    for (const it of list) {
      let x = it.x + v * dt;
      // A jammed discharge holds the first item that reaches the exit eye.
      if (f.jam && it.x <= SENSORS.exit && x > SENSORS.exit) x = SENSORS.exit;
      if (variant === "bottling" && Number(p.stopper) > 0.5 && it.x <= SENSORS.filler && x > SENSORS.filler) x = SENSORS.filler;
      x = Math.min(x, ahead - GAP);
      x = Math.max(x, it.x);
      p[`i${it.n}x`] = x;
      ahead = x;

      if (variant === "bottling" && Math.abs(x - SENSORS.filler) < 0.12 && m.Fill_Valve && healthy) {
        const k = Number(p[`i${it.n}k`]) + dt / 2.5;
        if (k > 1.05) p.spilled = Number(p.spilled) + dt;
        p[`i${it.n}k`] = Math.min(1.2, k);
      }
      if (variant === "sorting" && Number(p.pusher) > 0.6 && Math.abs(x - SENSORS.divert) < 0.45) {
        p[`i${it.n}on`] = false;
        if (Number(p[`i${it.n}k`]) === KIND.metal) p.sortedMetal = Number(p.sortedMetal) + 1;
        else p.missorted = Number(p.missorted) + 1;
      }
      if (x > BELT.to - 0.1) {
        p[`i${it.n}on`] = false;
        p.discharged = Number(p.discharged) + 1;
        if (variant === "sorting" && Number(p[`i${it.n}k`]) === KIND.metal) p.missorted = Number(p.missorted) + 1;
      }
    }

    // Infeed: a new item every 2.5 s while feeding, if there is room.
    p.spawnT = Number(p.spawnT) + dt;
    const entryClear = !items(p).some((i) => i.x < BELT.from + GAP + 0.35);
    if (p.feed && Number(p.spawnT) >= 2.5 && entryClear) {
      const free = Array.from({ length: SLOTS }, (_, n) => n).find((n) => !p[`i${n}on`]);
      if (free !== undefined) {
        const seq = Number(p.seq);
        p[`i${free}x`] = BELT.from + 0.3;
        p[`i${free}on`] = true;
        p[`i${free}k`] = variant === "bottling" ? 0 : variant === "sorting" ? MIX[seq % MIX.length] : KIND.plain;
        p.seq = seq + 1;
        p.spawnT = 0;
      }
    }
    return p;
  };
}

function readInputs(variant: Variant) {
  return (p: PhysicalState, f: Record<string, boolean>): Memory => {
    const base: Memory = {
      Start_PB: Boolean(p.startPressed),
      Stop_PB: f.brokenStop ? false : !p.stopPressed,
      EStop_OK: !p.estopPressed,
      PE_Entry: near(p, SENSORS.entry, 0.35),
      PE_Exit: near(p, SENSORS.exit, 0.35),
    };
    if (variant === "sorting") {
      base.Metal_Sensor = near(p, SENSORS.metal, 0.3, (k) => k === KIND.metal);
      base.PE_Divert = near(p, SENSORS.divert, 0.25);
      base.Pusher_Home = Number(p.pusher) < 0.1;
      base.Sorted = Number(p.sortedMetal);
    }
    if (variant === "bottling") {
      base.PE_Filler = near(p, SENSORS.filler, 0.15);
      base.Bottles = Number(p.discharged);
    }
    return base;
  };
}

const commonControls: Control[] = [
  { kind: "hold", part: "start", label: "Hold to press", key: "startPressed", tone: "#2e9e5b" },
  { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
  { kind: "toggle", part: "estop", label: "Mushroom head", key: "estopPressed", on: "Pressed", off: "Released", logOn: "safety · e-stop pressed", logOff: "safety · e-stop released" },
  { kind: "toggle", part: "infeed", label: "Product feed", key: "feed", on: "On", off: "Off" },
  { kind: "meter", part: "motor", label: "Belt speed", key: "beltSpeed", max: 1, scale: 100, unit: "%", tone: "#2457a6" },
];

const station = (extra: RigPart[]): RigPart[] => [
  { id: "start", name: "Start", kicker: "INPUT · I0.0", spec: "22 MM · GREEN · 1 NO", description: "Momentary start button.", anchor: [-4.4, 1.4, 3.2], explode: 1.4 },
  { id: "stop", name: "Stop", kicker: "INPUT · I0.1 · NC", spec: "22 MM · RED · 1 NC", description: "Normally closed: 1 at rest.", anchor: [-3.7, 1.4, 3.2], explode: 1.4 },
  { id: "estop", name: "E-stop", kicker: "SAFETY · I0.2", spec: "40 MM MUSHROOM", description: "Stops the belt through the safety relay.", anchor: [-2.7, 1.6, 3.1], explode: 1.4 },
  { id: "plc", name: "Controller", kicker: "CPU · 8 DI / 5 DQ", spec: "24 V DC · SCAN 100 MS", description: "Reads the sensors along the belt and drives the motor and actuators.", anchor: [-3.6, 1.6, -2.6], explode: 2.2 },
  { id: "motor", name: "Drive", kicker: "OUTPUT · Q0.0", spec: "0.37 KW GEARMOTOR", description: "Turns the head pulley at the discharge end.", anchor: [4.9, 1.9, -0.4], explode: 0.9 },
  { id: "infeed", name: "Infeed", kicker: "PRODUCT", spec: "ONE ITEM EVERY 2.5 S", description: "Places product on the belt while the feed is on. Turn it off to test what happens when the belt runs empty.", anchor: [-4.4, 2.3, 0.6], explode: 0.6 },
  { id: "peEntry", name: "Entry eye", kicker: "INPUT · I0.3", spec: "RETRO-REFLECTIVE · PNP", description: "A light beam across the belt. Reads 1 while product blocks it.", anchor: [SENSORS.entry, 2.3, -0.3], explode: 0.6 },
  { id: "peExit", name: "Exit eye", kicker: "INPUT · I0.4", spec: "RETRO-REFLECTIVE · PNP", description: "Sees product leave the belt. Blocked too long means a jam.", anchor: [SENSORS.exit, 2.3, -0.3], explode: 0.6 },
  ...extra,
];

const ann = (n: number, part: string, title: string, text: string, labs: string[], side: "left" | "right", icon: string): Annotation => ({ n, part, title, text, labs, more: 0, side, icon });

const baseWires = (n0 = 1): WireDef[] => [
  { n: n0, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the station and sensors", caption: "Supply for buttons and sensors.", role: "supply" },
  { n: n0 + 1, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Start to I0.0", caption: "Pressing Start puts 24 V on I0.0.", role: "start", signal: "Start_PB" },
  { n: n0 + 2, plc: "I0.1", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop NC to I0.1", caption: "Normally closed, 1 at rest.", role: "stop healthy", signal: "Stop_PB" },
  { n: n0 + 3, plc: "I0.2", device: "estop", terminal: "12", color: "#e0b326", title: "E-stop to I0.2", caption: "The PLC watches the safety circuit.", role: "e-stop healthy", signal: "EStop_OK" },
  { n: n0 + 4, plc: "I0.3", device: "peEntry", terminal: "BK", color: "#2f2f2f", title: "Entry eye output to I0.3", caption: "PNP sensor: switches 24 V onto I0.3 when the beam is blocked.", role: "entry", signal: "PE_Entry" },
  { n: n0 + 5, plc: "I0.4", device: "peExit", terminal: "BK", color: "#2f2f2f", title: "Exit eye output to I0.4", caption: "Blocked while product passes the discharge.", role: "exit", signal: "PE_Exit" },
  { n: n0 + 6, plc: "Q0.0", device: "drive", terminal: "A1", color: "#2f6fd6", title: "Q0.0 to the drive contactor", caption: "Runs the belt motor.", role: "belt run", signal: "Belt_Run" },
];

const baseDevices: FieldDevice[] = [
  { id: "start", name: "Start pushbutton S1", terminals: ["13", "14"], tone: "#22a061" },
  { id: "stop", name: "Stop pushbutton S2, NC", terminals: ["11", "12"], tone: "#d23c3c" },
  { id: "estop", name: "E-stop S0", terminals: ["11", "12"], tone: "#e0b326" },
  { id: "peEntry", name: "Entry eye B1", terminals: ["BN", "BK", "BU"], tone: "#3d434a" },
  { id: "peExit", name: "Exit eye B2", terminals: ["BN", "BK", "BU"], tone: "#3d434a" },
  { id: "drive", name: "Belt drive K1", terminals: ["A1", "A2"], tone: "#2457a6" },
];

const baseTags: RigTag[] = [
  { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Start pushbutton, NO" },
  { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Stop pushbutton, NC" },
  { tag: "EStop_OK", address: "I0.2", kind: "input", color: "#c9a227", connectsTo: "E-stop monitoring, NC" },
  { tag: "PE_Entry", address: "I0.3", kind: "input", color: "#3d434a", connectsTo: "Entry photo-eye, PNP" },
  { tag: "PE_Exit", address: "I0.4", kind: "input", color: "#3d434a", connectsTo: "Exit photo-eye, PNP" },
  { tag: "Belt_Run", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Belt drive contactor" },
  { tag: "Run_Lamp", address: "Q0.1", kind: "output", color: "#2e9e5b", connectsTo: "Green run lamp" },
];

function liveOf(variant: Variant) {
  return (part: string, p: PhysicalState, m: Memory, running: boolean): LiveReadout => {
    const r = readInputs(variant)(p, {});
    switch (part) {
      case "motor":
        return Number(p.beltSpeed) > 0.05 ? { text: `belt ${Math.round(Number(p.beltSpeed) * 100)} %`, ring: "run" } : { text: null, ring: null };
      case "peEntry":
        return r.PE_Entry ? { text: "blocked", ring: "run" } : { text: null, ring: null };
      case "peExit":
        return r.PE_Exit ? { text: "blocked", ring: "warn" } : { text: null, ring: null };
      case "infeed":
        return { text: p.feed ? `feeding · ${p.discharged} out` : "feed off", ring: p.feed ? "run" : "idle" };
      case "metal":
        return r.Metal_Sensor ? { text: "metal seen", ring: "run" } : { text: null, ring: null };
      case "pusher":
        return { text: `${p.sortedMetal} sorted · ${p.missorted} wrong`, ring: Number(p.missorted) > 0 ? "warn" : running && m.Pusher_Out ? "run" : null };
      case "filler":
        return m.Fill_Valve ? { text: "filling", ring: "run" } : Number(p.spilled) > 0 ? { text: "spilled", ring: "fault" } : { text: null, ring: null };
      default:
        return { text: null, ring: null };
    }
  };
}

const faults: FaultDef[] = [
  { key: "jam", label: "Product jams at the exit", part: "peExit" },
  { key: "brokenStop", label: "Stop wire broken", part: "stop" },
];

export const conveyor: RigDef = {
  id: "conveyor",
  name: "Conveyor",
  headline: ["Belt", "conveyor"],
  tagline: "Photo-eyes · Run-on · Jam detection",
  tags: [...baseTags, { tag: "Jam_Lamp", address: "Q0.2", kind: "output", color: "#d64545", connectsTo: "Red jam lamp" }],
  parts: station([]),
  annotations: [
    ann(1, "start", "Pushbuttons", "Start, a normally closed Stop and an E-stop at the operator end.", ["M4"], "left", "pushbuttons"),
    ann(2, "plc", "Controller", "Watches both eyes and decides when the belt runs and when it has jammed.", ["M4"], "left", "plc"),
    ann(3, "infeed", "Infeed", "Places a carton every 2.5 s. Turn it off to watch the run-on timer.", ["M4"], "left", "pushbuttons"),
    ann(4, "peEntry", "Entry eye", "Blocked while a carton passes. Starts the run-on timer again.", ["M4"], "right", "plc"),
    ann(5, "peExit", "Exit eye", "Blocked for more than 3 s means the discharge has jammed.", ["M4"], "right", "plc"),
    ann(6, "motor", "Drive", "A gearmotor on the head pulley pulls the belt.", ["M4"], "right", "motor"),
  ],
  initial: initial(),
  faults,
  controls: commonControls,
  wiring: {
    terminals: TERMINALS,
    devices: [...baseDevices, { id: "jamLamp", name: "Jam lamp H2", terminals: ["X1", "X2"], tone: "#d23c3c" }],
    wires: [...baseWires(), { n: 8, plc: "Q0.2", device: "jamLamp", terminal: "X1", color: "#2f6fd6", title: "Q0.2 to jam lamp", caption: "Lit while a jam is latched.", role: "jam", signal: "Jam_Lamp" }],
  },
  readInputs: readInputs("conveyor"),
  step: step("conveyor"),
  live: liveOf("conveyor"),
};

export const sorting: RigDef = {
  id: "sorting",
  name: "Sorting station",
  headline: ["Sort", "metal"],
  tagline: "Inductive sensor · Tracking · Pusher",
  tags: [
    ...baseTags,
    { tag: "Metal_Sensor", address: "I0.5", kind: "input", color: "#6b4fa0", connectsTo: "Inductive proximity sensor" },
    { tag: "PE_Divert", address: "I0.6", kind: "input", color: "#3d434a", connectsTo: "Photo-eye at the pusher" },
    { tag: "Pusher_Home", address: "I0.7", kind: "input", color: "#6b6f76", connectsTo: "Reed switch, pusher retracted" },
    { tag: "Pusher_Out", address: "Q0.2", kind: "output", color: "#f26b1d", connectsTo: "Pusher solenoid valve" },
    { tag: "Sorted", address: "IW66", kind: "input", color: "#6b4fa0", connectsTo: "Bin counter, for the lesson check", analog: true },
  ],
  parts: station([
    { id: "metal", name: "Metal sensor", kicker: "INPUT · I0.5", spec: "M18 INDUCTIVE · 8 MM", description: "Senses metal cans only. Cartons pass it unseen.", anchor: [SENSORS.metal, 2.0, -0.2], explode: 0.6 },
    { id: "pusher", name: "Pusher", kicker: "OUTPUT · Q0.2", spec: "PNEUMATIC · 100 MM STROKE", description: "Pushes a can off the belt into the bin. Reed switch I0.7 says it is home.", anchor: [SENSORS.divert, 2.2, -0.8], explode: 0.8 },
  ]),
  annotations: [
    ann(1, "start", "Pushbuttons", "Start, a normally closed Stop and an E-stop.", ["M5"], "left", "pushbuttons"),
    ann(2, "plc", "Controller", "Remembers which product is metal until it reaches the pusher.", ["M5"], "left", "plc"),
    ann(3, "metal", "Metal sensor", "Inductive: only metal cans switch it.", ["M5"], "left", "plc"),
    ann(4, "peExit", "Exit eye", "Counts what goes past to the end of the line.", ["M5"], "right", "plc"),
    ann(5, "pusher", "Pusher", "Kicks metal cans into the bin when they reach it.", ["M5"], "right", "contactor"),
    ann(6, "infeed", "Infeed", "Cartons and cans in a fixed mix, so every run is the same.", ["M5"], "right", "pushbuttons"),
  ],
  initial: initial(),
  faults,
  controls: [...commonControls, { kind: "status", part: "pusher", label: "Pusher", value: (p) => ({ text: Number(p.pusher) > 0.5 ? "Out" : "Home", on: Number(p.pusher) > 0.5 }) }],
  wiring: {
    terminals: TERMINALS,
    devices: [
      ...baseDevices,
      { id: "metal", name: "Inductive sensor B3", terminals: ["BN", "BK", "BU"], tone: "#6b4fa0" },
      { id: "peDivert", name: "Pusher eye B4", terminals: ["BN", "BK", "BU"], tone: "#3d434a" },
      { id: "reed", name: "Pusher home reed B5", terminals: ["BN", "BK"], tone: "#6b6f76" },
      { id: "valve", name: "Pusher valve Y1", terminals: ["1", "2"], tone: "#f26b1d" },
    ],
    wires: [
      ...baseWires(),
      { n: 8, plc: "I0.5", device: "metal", terminal: "BK", color: "#2f2f2f", title: "Inductive sensor to I0.5", caption: "1 while a metal can is under it.", role: "metal", signal: "Metal_Sensor" },
      { n: 9, plc: "I0.6", device: "peDivert", terminal: "BK", color: "#2f2f2f", title: "Pusher eye to I0.6", caption: "1 while any product is in front of the pusher.", role: "at pusher", signal: "PE_Divert" },
      { n: 10, plc: "I0.7", device: "reed", terminal: "BK", color: "#2f2f2f", title: "Reed switch to I0.7", caption: "1 while the pusher is fully home.", role: "pusher home", signal: "Pusher_Home" },
      { n: 11, plc: "Q0.2", device: "valve", terminal: "1", color: "#2f6fd6", title: "Q0.2 to pusher valve", caption: "Air to the cylinder pushes the can off.", role: "push", signal: "Pusher_Out" },
    ],
  },
  readInputs: readInputs("sorting"),
  step: step("sorting"),
  live: liveOf("sorting"),
};

export const bottling: RigDef = {
  id: "bottling",
  name: "Bottling line",
  headline: ["Fill", "count"],
  tagline: "Stopper · Timed fill · Counters",
  tags: [
    ...baseTags,
    { tag: "PE_Filler", address: "I0.5", kind: "input", color: "#3d434a", connectsTo: "Photo-eye under the filler" },
    { tag: "Stopper_Down", address: "Q0.2", kind: "output", color: "#f26b1d", connectsTo: "Stopper solenoid, lowers the gate" },
    { tag: "Fill_Valve", address: "Q0.3", kind: "output", color: "#3d8fd6", connectsTo: "Fill nozzle valve" },
    { tag: "Case_Full", address: "Q0.4", kind: "output", color: "#e0a526", connectsTo: "Amber beacon, case full" },
    { tag: "Bottles", address: "IW66", kind: "input", color: "#6b4fa0", connectsTo: "Line counter, for the lesson check", analog: true },
  ],
  parts: station([
    { id: "filler", name: "Filler", kicker: "OUTPUT · Q0.3", spec: "NOZZLE · 0.4 L/S", description: "Fills the bottle under it while the valve is open. Too long and it spills.", anchor: [SENSORS.filler, 3.4, 0.6], explode: 0.8 },
    { id: "stopper", name: "Stopper", kicker: "OUTPUT · Q0.2", spec: "PNEUMATIC GATE", description: "Holds a bottle under the nozzle. Q0.2 lowers it to let the bottle go.", anchor: [SENSORS.filler + 0.4, 2.1, -0.2], explode: 0.6 },
    { id: "beacon", name: "Case beacon", kicker: "OUTPUT · Q0.4", spec: "AMBER", description: "Lights when a case of six is full.", anchor: [4.2, 2.6, 2.6], explode: 0.6 },
  ]).map((p) => (p.id === "infeed" ? { ...p, spec: "ONE BOTTLE EVERY 2.5 S", description: "Places empty bottles on the belt while the feed is on." } : p)),
  annotations: [
    ann(1, "start", "Pushbuttons", "Start, a normally closed Stop and an E-stop.", ["M6"], "left", "pushbuttons"),
    ann(2, "plc", "Controller", "Holds each bottle, fills it for a set time, releases it and counts it.", ["M6"], "left", "plc"),
    ann(3, "infeed", "Infeed", "Empty bottles onto the belt every 2.5 s.", ["M6"], "left", "pushbuttons"),
    ann(4, "filler", "Filler", "A timed fill. Over time it overflows.", ["M6"], "right", "contactor"),
    ann(5, "stopper", "Stopper", "A gate that holds the bottle under the nozzle.", ["M6"], "right", "contactor"),
    ann(6, "beacon", "Case beacon", "Six bottles make a case. The counter lights it.", ["M6"], "right", "pushbuttons"),
  ],
  initial: initial(),
  faults: [{ key: "brokenStop", label: "Stop wire broken", part: "stop" }],
  controls: [
    ...commonControls,
    { kind: "status", part: "stopper", label: "Gate", value: (p) => ({ text: Number(p.stopper) > 0.5 ? "Up, holding" : "Down", on: Number(p.stopper) > 0.5 }) },
    { kind: "status", part: "filler", label: "Spilled", value: (p) => ({ text: Number(p.spilled) > 0 ? `${Number(p.spilled).toFixed(1)} s` : "none", on: false }) },
  ],
  wiring: {
    terminals: TERMINALS,
    devices: [
      ...baseDevices,
      { id: "peFiller", name: "Filler eye B3", terminals: ["BN", "BK", "BU"], tone: "#3d434a" },
      { id: "gate", name: "Stopper valve Y1", terminals: ["1", "2"], tone: "#f26b1d" },
      { id: "nozzle", name: "Fill valve Y2", terminals: ["1", "2"], tone: "#3d8fd6" },
      { id: "beacon", name: "Case beacon H3", terminals: ["X1", "X2"], tone: "#e0a526" },
    ],
    wires: [
      ...baseWires(),
      { n: 8, plc: "I0.5", device: "peFiller", terminal: "BK", color: "#2f2f2f", title: "Filler eye to I0.5", caption: "1 while a bottle stands under the nozzle.", role: "at filler", signal: "PE_Filler" },
      { n: 9, plc: "Q0.2", device: "gate", terminal: "1", color: "#2f6fd6", title: "Q0.2 to stopper valve", caption: "Lowers the gate to release the bottle.", role: "release", signal: "Stopper_Down" },
      { n: 10, plc: "Q0.3", device: "nozzle", terminal: "1", color: "#2f6fd6", title: "Q0.3 to fill valve", caption: "Opens the nozzle.", role: "fill", signal: "Fill_Valve" },
      { n: 11, plc: "Q0.4", device: "beacon", terminal: "X1", color: "#2f6fd6", title: "Q0.4 to case beacon", caption: "Lights when the case is full.", role: "case full", signal: "Case_Full" },
    ],
  },
  readInputs: readInputs("bottling"),
  step: step("bottling"),
  live: liveOf("bottling"),
};
