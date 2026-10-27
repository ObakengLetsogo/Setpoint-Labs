import type { Memory } from "@/engine/scan";

export type Vec3 = [number, number, number];

export interface RigTag {
  tag: string;
  address: string;
  kind: "input" | "output" | "marker";
  color: string;
  connectsTo: string;
}

export interface RigPart {
  id: PartId;
  name: string;
  kicker: string;
  spec: string;
  description: string;
  anchor: Vec3;
  explode: number;
}

export type PartId =
  | "start"
  | "stop"
  | "estop"
  | "plc"
  | "io"
  | "mcb"
  | "contactor"
  | "overload"
  | "motor"
  | "terminals"
  | "aux"
  | "beacon";

export const TAGS: RigTag[] = [
  { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Start pushbutton, NO" },
  { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Stop pushbutton, NO" },
  { tag: "Overload_OK", address: "I0.2", kind: "input", color: "#f26b1d", connectsTo: "Overload aux contact 95-96, NC" },
  { tag: "EStop_OK", address: "I0.3", kind: "input", color: "#c9a227", connectsTo: "E-stop monitoring contact, NC" },
  { tag: "Aux_PB", address: "I0.4", kind: "input", color: "#3d434a", connectsTo: "Black AUX pushbutton, NO" },
  { tag: "Motor_Amps", address: "IW64", kind: "input", color: "#6b4fa0", connectsTo: "Current transducer, 0.1 A per count" },
  { tag: "Motor_Run", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Contactor coil A1-A2" },
  { tag: "Run_Lamp", address: "Q0.1", kind: "output", color: "#2e9e5b", connectsTo: "Green pilot lamp" },
  { tag: "Fault_Lamp", address: "Q0.2", kind: "output", color: "#d64545", connectsTo: "Red pilot lamp" },
  { tag: "Beacon", address: "Q0.3", kind: "output", color: "#e0a526", connectsTo: "Amber beacon and sounder" },
  { tag: "Run_Seal", address: "M0.0", kind: "marker", color: "#6b6f76", connectsTo: "Internal memory bit" },
];

export const tagAddress = (tag: string) => TAGS.find((t) => t.tag === tag)?.address;

export const PARTS: RigPart[] = [
  {
    id: "start",
    name: "Start",
    kicker: "INPUT · I0.0",
    spec: "22 MM · GREEN · 1 NO",
    description: "Momentary pushbutton. Closed only while you hold it, so the logic has to remember the start.",
    anchor: [-4.3, 1.4, 3.25],
    explode: 1.4,
  },
  {
    id: "stop",
    name: "Stop",
    kicker: "INPUT · I0.1",
    spec: "22 MM · RED · 1 NO",
    description: "Momentary pushbutton. In this rig it is wired normally open, so a broken wire means Stop can never be seen.",
    anchor: [-3.4, 1.4, 3.25],
    explode: 1.4,
  },
  {
    id: "estop",
    name: "E-stop",
    kicker: "SAFETY · HARDWIRED",
    spec: "40 MM MUSHROOM · TWIST TO RELEASE",
    description: "Latches when pressed and breaks the contactor coil circuit directly. The PLC only monitors it, it does not rely on it.",
    anchor: [-2.25, 1.6, 3.1],
    explode: 1.4,
  },
  {
    id: "plc",
    name: "Controller",
    kicker: "CPU · 8 DI / 6 DQ",
    spec: "24 V DC · SCAN 100 MS",
    description: "Reads every input, runs the program top to bottom, then writes the outputs. One full pass is a scan.",
    anchor: [-3.0, 1.6, -2.2],
    explode: 2.2,
  },
  {
    id: "io",
    name: "Signal board",
    kicker: "STATUS LEDS",
    spec: "I0.0 TO I0.3 · Q0.0 TO Q0.2",
    description: "Each LED shows the live state of one input or output, the first place to look when fault finding.",
    anchor: [-1.4, 1.6, -2.2],
    explode: 2.2,
  },
  {
    id: "mcb",
    name: "Breaker",
    kicker: "PROTECTION · 3 POLE",
    spec: "C CURVE · 10 A",
    description: "Protects the motor cables against short circuits. It does not protect the motor from slow overheating.",
    anchor: [-4.6, 1.6, -2.2],
    explode: 2.2,
  },
  {
    id: "contactor",
    name: "Contactor",
    kicker: "OUTPUT · Q0.0",
    spec: "3 POLE · AC-3 9 A · 24 V DC COIL",
    description: "A heavy duty relay. When Q0.0 energises its coil, the main contacts close and the motor gets power.",
    anchor: [0.4, 1.5, -2.2],
    explode: 2.2,
  },
  {
    id: "overload",
    name: "Overload",
    kicker: "INPUT · I0.2 · NC",
    spec: "THERMAL · 2.5 TO 4 A · CLASS 10",
    description: "Heats up with motor current. If the motor works too hard for too long it trips and opens 95-96.",
    anchor: [0.4, 1.15, -0.89],
    explode: 1.4,
  },
  {
    id: "motor",
    name: "Motor",
    kicker: "LOAD · 3 PHASE",
    spec: "1.1 KW · 1420 RPM · 2.6 A",
    description: "A squirrel cage induction motor with a cooling fan. It draws a large current for a moment as it starts.",
    anchor: [3.9, 2.2, 1.0],
    explode: 0.9,
  },
  {
    id: "aux",
    name: "AUX button",
    kicker: "INPUT · I0.4",
    spec: "22 MM · BLACK · 1 NO",
    description: "A spare momentary button. Lessons use it as jog, reset or alarm acknowledge.",
    anchor: [-3.1, 1.35, 2.52],
    explode: 1.4,
  },
  {
    id: "beacon",
    name: "Beacon",
    kicker: "OUTPUT · Q0.3",
    spec: "24 V DC · AMBER · 85 DB SOUNDER",
    description: "Warns people nearby: before a start, while an alarm is waiting to be acknowledged, or when service is due.",
    anchor: [-0.9, 2.3, 3.0],
    explode: 1.0,
  },
  {
    id: "terminals",
    name: "Terminals",
    kicker: "WIRING · X1",
    spec: "2.5 MM² · 1 TO 7 · L1 L2 L3 · T1 T2 T3",
    description: "Every field wire lands on a numbered terminal X1, so the panel can be tested and rewired without guessing.",
    anchor: [-2.8, 0.9, 1.15],
    explode: 0.8,
  },
];

export const partById = (id: string) => PARTS.find((p) => p.id === id);

export interface Physical {
  startPressed: boolean;
  stopPressed: boolean;
  auxPressed: boolean;
  estopPressed: boolean;
  overloadTripped: boolean;
  motorSpeed: number;
  current: number;
  heat: number;
}

/** Per lesson wiring choices, e.g. the safe stop lesson rewires Stop as normally closed. */
export interface RigOptions {
  stopNC?: boolean;
}

export interface Faults {
  stuckStart: boolean;
  brokenStop: boolean;
  jam: boolean;
}

export const INITIAL_PHYSICAL: Physical = {
  startPressed: false,
  stopPressed: false,
  auxPressed: false,
  estopPressed: false,
  overloadTripped: false,
  motorSpeed: 0,
  current: 0,
  heat: 0,
};

export const NO_FAULTS: Faults = { stuckStart: false, brokenStop: false, jam: false };

export function readInputs(p: Physical, f: Faults, o: RigOptions = {}): Memory {
  // A broken wire always reads 0. Wired normally closed, that looks like Stop pressed, which is the safe way to fail.
  const stopClosed = o.stopNC ? !p.stopPressed : p.stopPressed;
  return {
    Start_PB: p.startPressed || f.stuckStart,
    Stop_PB: f.brokenStop ? false : stopClosed,
    Overload_OK: !p.overloadTripped,
    EStop_OK: !p.estopPressed,
    Aux_PB: p.auxPressed,
    Motor_Amps: Math.round(p.current * 10),
  };
}

export const contactorClosed = (mem: Memory, p: Physical) =>
  Boolean(mem.Motor_Run) && !p.estopPressed && !p.overloadTripped;

const RATED_A = 2.6;

export function stepPhysics(p: Physical, f: Faults, mem: Memory, dtMs: number): Physical {
  const dt = dtMs / 1000;
  const powered = contactorClosed(mem, p);
  const target = powered ? (f.jam ? 0.08 : 1) : 0;
  const tau = powered ? 0.7 : 1.6;
  const motorSpeed = p.motorSpeed + (target - p.motorSpeed) * Math.min(1, dt / tau);

  // Starting current is roughly six times rated and falls away as the motor reaches speed.
  const slip = 1 - motorSpeed;
  const current = powered ? RATED_A * (0.35 + 5.6 * slip * slip) : 0;

  const overloadRatio = current / RATED_A;
  const heating = overloadRatio > 1.15 ? (overloadRatio - 1.15) * 0.09 : 0;
  const heat = Math.max(0, Math.min(1, p.heat + (heating - 0.05) * dt));
  const overloadTripped = p.overloadTripped || heat >= 1;

  return { ...p, motorSpeed, current, heat, overloadTripped };
}

export interface Annotation {
  n: number;
  part: PartId;
  title: string;
  text: string;
  labs: string[];
  more: number;
  side: "left" | "right";
  icon: string;
}

export const ANNOTATIONS: Annotation[] = [
  {
    n: 1,
    part: "start",
    title: "Pushbuttons",
    text: "Green Start, red Stop, both momentary. They only close while pressed, so the logic has to remember.",
    labs: ["F1", "F2", "F3"],
    more: 14,
    side: "left",
    icon: "pushbuttons",
  },
  {
    n: 2,
    part: "estop",
    title: "E-stop",
    text: "Latching mushroom on a hardwired NC loop. It drops the coil directly, the PLC only watches it.",
    labs: ["F3", "F16"],
    more: 6,
    side: "left",
    icon: "estop",
  },
  {
    n: 3,
    part: "plc",
    title: "PLC and I/O",
    text: "Reads inputs, runs the rungs top to bottom, writes outputs. One pass is a scan, 100 ms here.",
    labs: ["F1", "F2", "F3"],
    more: 17,
    side: "left",
    icon: "plc",
  },
  {
    n: 4,
    part: "contactor",
    title: "Contactor",
    text: "Q0.0 energises a 24 V DC coil and three main contacts close to feed the motor.",
    labs: ["F1", "F2", "F3"],
    more: 9,
    side: "right",
    icon: "contactor",
  },
  {
    n: 5,
    part: "overload",
    title: "Overload relay",
    text: "Heats with motor current and trips before the windings burn. Contact 95-96 is normally closed.",
    labs: ["F3", "F16"],
    more: 4,
    side: "right",
    icon: "overload",
  },
  {
    n: 6,
    part: "motor",
    title: "Motor",
    text: "1.1 kW three phase induction motor. Pulls about six times rated current while it starts.",
    labs: ["F1", "F2", "F3"],
    more: 12,
    side: "right",
    icon: "motor",
  },
];
