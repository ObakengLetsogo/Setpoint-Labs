import type { Annotation, LiveReadout, PlcTerminal, RigDef } from "./types";

/*
 * Sequence rigs: a road junction with a pedestrian crossing, and a three floor lift.
 */

const terminals = (inputs: number, outputs: number): PlcTerminal[] => [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  ...Array.from({ length: inputs }, (_, i): PlcTerminal => ({ id: `I0.${i}`, label: `I0.${i}`, kind: "input" })),
  ...Array.from({ length: outputs }, (_, i): PlcTerminal => ({ id: `Q0.${i}`, label: `Q0.${i}`, kind: "output" })),
];
const ann = (n: number, part: string, title: string, text: string, labs: string[], side: "left" | "right", icon: string): Annotation => ({ n, part, title, text, labs, more: 0, side, icon });
const none: LiveReadout = { text: null, ring: null };

/* --------------------------------------------------------------- traffic */

/** Junction geometry: the main road runs along X, the side road along Z, stop lines just before the box. */
export const ROAD = { half: 1.3, stopMain: -2.8, stopSide: 1.9, span: 6.2 };
const CAR_SPEED = 2.2;

function moveCar(pos: number, go: boolean, stop: number, dt: number, dir: 1 | -1) {
  // Cars approach along dir and stop at the stop line unless they may go or have already passed it.
  const next = pos + dir * CAR_SPEED * dt;
  const before = dir > 0 ? pos <= stop : pos >= stop;
  const crossing = dir > 0 ? next > stop : next < stop;
  let p = !go && before && crossing ? stop : next;
  if (dir > 0 && p > ROAD.span) p = -ROAD.span;
  if (dir < 0 && p < -ROAD.span) p = ROAD.span;
  return p;
}

