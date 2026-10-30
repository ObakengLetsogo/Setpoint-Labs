import { ann } from "./process";
import type { LiveReadout, PlcTerminal, RigDef } from "./types";

/*
 * A mine's crushing and conveying chain: a vibrating feeder feeds a crusher, which drops onto
 * conveyor CV01, which tips through a transfer chute onto CV02, which runs to the stockpile.
 * Belt speeds and loads are 0..1. The pull-wire switches are wired into each belt's starter, so a
 * pulled wire stops that belt whatever the PLC asks, as on a real mine.
 */

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const none: LiveReadout = { text: null, ring: null };
const TRANSPORT_S = 8;
const CR = { idleA: 30, fla: 100, tripA: 120, tripS: 5, lagS: 3 };

const terminals: PlcTerminal[] = [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  ...Array.from({ length: 8 }, (_, i): PlcTerminal => ({ id: `I0.${i}`, label: `I0.${i}`, kind: "input" })),
  ...Array.from({ length: 6 }, (_, i): PlcTerminal => ({ id: `I1.${i}`, label: `I1.${i}`, kind: "input" })),
  ...Array.from({ length: 8 }, (_, i): PlcTerminal => ({ id: `Q0.${i}`, label: `Q0.${i}`, kind: "output" })),
];

const LABS = ["n-conveyor-chain", "n-crusher-feed"];

