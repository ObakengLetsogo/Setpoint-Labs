import { ann } from "./process";
import type { LiveReadout, PhysicalState, PlcTerminal, RigDef } from "./types";

/*
 * A guarded machine cell: a rotating machine behind a fence with an interlocked door, a light
 * curtain across the loading opening and an E-stop. Every safety input is dual channel.
 *
 * Two safety layers are modelled. A safety relay (PNOZ style) monitors both channels of the
 * chain, cross-checks them, needs a monitored reset (on release) and checks the contactors'
 * mirror contacts before it will close its outputs. A safety PLC can take over: when a program
 * writes F_K1 / F_K2 the contactors follow those instead, and F_STO / F_QS drive the drive's
 * safe torque off and quick stop. Speeds are 0 to 100 %.
 *
 * This is a teaching model of the ideas. It is not a certified safety tool.
 */

const none: LiveReadout = { text: null, ring: null };
const terminals: PlcTerminal[] = [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  ...Array.from({ length: 8 }, (_, i): PlcTerminal => ({ id: `I0.${i}`, label: `I0.${i}`, kind: "input" })),
  ...Array.from({ length: 6 }, (_, i): PlcTerminal => ({ id: `I1.${i}`, label: `I1.${i}`, kind: "input" })),
  ...Array.from({ length: 6 }, (_, i): PlcTerminal => ({ id: `Q0.${i}`, label: `Q0.${i}`, kind: "output" })),
];

/** Both channels of every safety input, with the wiring faults applied. */
export function channels(p: PhysicalState, f: Record<string, boolean>) {
  const es = !p.estopPressed;
  const door = !p.doorOpen;
  const lc = !p.handInCurtain;
  return {
    esA: f.esBroken ? false : es,
    esB: f.esShort ? true : es,
    doorA: f.doorBridged ? true : door,
    doorB: f.doorBridged ? true : door,
    lc1: lc,
    lc2: lc,
  };
}

const LABS = ["p-safe-law", "p-safe-relay", "p-safe-guards", "p-fplc-basics", "p-fplc-validate", "p-sto"];