export const traffic: RigDef = {
  id: "traffic",
  name: "Traffic junction",
  headline: ["Traffic", "lights"],
  tagline: "State machine · Timers · Pedestrian call",
  view: { target: [0, 0.8, 0.3], scale: 1.05 },
  tags: [
    { tag: "Ped_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Pedestrian push button" },
    { tag: "Car_Wait", address: "I0.1", kind: "input", color: "#3d434a", connectsTo: "Side road loop detector" },
    { tag: "Night_Sw", address: "I0.2", kind: "input", color: "#6b6f76", connectsTo: "Night mode selector" },
    { tag: "Main_Red", address: "Q0.0", kind: "output", color: "#d64545", connectsTo: "Main road red" },
    { tag: "Main_Amber", address: "Q0.1", kind: "output", color: "#e0a526", connectsTo: "Main road amber" },
    { tag: "Main_Green", address: "Q0.2", kind: "output", color: "#2e9e5b", connectsTo: "Main road green" },
    { tag: "Side_Red", address: "Q0.3", kind: "output", color: "#d64545", connectsTo: "Side road red" },
    { tag: "Side_Amber", address: "Q0.4", kind: "output", color: "#e0a526", connectsTo: "Side road amber" },
    { tag: "Side_Green", address: "Q0.5", kind: "output", color: "#2e9e5b", connectsTo: "Side road green" },
    { tag: "Walk", address: "Q0.6", kind: "output", color: "#2e9e5b", connectsTo: "Pedestrian walk man" },
    { tag: "Dont_Walk", address: "Q0.7", kind: "output", color: "#d64545", connectsTo: "Pedestrian red man" },
  ],
  parts: [
    { id: "ped", name: "Ped button", kicker: "INPUT · I0.0", spec: "PUSH BUTTON · WAIT LAMP", description: "A pedestrian asks to cross the main road.", anchor: [-1.8, 1.4, -2.0], explode: 0.6 },
    { id: "loop", name: "Loop detector", kicker: "INPUT · I0.1", spec: "INDUCTIVE LOOP IN THE ROAD", description: "Senses a car waiting at the side road stop line.", anchor: [0, 0.3, ROAD.stopSide + 0.6], explode: 0.3 },
    { id: "night", name: "Night switch", kicker: "INPUT · I0.2", spec: "KEY SELECTOR", description: "For your own night mode, flashing amber on the main road.", anchor: [4.2, 1.6, -3.0], explode: 0.6 },
    { id: "plc", name: "Controller", kicker: "CPU · 3 DI / 8 DQ", spec: "STREET CABINET", description: "Runs the junction as a state machine: one step number, one set of lights.", anchor: [4.2, 1.6, -3.0], explode: 1.6 },
    { id: "main", name: "Main signals", kicker: "OUTPUTS · Q0.0 TO Q0.2", spec: "RED · AMBER · GREEN", description: "Control traffic on the main road, left to right.", anchor: [-1.6, 3.2, 1.6], explode: 0.8 },
    { id: "side", name: "Side signals", kicker: "OUTPUTS · Q0.3 TO Q0.5", spec: "RED · AMBER · GREEN", description: "Control traffic coming down the side road.", anchor: [1.6, 3.2, 1.6], explode: 0.8 },
    { id: "pedsig", name: "Ped signal", kicker: "OUTPUTS · Q0.6 · Q0.7", spec: "WALK · DON'T WALK", description: "The green walk man lights while side traffic has green and main traffic is held.", anchor: [-1.8, 2.8, -1.6], explode: 0.8 },
  ],
  annotations: [
    ann(1, "main", "Main signals", "Green by default. The main road only stops when someone is waiting.", ["M7"], "left", "pushbuttons"),
    ann(2, "ped", "Ped button", "Latches a crossing request until the walk phase.", ["M7"], "left", "pushbuttons"),
    ann(3, "plc", "Controller", "Steps through six phases, one timer each.", ["M7"], "left", "plc"),
    ann(4, "side", "Side signals", "Green only after a car or a pedestrian has asked.", ["M7"], "right", "pushbuttons"),
    ann(5, "loop", "Loop detector", "A car stopped at the line turns it on.", ["M7"], "right", "terminals"),
    ann(6, "pedsig", "Ped signal", "Walk during the side road green.", ["M7"], "right", "pushbuttons"),
  ],
  initial: { pedPressed: false, night: false, mainCar: -5, sideCar: 5, crossings: 0 },
  faults: [{ key: "loopFail", label: "Loop detector failed", part: "loop" }],
  controls: [
    { kind: "hold", part: "ped", label: "Hold to press", key: "pedPressed", tone: "#2e9e5b" },
    { kind: "toggle", part: "night", label: "Night mode", key: "night", on: "Night", off: "Day" },
    { kind: "status", part: "loop", label: "Car at the line", value: (p) => ({ text: Math.abs(Number(p.sideCar) - ROAD.stopSide) < 0.05 ? "Waiting" : "Clear", on: Math.abs(Number(p.sideCar) - ROAD.stopSide) < 0.05 }) },
  ],
  wiring: {
    terminals: terminals(3, 8),
    devices: [
      { id: "ped", name: "Ped button S1", terminals: ["13", "14"], tone: "#22a061" },
      { id: "loop", name: "Loop detector B1", terminals: ["11", "14"], tone: "#3d434a" },
      { id: "night", name: "Night key S2", terminals: ["13", "14"], tone: "#6b6f76" },
      { id: "mainHead", name: "Main head H1 to H3", terminals: ["R", "A", "G"], tone: "#2e9e5b" },
      { id: "sideHead", name: "Side head H4 to H6", terminals: ["R", "A", "G"], tone: "#2e9e5b" },
      { id: "pedHead", name: "Ped head H7 H8", terminals: ["W", "D"], tone: "#22a061" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "ped", terminal: "13", color: "#c9372c", title: "+24 V to the inputs", caption: "Supply for the button, loop and key.", role: "supply" },
      { n: 2, plc: "I0.0", device: "ped", terminal: "14", color: "#22a061", title: "Ped button to I0.0", caption: "1 while pressed.", role: "ped call", signal: "Ped_PB" },
      { n: 3, plc: "I0.1", device: "loop", terminal: "14", color: "#3d434a", title: "Loop detector to I0.1", caption: "1 while a car stands on the loop.", role: "car waiting", signal: "Car_Wait" },
      { n: 4, plc: "I0.2", device: "night", terminal: "14", color: "#6b6f76", title: "Night key to I0.2", caption: "1 in night mode.", role: "night", signal: "Night_Sw" },
      { n: 5, plc: "Q0.2", device: "mainHead", terminal: "G", color: "#2f6fd6", title: "Q0.0 to Q0.2 to the main head", caption: "Red, amber and green, one output each.", role: "main lights", signal: "Main_Green" },
      { n: 6, plc: "Q0.5", device: "sideHead", terminal: "G", color: "#2f6fd6", title: "Q0.3 to Q0.5 to the side head", caption: "Red, amber and green.", role: "side lights", signal: "Side_Green" },
      { n: 7, plc: "Q0.6", device: "pedHead", terminal: "W", color: "#2f6fd6", title: "Q0.6 and Q0.7 to the ped head", caption: "Walk and don't walk.", role: "ped lights", signal: "Walk" },
    ],
  },
  readInputs: (p, f) => ({
    Ped_PB: Boolean(p.pedPressed),
    Car_Wait: f.loopFail ? false : Math.abs(Number(p.sideCar) - ROAD.stopSide) < 0.05,
    Night_Sw: Boolean(p.night),
  }),
  step: (p, _f, m, dtMs) => {
    const dt = dtMs / 1000;
    const mainGo = Boolean(m.Main_Green) || Boolean(m.Main_Amber);
    const sideGo = Boolean(m.Side_Green) || Boolean(m.Side_Amber);
    const mainCar = moveCar(Number(p.mainCar), mainGo, ROAD.stopMain, dt, 1);
    const sideCar = moveCar(Number(p.sideCar), sideGo, ROAD.stopSide, dt, -1);
    const crossings = Number(p.crossings) + (Number(p.sideCar) >= 0 && sideCar < 0 ? 1 : 0);
    return { ...p, mainCar, sideCar, crossings };
  },
  live: (part, p, m) => {
    if (part === "main") return { text: m.Main_Green ? "green" : m.Main_Amber ? "amber" : m.Main_Red ? "red" : "dark", ring: m.Main_Green ? "run" : m.Main_Amber ? "warn" : null };
    if (part === "side") return { text: m.Side_Green ? "green" : m.Side_Amber ? "amber" : m.Side_Red ? "red" : "dark", ring: m.Side_Green ? "run" : m.Side_Amber ? "warn" : null };
    if (part === "loop") return Math.abs(Number(p.sideCar) - ROAD.stopSide) < 0.05 ? { text: "car waiting", ring: "warn" } : none;
    if (part === "pedsig") return m.Walk ? { text: "walk", ring: "run" } : none;
    return none;
  },
};