export const mineConveyor: RigDef = {
  id: "mineconv",
  name: "Crusher and conveyor chain",
  headline: ["Conveyor", "chain"],
  tagline: "Pull-wires · Belt sway and slip · Crusher feed",
  view: { target: [0, 1.6, 0], scale: 1.18 },
  tags: [
    { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Control room start, NO" },
    { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Control room stop, NC" },
    { tag: "Reset_PB", address: "I0.2", kind: "input", color: "#2457a6", connectsTo: "Trip reset, NO" },
    { tag: "PW_01", address: "I0.3", kind: "input", color: "#c9a227", connectsTo: "CV01 pull-wire switches in series, 1 when healthy" },
    { tag: "PW_02", address: "I0.4", kind: "input", color: "#c9a227", connectsTo: "CV02 pull-wire switches in series, 1 when healthy" },
    { tag: "Sway_01", address: "I0.5", kind: "input", color: "#6b6f76", connectsTo: "CV01 belt sway switches, 1 when the belt runs true" },
    { tag: "Sway_02", address: "I0.6", kind: "input", color: "#6b6f76", connectsTo: "CV02 belt sway switches, 1 when the belt runs true" },
    { tag: "Spd_01", address: "I0.7", kind: "input", color: "#2457a6", connectsTo: "CV01 speed switch on the tail pulley, 1 above 90 % speed" },
    { tag: "Spd_02", address: "I1.0", kind: "input", color: "#2457a6", connectsTo: "CV02 speed switch on the tail pulley, 1 above 90 % speed" },
    { tag: "Chute_Blk", address: "I1.1", kind: "input", color: "#d64545", connectsTo: "Transfer chute blocked chute probe, 1 when blocked" },
    { tag: "Cr_FB", address: "I1.2", kind: "input", color: "#2457a6", connectsTo: "Crusher contactor auxiliary" },
    { tag: "Cr_Trip", address: "I1.3", kind: "input", color: "#d64545", connectsTo: "Crusher motor protection trip" },
    { tag: "Cr_Amps", address: "IW64", kind: "input", color: "#6b4fa0", connectsTo: "Crusher motor current, A (full load 100 A)", analog: true },
    { tag: "Siren", address: "Q0.0", kind: "output", color: "#e0a526", connectsTo: "Pre-start siren and flashing light along the belts" },
    { tag: "CV02_Run", address: "Q0.1", kind: "output", color: "#2457a6", connectsTo: "CV02 starter, through its pull-wires" },
    { tag: "CV01_Run", address: "Q0.2", kind: "output", color: "#2457a6", connectsTo: "CV01 starter, through its pull-wires" },
    { tag: "Crusher_Run", address: "Q0.3", kind: "output", color: "#2457a6", connectsTo: "Crusher starter" },
    { tag: "Feeder_Run", address: "Q0.4", kind: "output", color: "#2457a6", connectsTo: "Vibrating feeder drive run" },
    { tag: "Feeder_Speed", address: "QW64", kind: "output", color: "#6b4fa0", connectsTo: "Feeder drive speed, 0 to 100 % (100 % if not written)", analog: true },
    { tag: "Run_Lamp", address: "Q0.5", kind: "output", color: "#2e9e5b", connectsTo: "Green: chain running" },
    { tag: "Fault_Lamp", address: "Q0.6", kind: "output", color: "#d64545", connectsTo: "Red: chain tripped" },
  ],
  parts: [
    { id: "start", name: "Start", kicker: "INPUT · I0.0", spec: "CONTROL ROOM", description: "Starts the chain: siren first, then each belt in turn.", anchor: [-4.4, 1.4, 3.2], explode: 1.4 },
    { id: "stop", name: "Stop", kicker: "INPUT · I0.1 · NC", spec: "CONTROL ROOM", description: "A controlled stop: feeder first, then each belt runs empty.", anchor: [-3.7, 1.4, 3.2], explode: 1.4 },
    { id: "reset", name: "Reset", kicker: "INPUT · I0.2", spec: "CONTROL ROOM", description: "Clears a trip once every switch is healthy again.", anchor: [-3.0, 1.4, 3.2], explode: 1.4 },
    { id: "feeder", name: "Feeder and crusher", kicker: "FEEDER · CRUSHER 250 KW", spec: "VIBRATING FEEDER · JAW CRUSHER", description: "The feeder sets how fast ore goes into the crusher. The crusher's current shows how hard it is working.", anchor: [-4.2, 3.2, -1.6], explode: 0.8 },
    { id: "cv01", name: "Conveyor CV01", kicker: "OUTPUT · Q0.2", spec: "PULL-WIRE · SWAY · SPEED SWITCH", description: "Carries crushed ore from the crusher to the transfer chute.", anchor: [-1.2, 2.2, -0.6], explode: 0.6 },
    { id: "chute", name: "Transfer chute", kicker: "INPUT · I1.1", spec: "BLOCKED CHUTE PROBE", description: "Where CV01 tips onto CV02. If CV02 stops while CV01 runs, it fills and blocks.", anchor: [1.4, 2.6, -0.2], explode: 0.6 },
    { id: "cv02", name: "Conveyor CV02", kicker: "OUTPUT · Q0.1", spec: "PULL-WIRE · SWAY · SPEED SWITCH", description: "Carries ore to the stockpile.", anchor: [3.0, 1.8, 1.2], explode: 0.6 },
    { id: "plc", name: "Controller", kicker: "CPU · REMOTE I/O ALONG THE BELTS", spec: "PROFINET", description: "Runs the start and stop sequences and every belt trip.", anchor: [4.2, 1.4, -2.6], explode: 2.0 },
  ],
  annotations: [
    ann(1, "feeder", "Feeder and crusher", "Feed rate sets the crusher's load and current.", LABS, "left", "motor"),
    ann(2, "cv01", "Conveyor CV01", "Pull-wire, sway and speed switches.", ["n-conveyor-chain"], "left", "motor"),
    ann(3, "start", "Control room", "Start, stop and reset for the whole chain.", LABS, "left", "pushbuttons"),
    ann(4, "chute", "Transfer chute", "A blocked chute probe protects it.", ["n-conveyor-chain"], "right", "terminals"),
    ann(5, "cv02", "Conveyor CV02", "Starts first, stops last.", ["n-conveyor-chain"], "right", "motor"),
    ann(6, "plc", "Controller", "Sequences and trips for the whole chain.", LABS, "right", "plc"),
  ],
  initial: {
    startPressed: false, stopPressed: false, resetPressed: false,
    pw1Pulled: false, pw2Pulled: false, hardness: 1,
    c1: 0, c2: 0, cr: 0, feed: 0, crFill: 0, crA: 0, crHot: 0, crTrip: false, ore1: 0, ore2: 0, chute: 0, stock: 0, spilled: 0, phase: 0,
  },
  faults: [
    { key: "sway1", label: "CV01 belt running off (sway)", part: "cv01" },
    { key: "slip2", label: "CV02 belt slipping on the drive pulley", part: "cv02" },
    { key: "jam", label: "Crusher jammed with tramp steel", part: "feeder" },
  ],
  controls: [
    { kind: "hold", part: "start", label: "Hold to press", key: "startPressed", tone: "#2e9e5b" },
    { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
    { kind: "hold", part: "reset", label: "Hold to press", key: "resetPressed", tone: "#2457a6" },
    { kind: "toggle", part: "cv01", label: "CV01 pull-wire", key: "pw1Pulled", on: "Pulled", off: "Reset at the switch", logOn: "CV01 pull-wire pulled", logOff: "CV01 pull-wire reset" },
    { kind: "toggle", part: "cv02", label: "CV02 pull-wire", key: "pw2Pulled", on: "Pulled", off: "Reset at the switch", logOn: "CV02 pull-wire pulled", logOff: "CV02 pull-wire reset" },
    { kind: "slider", part: "feeder", label: "Ore hardness", key: "hardness", min: 0.6, max: 1.6, step: 0.1, unit: "×" },
    { kind: "meter", part: "feeder", label: "Crusher current", key: "crA", max: 160, unit: "A", tone: "#6b4fa0" },
    { kind: "meter", part: "chute", label: "Chute fill", key: "chute", max: 1, scale: 100, unit: "%", tone: "#d64545" },
  ],
  wiring: {
    terminals,
    devices: [
      { id: "start", name: "Start S1", terminals: ["13", "14"], tone: "#22a061" },
      { id: "stop", name: "Stop S2, NC", terminals: ["11", "12"], tone: "#d23c3c" },
      { id: "reset", name: "Reset S3", terminals: ["13", "14"], tone: "#2457a6" },
      { id: "pw", name: "Pull-wires CV01, CV02", terminals: ["PW1", "PW2"], tone: "#c9a227" },
      { id: "sway", name: "Sway switches", terminals: ["SW1", "SW2"], tone: "#6b6f76" },
      { id: "spd", name: "Speed switches", terminals: ["SP1", "SP2"], tone: "#2457a6" },
      { id: "chute", name: "Chute probe", terminals: ["BC"], tone: "#d23c3c" },
      { id: "starters", name: "Starters and siren", terminals: ["SIREN", "CV02", "CV01", "CR", "FDR"], tone: "#2457a6" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the inputs", caption: "Field switches are on remote I/O along the belts.", role: "supply" },
      { n: 2, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Start to I0.0", caption: "Momentary.", role: "start", signal: "Start_PB" },
      { n: 3, plc: "I0.1", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop NC to I0.1", caption: "1 at rest.", role: "stop", signal: "Stop_PB" },
      { n: 4, plc: "I0.2", device: "reset", terminal: "14", color: "#2457a6", title: "Reset to I0.2", caption: "Momentary.", role: "reset", signal: "Reset_PB" },
      { n: 5, plc: "I0.3", device: "pw", terminal: "PW1", color: "#c9a227", title: "CV01 pull-wires to I0.3", caption: "Also wired in CV01's starter circuit.", role: "pull-wire 1", signal: "PW_01" },
      { n: 6, plc: "I0.4", device: "pw", terminal: "PW2", color: "#c9a227", title: "CV02 pull-wires to I0.4", caption: "Also wired in CV02's starter circuit.", role: "pull-wire 2", signal: "PW_02" },
      { n: 7, plc: "I0.5", device: "sway", terminal: "SW1", color: "#6b6f76", title: "CV01 sway to I0.5", caption: "1 while the belt runs true.", role: "sway 1", signal: "Sway_01" },
      { n: 8, plc: "I0.6", device: "sway", terminal: "SW2", color: "#6b6f76", title: "CV02 sway to I0.6", caption: "1 while the belt runs true.", role: "sway 2", signal: "Sway_02" },
      { n: 9, plc: "I0.7", device: "spd", terminal: "SP1", color: "#2457a6", title: "CV01 speed switch to I0.7", caption: "1 above 90 % belt speed.", role: "speed 1", signal: "Spd_01" },
      { n: 10, plc: "I1.0", device: "spd", terminal: "SP2", color: "#2457a6", title: "CV02 speed switch to I1.0", caption: "1 above 90 % belt speed.", role: "speed 2", signal: "Spd_02" },
      { n: 11, plc: "I1.1", device: "chute", terminal: "BC", color: "#d23c3c", title: "Chute probe to I1.1", caption: "1 when ore reaches the probe.", role: "blocked chute", signal: "Chute_Blk" },
      { n: 12, plc: "Q0.0", device: "starters", terminal: "SIREN", color: "#2f6fd6", title: "Q0.0 to Q0.4: siren and starters", caption: "Siren, CV02, CV01, crusher, feeder.", role: "outputs", signal: "Siren" },
    ],
  },
  readInputs: (p, f) => ({
    Start_PB: Boolean(p.startPressed),
    Stop_PB: !p.stopPressed,
    Reset_PB: Boolean(p.resetPressed),
    PW_01: !p.pw1Pulled,
    PW_02: !p.pw2Pulled,
    Sway_01: !f.sway1,
    Sway_02: true,
    Spd_01: Number(p.c1) > 0.9,
    Spd_02: Number(p.c2) > 0.9,
    Chute_Blk: Number(p.chute) >= 1,
    Cr_FB: Number(p.cr) > 0.5,
    Cr_Trip: Boolean(p.crTrip),
    Cr_Amps: Math.round(Number(p.crA)),
  }),
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    // Pull-wires are in the starter circuits: a pulled wire stops that belt regardless of the PLC.
    const run1 = Boolean(m.CV01_Run) && !p.pw1Pulled;
    const run2 = Boolean(m.CV02_Run) && !p.pw2Pulled;
    const accel = (v: number, on: boolean, max = 1) => (on ? Math.min(max, v + dt / 3) : Math.max(0, v - dt / 2));
    const c1 = accel(Number(p.c1), run1);
    // A slipping belt: the motor turns, the belt does not keep up.
    const c2 = accel(Number(p.c2), run2, f.slip2 ? 0.5 : 1);
    let crTrip = Boolean(p.crTrip);
    if (crTrip && m.Reset_PB) crTrip = false;
    const cr = accel(Number(p.cr), Boolean(m.Crusher_Run) && !crTrip);
    const speedCmd = m.Feeder_Speed === undefined ? 100 : clamp(Number(m.Feeder_Speed), 0, 100);
    const feedTarget = m.Feeder_Run ? speedCmd / 100 : 0;
    const feed = Number(p.feed) + (feedTarget - Number(p.feed)) * Math.min(1, dt / 2);

    /* crusher: ore in from the feeder, out onto CV01 once crushed */
    const hard = Number(p.hardness);
    let crFill = Number(p.crFill) + feed * 0.25 * dt;
    const crushed = cr > 0.9 ? Math.min(crFill, 0.25 * dt * 1.2) : 0;
    crFill = clamp(crFill - crushed, 0, 1.2);
    const target = cr > 0.1 ? CR.idleA + 80 * feed * hard + (f.jam ? 110 : 0) + (crFill > 1 ? 60 : 0) : 0;
    const crA = Math.max(0, Number(p.crA) + (target - Number(p.crA)) * Math.min(1, dt / CR.lagS));
    const crHot = crA > CR.tripA ? Number(p.crHot) + dt : 0;
    if (crHot > CR.tripS) crTrip = true;

    /* belts carry ore along; CV01 tips into the chute, CV02 takes it away */
    let spilled = Number(p.spilled);
    let ore1 = Number(p.ore1) + crushed * 0.3;
    const off1 = (c1 * ore1 * dt) / TRANSPORT_S;
    ore1 = Math.max(0, ore1 - off1);
    if (ore1 > 1) {
      spilled += ore1 - 1;
      ore1 = 1;
    }
    let chute = Number(p.chute) + off1 * 1.5;
    const take = Math.min(chute, c2 * 0.4 * dt);
    chute = clamp(chute - take, 0, 1);
    let ore2 = Number(p.ore2) + take / 1.5;
    const off2 = (c2 * ore2 * dt) / TRANSPORT_S;
    ore2 = Math.max(0, ore2 - off2);
    const stock = Number(p.stock) + off2 * 10;
    return { ...p, c1, c2, cr, feed, crFill, crA, crHot, crTrip, ore1, ore2, chute, stock, spilled };
  },
  events: (b, a) => {
    const out: [string, "info" | "fault"][] = [];
    if (Number(b.chute) < 1 && Number(a.chute) >= 1) out.push(["fault · transfer chute blocked", "fault"]);
    if (!b.crTrip && a.crTrip) out.push(["fault · crusher tripped on overload", "fault"]);
    if (Number(a.spilled) > Number(b.spilled) + 0.01) out.push(["ore spilling off CV01", "fault"]);
    return out;
  },
  live: (part, p) => {
    if (part === "feeder") return Number(p.cr) > 0.05 ? { text: `${Math.round(Number(p.crA))} A · feed ${Math.round(Number(p.feed) * 100)} %`, ring: p.crTrip ? "fault" : Number(p.crA) > 100 ? "warn" : "run" } : p.crTrip ? { text: "tripped", ring: "fault" } : none;
    if (part === "cv01") return Number(p.c1) > 0.05 ? { text: `${Math.round(Number(p.c1) * 100)} % · load ${Math.round(Number(p.ore1) * 100)} %`, ring: p.pw1Pulled ? "fault" : "run" } : p.pw1Pulled ? { text: "pull-wire pulled", ring: "fault" } : none;
    if (part === "cv02") return Number(p.c2) > 0.05 ? { text: `${Math.round(Number(p.c2) * 100)} % · load ${Math.round(Number(p.ore2) * 100)} %`, ring: Number(p.c2) < 0.9 ? "warn" : "run" } : p.pw2Pulled ? { text: "pull-wire pulled", ring: "fault" } : none;
    if (part === "chute") return { text: `${Math.round(Number(p.chute) * 100)} % full`, ring: Number(p.chute) >= 1 ? "fault" : Number(p.chute) > 0.6 ? "warn" : null };
    return none;
  },
};