export const safety: RigDef = {
  id: "safety",
  name: "Guarded machine cell",
  headline: ["Machine", "safety"],
  tagline: "Safety relay · Light curtain · Interlocks · Safety PLC · STO",
  view: { target: [0, 1.6, 0], scale: 1.15 },
  tags: [
    { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Start pushbutton, NO" },
    { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Stop pushbutton, NC" },
    { tag: "Reset_PB", address: "I0.2", kind: "input", color: "#2457a6", connectsTo: "Safety reset pushbutton, NO" },
    { tag: "ES_A", address: "I0.3", kind: "input", color: "#c9a227", connectsTo: "E-stop channel A, NC, 1 when released" },
    { tag: "ES_B", address: "I0.4", kind: "input", color: "#c9a227", connectsTo: "E-stop channel B, NC, 1 when released" },
    { tag: "Door_A", address: "I0.5", kind: "input", color: "#c9a227", connectsTo: "Door interlock channel A, 1 when closed" },
    { tag: "Door_B", address: "I0.6", kind: "input", color: "#c9a227", connectsTo: "Door interlock channel B, 1 when closed" },
    { tag: "LC_OSSD1", address: "I0.7", kind: "input", color: "#c9a227", connectsTo: "Light curtain OSSD 1, 1 when clear" },
    { tag: "LC_OSSD2", address: "I1.0", kind: "input", color: "#c9a227", connectsTo: "Light curtain OSSD 2, 1 when clear" },
    { tag: "K_FB", address: "I1.1", kind: "input", color: "#2457a6", connectsTo: "K1 and K2 mirror contacts in series, 1 when both are open" },
    { tag: "Relay_OK", address: "I1.2", kind: "input", color: "#2457a6", connectsTo: "Safety relay status output, 1 when its outputs are on" },
    { tag: "Relay_Fault", address: "I1.3", kind: "input", color: "#d64545", connectsTo: "Safety relay diagnostic: channel fault" },
    { tag: "STO_Active", address: "I1.4", kind: "input", color: "#2457a6", connectsTo: "Drive feedback: safe torque off active" },
    { tag: "Motor_Speed", address: "IW64", kind: "input", color: "#6b4fa0", connectsTo: "Drive actual speed, 0 to 100 %", analog: true },
    { tag: "Coast_Stop", address: "I1.5", kind: "input", color: "#d64545", connectsTo: "Drive: torque was removed above 5 % speed, the machine coasted" },
    { tag: "Drive_Run", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Drive run command, standard" },
    { tag: "Run_Lamp", address: "Q0.1", kind: "output", color: "#2e9e5b", connectsTo: "Green run lamp" },
    { tag: "Safety_Lamp", address: "Q0.2", kind: "output", color: "#d64545", connectsTo: "Blue reset required lamp" },
    { tag: "F_K1", address: "F-Q0.0", kind: "output", color: "#c9a227", connectsTo: "Safety PLC output to contactor K1" },
    { tag: "F_K2", address: "F-Q0.1", kind: "output", color: "#c9a227", connectsTo: "Safety PLC output to contactor K2" },
    { tag: "F_STO", address: "F-Q0.2", kind: "output", color: "#c9a227", connectsTo: "Safety PLC to drive STO: 1 enables torque" },
    { tag: "F_QS", address: "F-Q0.3", kind: "output", color: "#c9a227", connectsTo: "Safety PLC to drive quick stop: 1 ramps down fast" },
  ],
  parts: [
    { id: "start", name: "Start", kicker: "INPUT · I0.0", spec: "22 MM · GREEN", description: "Starts the machine, through the standard program.", anchor: [-4.4, 1.4, 3.2], explode: 1.4 },
    { id: "stop", name: "Stop", kicker: "INPUT · I0.1 · NC", spec: "22 MM · RED", description: "A normal operational stop, not a safety function.", anchor: [-3.7, 1.4, 3.2], explode: 1.4 },
    { id: "reset", name: "Safety reset", kicker: "INPUT · I0.2", spec: "22 MM · BLUE · ILLUMINATED", description: "Re-arms the safety system after a stop. It acts when released.", anchor: [-3.0, 1.4, 3.2], explode: 1.4 },
    { id: "estop", name: "E-stop", kicker: "SAFETY · I0.3 · I0.4", spec: "TWO NC CHANNELS", description: "Two contacts, wired as two separate channels.", anchor: [-1.8, 1.6, 3.1], explode: 1.4 },
    { id: "door", name: "Interlocked door", kicker: "SAFETY · I0.5 · I0.6", spec: "CODED SWITCH · TWO CHANNELS", description: "Opening the door must stop the machine.", anchor: [2.6, 2.0, 1.6], explode: 0.8 },
    { id: "curtain", name: "Light curtain", kicker: "SAFETY · I0.7 · I1.0", spec: "TYPE 4 · 30 MM · 20 MS", description: "Its two OSSD outputs switch off when anything breaks a beam.", anchor: [-2.6, 2.0, 1.6], explode: 0.8 },
    { id: "machine", name: "Machine", kicker: "HAZARD · ROTATING ARM", spec: "DRIVE WITH STO", description: "The hazard: a rotating arm that must stop before anyone can reach it.", anchor: [0, 2.0, -0.4], explode: 0.6 },
    { id: "relay", name: "Safety relay", kicker: "PNOZ STYLE · CAT 4", spec: "DUAL CHANNEL · MONITORED RESET · EDM", description: "Checks both channels, the reset and the contactors' feedback before closing its outputs.", anchor: [-3.8, 2.6, -2.4], explode: 1.0 },
    { id: "contactors", name: "Safety contactors", kicker: "K1 · K2 · MIRROR CONTACTS", spec: "FORCE GUIDED", description: "Two contactors in series. Their mirror contacts prove they have opened.", anchor: [-2.6, 2.6, -2.4], explode: 1.0 },
    { id: "plc", name: "Safety PLC", kicker: "F-CPU · STANDARD + SAFETY", spec: "S7-1500F / GUARDLOGIX STYLE", description: "Runs a separate, protected safety program alongside the standard one.", anchor: [3.8, 1.6, -2.4], explode: 2.0 },
  ],
  annotations: [
    ann(1, "estop", "E-stop", "Two channels into the relay or the safety PLC.", LABS, "left", "pushbuttons"),
    ann(2, "curtain", "Light curtain", "Breaking a beam drops both OSSDs.", ["p-safe-law", "p-safe-guards", "p-fplc-basics", "p-fplc-validate", "p-sto"], "left", "terminals"),
    ann(3, "relay", "Safety relay", "Dual channel, monitored reset, contactor feedback.", ["p-safe-law", "p-safe-relay", "p-safe-guards"], "left", "contactor"),
    ann(4, "door", "Door interlock", "Opening it must stop the machine.", LABS, "right", "terminals"),
    ann(5, "machine", "Machine", "The hazard behind the fence.", LABS, "right", "motor"),
    ann(6, "plc", "Safety PLC", "Safety and standard programs, kept apart.", ["p-fplc-basics", "p-fplc-validate", "p-sto"], "right", "plc"),
  ],
  initial: {
    startPressed: false, stopPressed: false, resetPressed: false, estopPressed: false, doorOpen: false, handInCurtain: false,
    relayOut: false, relayFault: false, relayArmed: true, resetPrev: false, resetHeld: 0, k1: false, k2: false, torque: false,
    speed: 0, angle: 0, sto: true, coast: false, exposures: 0,
  },
  faults: [
    { key: "esShort", label: "E-stop channel B shorted", part: "estop" },
    { key: "esBroken", label: "E-stop channel A wire broken", part: "estop" },
    { key: "doorBridged", label: "Door switch bridged (defeated)", part: "door" },
    { key: "weldK2", label: "K2 contacts welded", part: "contactors" },
  ],
  controls: [
    { kind: "hold", part: "start", label: "Hold to press", key: "startPressed", tone: "#2e9e5b" },
    { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
    { kind: "hold", part: "reset", label: "Hold to press", key: "resetPressed", tone: "#2457a6" },
    { kind: "toggle", part: "estop", label: "Mushroom head", key: "estopPressed", on: "Pressed", off: "Released", logOn: "safety · e-stop pressed", logOff: "safety · e-stop released" },
    { kind: "toggle", part: "door", label: "Door", key: "doorOpen", on: "Open", off: "Closed", logOn: "safety · door opened", logOff: "safety · door closed" },
    { kind: "toggle", part: "curtain", label: "Reach through the curtain", key: "handInCurtain", on: "Hand in the beams", off: "Clear", logOn: "safety · light curtain interrupted", logOff: "safety · light curtain clear" },
    { kind: "meter", part: "machine", label: "Speed", key: "speed", max: 100, unit: "%", tone: "#2457a6" },
  ],
  wiring: {
    terminals,
    devices: [
      { id: "start", name: "Start S1", terminals: ["13", "14"], tone: "#22a061" },
      { id: "stop", name: "Stop S2, NC", terminals: ["11", "12"], tone: "#d23c3c" },
      { id: "reset", name: "Reset S3", terminals: ["13", "14"], tone: "#2457a6" },
      { id: "estop", name: "E-stop S4, 2 NC", terminals: ["11", "12", "21", "22"], tone: "#c9a227" },
      { id: "door", name: "Door switch B1, 2 ch", terminals: ["11", "12", "21", "22"], tone: "#c9a227" },
      { id: "lc", name: "Light curtain F1", terminals: ["OSSD1", "OSSD2"], tone: "#c9a227" },
      { id: "k", name: "K1, K2 mirror contacts", terminals: ["K1.21", "K2.22"], tone: "#2457a6" },
      { id: "relay", name: "Safety relay A1", terminals: ["S11", "S12", "S21", "S22", "S33", "S34", "Y1", "Y2", "13", "14"], tone: "#c9a227" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the standard inputs", caption: "Start, Stop and Reset.", role: "supply" },
      { n: 2, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Start to I0.0", caption: "Standard input.", role: "start", signal: "Start_PB" },
      { n: 3, plc: "I0.1", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop NC to I0.1", caption: "An operational stop, not a safety function.", role: "stop", signal: "Stop_PB" },
      { n: 4, plc: "I0.2", device: "reset", terminal: "14", color: "#2457a6", title: "Reset to I0.2 and relay S33-S34", caption: "The relay resets on the falling edge.", role: "reset", signal: "Reset_PB" },
      { n: 5, plc: "I0.3", device: "estop", terminal: "12", color: "#c9a227", title: "E-stop channel A to I0.3 and relay S11-S12", caption: "First NC contact.", role: "e-stop A", signal: "ES_A" },
      { n: 6, plc: "I0.4", device: "estop", terminal: "22", color: "#c9a227", title: "E-stop channel B to I0.4 and relay S21-S22", caption: "Second NC contact, a separate channel.", role: "e-stop B", signal: "ES_B" },
      { n: 7, plc: "I0.5", device: "door", terminal: "12", color: "#c9a227", title: "Door channel A to I0.5", caption: "In series with the E-stop channel A.", role: "door A", signal: "Door_A" },
      { n: 8, plc: "I0.6", device: "door", terminal: "22", color: "#c9a227", title: "Door channel B to I0.6", caption: "In series with the E-stop channel B.", role: "door B", signal: "Door_B" },
      { n: 9, plc: "I0.7", device: "lc", terminal: "OSSD1", color: "#c9a227", title: "Light curtain OSSD1 to I0.7", caption: "Pulse tested by the curtain itself.", role: "curtain 1", signal: "LC_OSSD1" },
      { n: 10, plc: "I1.0", device: "lc", terminal: "OSSD2", color: "#c9a227", title: "Light curtain OSSD2 to I1.0", caption: "Second output.", role: "curtain 2", signal: "LC_OSSD2" },
      { n: 11, plc: "I1.1", device: "k", terminal: "K2.22", color: "#2457a6", title: "K1, K2 mirror contacts to I1.1 and relay Y1-Y2", caption: "Closed only when both contactors have opened.", role: "feedback", signal: "K_FB" },
      { n: 12, plc: "I1.2", device: "relay", terminal: "14", color: "#2457a6", title: "Relay status to I1.2", caption: "Tells the standard program the safety relay is on.", role: "relay ok", signal: "Relay_OK" },
    ],
  },
  readInputs: (p, f) => {
    const c = channels(p, f);
    return {
      Start_PB: Boolean(p.startPressed),
      Stop_PB: !p.stopPressed,
      Reset_PB: Boolean(p.resetPressed),
      ES_A: c.esA,
      ES_B: c.esB,
      Door_A: c.doorA,
      Door_B: c.doorB,
      LC_OSSD1: c.lc1,
      LC_OSSD2: c.lc2,
      K_FB: !p.k1 && !p.k2,
      Relay_OK: Boolean(p.relayOut),
      Relay_Fault: Boolean(p.relayFault),
      STO_Active: !p.sto,
      Motor_Speed: Math.round(Number(p.speed)),
      Coast_Stop: Boolean(p.coast),
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    const c = channels(p, f);
    const chA = c.esA && c.doorA && c.lc1;
    const chB = c.esB && c.doorB && c.lc2;
    const kOpen = !p.k1 && !p.k2;

    /* ---- safety relay */
    let relayOut = Boolean(p.relayOut);
    let relayFault = Boolean(p.relayFault);
    let relayArmed = Boolean(p.relayArmed);
    // Cross monitoring: the two channels must always agree. If they do not, lock out until both
    // have opened, which proves neither is shorted.
    if (chA !== chB) {
      relayFault = true;
      relayArmed = false;
    }
    if (!chA && !chB) {
      relayArmed = true;
      relayFault = false;
    }
    if (!chA || !chB) relayOut = false;
    // Monitored reset: acts on release, with both channels closed, both contactors proved open,
    // and the button held for less than 3 s, so a stuck or taped button cannot reset it.
    const resetHeld = p.resetPressed ? Number(p.resetHeld) + dt : 0;
    const released = Boolean(p.resetPrev) && !p.resetPressed;
    if (released && Number(p.resetHeld) < 3 && chA && chB && kOpen && relayArmed && !relayFault) relayOut = true;

    /* ---- contactors: from the safety PLC if its program drives them, else from the relay */
    const coil1 = m.F_K1 === undefined ? relayOut : Boolean(m.F_K1);
    const coil2 = m.F_K2 === undefined ? relayOut : Boolean(m.F_K2);
    const k1 = coil1;
    const k2 = f.weldK2 ? Boolean(p.k2) || coil2 : coil2;
    const power = k1 && k2;

    /* ---- drive */
    const sto = m.F_STO === undefined ? true : Boolean(m.F_STO);
    const torque = power && sto;
    let speed = Number(p.speed);
    let coast = Boolean(p.coast);
    if (!torque) {
      // Torque removed: the machine coasts. Above 5 % that is an uncontrolled stop.
      if (Boolean(p.torque) && speed > 5) coast = true;
      speed = Math.max(0, speed - 100 * dt);
    } else if (m.F_QS) speed = Math.max(0, speed - 125 * dt); // quick stop ramp, 0.8 s from full speed
    else if (m.Drive_Run) {
      speed = Math.min(100, speed + 50 * dt);
      if (speed > 5) coast = false;
    } else speed = Math.max(0, speed - 50 * dt);

    /* ---- hazard: anyone exposed to a moving machine? */
    const exposed = (Boolean(p.doorOpen) || Boolean(p.handInCurtain)) && speed > 2;
    const exposures = Number(p.exposures) + (exposed && !(Boolean(p.exposedPrev)) ? 1 : 0);
    const angle = (Number(p.angle) + (speed / 100) * dt * 4) % (Math.PI * 2);
    return { ...p, relayOut, relayFault, relayArmed, resetPrev: Boolean(p.resetPressed), resetHeld, k1, k2, speed, sto, torque, coast, exposures, exposedPrev: exposed, angle };
  },
  events: (b, a) => {
    const out: [string, "info" | "fault"][] = [];
    if (!b.relayFault && a.relayFault) out.push(["fault · safety relay channel discrepancy", "fault"]);
    if (!b.relayOut && a.relayOut) out.push(["safety relay reset · outputs on", "info"]);
    if (b.relayOut && !a.relayOut) out.push(["safety relay · outputs off", "info"]);
    if (Number(a.exposures) > Number(b.exposures)) out.push(["DANGER · person exposed to a moving machine", "fault"]);
    if (!b.coast && a.coast) out.push(["torque removed at speed · machine coasted", "fault"]);
    return out;
  },
  live: (part, p) => {
    if (part === "machine") return Number(p.speed) > 1 ? { text: `${Math.round(Number(p.speed))} %`, ring: p.doorOpen || p.handInCurtain ? "fault" : "run" } : { text: p.sto ? "stopped" : "STO", ring: null };
    if (part === "relay") return p.relayFault ? { text: "channel fault", ring: "fault" } : p.relayOut ? { text: "outputs on", ring: "run" } : { text: "reset required", ring: "warn" };
    if (part === "contactors") return { text: `K1 ${p.k1 ? "on" : "off"} · K2 ${p.k2 ? "on" : "off"}`, ring: p.k1 !== p.k2 ? "fault" : p.k1 ? "run" : null };
    if (part === "door") return { text: p.doorOpen ? "open" : "closed", ring: p.doorOpen ? "warn" : null };
    if (part === "curtain") return { text: p.handInCurtain ? "interrupted" : "clear", ring: p.handInCurtain ? "warn" : null };
    if (part === "estop") return { text: p.estopPressed ? "pressed" : "released", ring: p.estopPressed ? "fault" : null };
    return none;
  },
};