/* ------------------------------------------------------------------ lift */

export const LIFT = { floorH: 1.7, speed: 0.45, doorSpeed: 0.9 };

export const lift: RigDef = {
  id: "lift",
  name: "Three floor lift",
  headline: ["Lift", "control"],
  tagline: "Calls · Floor sensors · Door interlock",
  view: { target: [0.2, 2.7, 0], scale: 1.0 },
  tags: [
    { tag: "Call_1", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Call button, floor 1" },
    { tag: "Call_2", address: "I0.1", kind: "input", color: "#2e9e5b", connectsTo: "Call button, floor 2" },
    { tag: "Call_3", address: "I0.2", kind: "input", color: "#2e9e5b", connectsTo: "Call button, floor 3" },
    { tag: "Floor_1", address: "I0.3", kind: "input", color: "#3d434a", connectsTo: "Floor 1 level sensor" },
    { tag: "Floor_2", address: "I0.4", kind: "input", color: "#3d434a", connectsTo: "Floor 2 level sensor" },
    { tag: "Floor_3", address: "I0.5", kind: "input", color: "#3d434a", connectsTo: "Floor 3 level sensor" },
    { tag: "Door_Closed", address: "I0.6", kind: "input", color: "#6b6f76", connectsTo: "Door closed limit switch" },
    { tag: "Door_Opened", address: "I0.7", kind: "input", color: "#6b6f76", connectsTo: "Door open limit switch" },
    { tag: "Motor_Up", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Hoist motor, up contactor" },
    { tag: "Motor_Down", address: "Q0.1", kind: "output", color: "#2457a6", connectsTo: "Hoist motor, down contactor" },
    { tag: "Door_Open", address: "Q0.2", kind: "output", color: "#f26b1d", connectsTo: "Door operator, open" },
    { tag: "Door_Close", address: "Q0.3", kind: "output", color: "#f26b1d", connectsTo: "Door operator, close" },
  ],
  parts: [
    { id: "call1", name: "Call, floor 1", kicker: "INPUT · I0.0", spec: "LANDING BUTTON", description: "Calls the lift to floor 1.", anchor: [-1.7, 1.0, 1.3], explode: 0.4 },
    { id: "call2", name: "Call, floor 2", kicker: "INPUT · I0.1", spec: "LANDING BUTTON", description: "Calls the lift to floor 2.", anchor: [-1.7, 2.7, 1.3], explode: 0.4 },
    { id: "call3", name: "Call, floor 3", kicker: "INPUT · I0.2", spec: "LANDING BUTTON", description: "Calls the lift to floor 3.", anchor: [-1.7, 4.4, 1.3], explode: 0.4 },
    { id: "car", name: "Lift car", kicker: "LOAD", spec: "4 PERSONS · 320 KG", description: "Moves between three floors on its guide rails.", anchor: [0, 2.4, 0.2], explode: 0.6 },
    { id: "doors", name: "Car doors", kicker: "OUTPUTS · Q0.2 · Q0.3", spec: "SLIDING · LIMITS I0.6 I0.7", description: "Open and close on command. The car must never move with them open.", anchor: [0, 1.5, 1.1], explode: 0.6 },
    { id: "sensors", name: "Floor sensors", kicker: "INPUTS · I0.3 TO I0.5", spec: "MAGNETIC · ONE PER FLOOR", description: "Each turns on when the car is level with its floor.", anchor: [1.2, 3.4, -0.6], explode: 0.6 },
    { id: "hoist", name: "Hoist", kicker: "OUTPUTS · Q0.0 · Q0.1", spec: "GEARED MOTOR · TWO DIRECTIONS", description: "Winds the car up or down. Up and down must never be on together.", anchor: [0, 6.0, -0.4], explode: 0.6 },
    { id: "plc", name: "Controller", kicker: "CPU · 8 DI / 4 DQ", spec: "MACHINE ROOM", description: "Remembers calls, picks a direction, stops at the right floor and works the doors.", anchor: [3.8, 1.6, -2.2], explode: 1.6 },
  ],
  annotations: [
    ann(1, "call2", "Call buttons", "Each landing has one. A call is remembered until the lift arrives.", ["M8"], "left", "pushbuttons"),
    ann(2, "plc", "Controller", "Chooses up or down from the calls and where the car is.", ["M8"], "left", "plc"),
    ann(3, "sensors", "Floor sensors", "Tell the program which floor the car is level with.", ["M8"], "left", "terminals"),
    ann(4, "hoist", "Hoist", "Up and down, interlocked against each other.", ["M8"], "right", "motor"),
    ann(5, "car", "Lift car", "Travels at 0.45 floors per second.", ["M8"], "right", "contactor"),
    ann(6, "doors", "Doors", "Open for 3 s at each stop. Moving with them open is a fault.", ["M8"], "right", "contactor"),
  ],
  initial: { call1: false, call2: false, call3: false, carY: 0, door: 0, unsafeMoves: 0 },
  faults: [{ key: "doorStuck", label: "Door stuck open", part: "doors" }],
  controls: [
    { kind: "hold", part: "call1", label: "Hold to call", key: "call1", tone: "#2e9e5b" },
    { kind: "hold", part: "call2", label: "Hold to call", key: "call2", tone: "#2e9e5b" },
    { kind: "hold", part: "call3", label: "Hold to call", key: "call3", tone: "#2e9e5b" },
    { kind: "meter", part: "car", label: "Height", key: "carY", max: 2, scale: 1, unit: "floors", tone: "#2457a6" },
    { kind: "meter", part: "doors", label: "Door open", key: "door", max: 1, scale: 100, unit: "%", tone: "#f26b1d" },
  ],
  wiring: {
    terminals: terminals(8, 4),
    devices: [
      { id: "calls", name: "Call buttons S1 to S3", terminals: ["13", "14"], tone: "#22a061" },
      { id: "floors", name: "Floor sensors B1 to B3", terminals: ["BN", "BK", "BU"], tone: "#3d434a" },
      { id: "doorLs", name: "Door limits S4 S5", terminals: ["13", "14"], tone: "#6b6f76" },
      { id: "hoist", name: "Hoist contactors KU KD", terminals: ["A1", "A2"], tone: "#2457a6" },
      { id: "door", name: "Door operator", terminals: ["O", "C"], tone: "#f26b1d" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "calls", terminal: "13", color: "#c9372c", title: "+24 V to the inputs", caption: "Supply for buttons and sensors.", role: "supply" },
      { n: 2, plc: "I0.0", device: "calls", terminal: "14", color: "#22a061", title: "Calls to I0.0 to I0.2", caption: "One input per landing.", role: "calls", signal: "Call_1" },
      { n: 3, plc: "I0.3", device: "floors", terminal: "BK", color: "#2f2f2f", title: "Floor sensors to I0.3 to I0.5", caption: "1 while the car is level.", role: "floors", signal: "Floor_1" },
      { n: 4, plc: "I0.6", device: "doorLs", terminal: "14", color: "#6b6f76", title: "Door closed to I0.6", caption: "1 only when fully closed.", role: "door closed", signal: "Door_Closed" },
      { n: 5, plc: "I0.7", device: "doorLs", terminal: "14", color: "#6b6f76", title: "Door open to I0.7", caption: "1 when fully open.", role: "door open", signal: "Door_Opened" },
      { n: 6, plc: "Q0.0", device: "hoist", terminal: "A1", color: "#2f6fd6", title: "Q0.0 and Q0.1 to the hoist", caption: "Up and down contactors, interlocked.", role: "hoist", signal: "Motor_Up" },
      { n: 7, plc: "Q0.2", device: "door", terminal: "O", color: "#2f6fd6", title: "Q0.2 and Q0.3 to the door operator", caption: "Open and close commands.", role: "doors", signal: "Door_Open" },
    ],
  },
  readInputs: (p) => {
    const y = Number(p.carY);
    const at = (n: number) => Math.abs(y - n) < 0.03;
    const door = Number(p.door);
    return {
      Call_1: Boolean(p.call1),
      Call_2: Boolean(p.call2),
      Call_3: Boolean(p.call3),
      Floor_1: at(0),
      Floor_2: at(1),
      Floor_3: at(2),
      Door_Closed: door < 0.02,
      Door_Opened: door > 0.98,
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    const up = Boolean(m.Motor_Up);
    const down = Boolean(m.Motor_Down);
    const dir = up && !down ? 1 : down && !up ? -1 : 0;
    const carY = Math.max(0, Math.min(2, Number(p.carY) + dir * LIFT.speed * dt));
    const doorCmd = f.doorStuck ? 1 : m.Door_Open ? 1 : m.Door_Close ? -1 : 0;
    const door = Math.max(0, Math.min(1, Number(p.door) + doorCmd * LIFT.doorSpeed * dt));
    const moving = dir !== 0 && carY !== Number(p.carY);
    const unsafeMoves = Number(p.unsafeMoves) + (moving && door > 0.02 ? dt : 0);
    return { ...p, carY, door, unsafeMoves };
  },
  events: (b, a) => (Number(b.unsafeMoves) === 0 && Number(a.unsafeMoves) > 0 ? [["fault · car moved with the doors open", "fault"]] : []),
  live: (part, p, m) => {
    if (part === "car") return { text: `floor ${Math.round(Number(p.carY)) + 1}${m.Motor_Up ? " · going up" : m.Motor_Down ? " · going down" : ""}`, ring: m.Motor_Up || m.Motor_Down ? "run" : null };
    if (part === "doors") return Number(p.door) > 0.02 ? { text: `${Math.round(Number(p.door) * 100)} % open`, ring: Number(p.unsafeMoves) > 0 ? "fault" : "warn" } : none;
    if (part === "hoist") return m.Motor_Up ? { text: "up", ring: "run" } : m.Motor_Down ? { text: "down", ring: "run" } : none;
    return none;
  },
};
