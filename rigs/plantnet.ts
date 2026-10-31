import { ann, terminals } from "./process";
import type { LiveReadout, RigDef } from "./types";

/*
 * A networked plant: a booster pump at the pump house fills a town reservoir 5 km away. The
 * reservoir's level comes over the network from a remote I/O station, with a heartbeat counter
 * from the reservoir's controller. SCADA reads and writes tags over OPC UA. A vendor can ask for a
 * remote session, which a local key switch must allow.
 *
 * Faults model what goes wrong on real networks: the link is cut and the remote data freezes;
 * a gateway keeps reporting "OK" while its data is stale; and someone on the network writes
 * values they should not.
 */

const none: LiveReadout = { text: null, ring: null };
const RAW = 27648;

export const plantNet: RigDef = {
  id: "plantnet",
  name: "Networked pump station",
  headline: ["Plant", "network"],
  tagline: "Remote I/O · Heartbeats · OPC UA · Cyber security",
  view: { target: [0.4, 1.8, 0.2], scale: 1.12 },
  tags: [
    { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Local auto start, NO" },
    { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Local stop, NC" },
    { tag: "Pump_FB", address: "I0.2", kind: "input", color: "#2457a6", connectsTo: "Booster pump contactor auxiliary" },
    { tag: "Key_Allow", address: "I0.3", kind: "input", color: "#c9a227", connectsTo: "Remote access key switch in the control room, 1 when allowed" },
    { tag: "Res_Level", address: "RIO2 IW0", kind: "input", color: "#6b4fa0", connectsTo: "Reservoir level over the network, 0 to 27648", analog: true },
    { tag: "Res_HB", address: "RIO2 IW2", kind: "input", color: "#0f766e", connectsTo: "Heartbeat counter from the reservoir controller, +1 a second", analog: true },
    { tag: "RIO2_OK", address: "DIAG", kind: "input", color: "#0f766e", connectsTo: "Network diagnostic: the gateway says the link is up" },
    { tag: "SCADA_SP", address: "OPC UA", kind: "input", color: "#2457a6", connectsTo: "Fill setpoint written by SCADA, % (0 to 100 allowed)", analog: true },
    { tag: "SCADA_Start", address: "OPC UA", kind: "input", color: "#2457a6", connectsTo: "Start command written by SCADA" },
    { tag: "Remote_Req", address: "VPN", kind: "input", color: "#6b6f76", connectsTo: "A vendor is asking for a remote session" },
    { tag: "Pump_Run", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Booster pump starter" },
    { tag: "Run_Lamp", address: "Q0.1", kind: "output", color: "#2e9e5b", connectsTo: "Green run lamp" },
    { tag: "Comms_Alarm", address: "Q0.2", kind: "output", color: "#d64545", connectsTo: "Red comms alarm lamp" },
    { tag: "Remote_Lamp", address: "Q0.3", kind: "output", color: "#e0a526", connectsTo: "Amber: a remote session is open" },
  ],
  parts: [
    { id: "start", name: "Local start", kicker: "INPUT · I0.0", spec: "PUMP HOUSE", description: "Puts the station in auto from the pump house.", anchor: [-4.4, 1.4, 3.2], explode: 1.4 },
    { id: "stop", name: "Local stop", kicker: "INPUT · I0.1 · NC", spec: "PUMP HOUSE", description: "Stops the pump from the pump house.", anchor: [-3.7, 1.4, 3.2], explode: 1.4 },
    { id: "key", name: "Remote access key", kicker: "INPUT · I0.3", spec: "KEY SWITCH", description: "Only with this key turned may a vendor's remote session open.", anchor: [-3.0, 1.4, 3.2], explode: 1.4 },
    { id: "tank", name: "Reservoir", kicker: "5 KM AWAY · RIO2", spec: "TOWN SUPPLY", description: "Its level reaches the PLC over the network.", anchor: [0.4, 4.6, 0.2], explode: 0.6 },
    { id: "rio", name: "Remote I/O and link", kicker: "RIO2 · FIBRE · GATEWAY", spec: "PROFINET OVER FIBRE", description: "Carries the reservoir's level and heartbeat. Cut it from the popover.", anchor: [2.6, 3.2, -1.6], explode: 0.8 },
    { id: "scada", name: "SCADA and OPC UA", kicker: "CONTROL ROOM · OPC UA", spec: "READS AND WRITES TAGS", description: "Writes the fill setpoint and start commands over OPC UA.", anchor: [4.2, 2.6, -1.4], explode: 0.8 },
    { id: "vendor", name: "Vendor remote access", kicker: "VPN · REQUEST", spec: "TIME LIMITED", description: "A vendor asks for a session to look at the program.", anchor: [4.4, 1.2, 1.8], explode: 0.6 },
    { id: "demand", name: "Town demand", kicker: "LOAD", spec: "OUTLET", description: "How much water the town takes.", anchor: [2.6, 1.0, 1.6], explode: 0.6 },
    { id: "plc", name: "Controller", kicker: "CPU · PROFINET · OPC UA SERVER", spec: "S7-1500 STYLE", description: "Runs the station and serves its tags to SCADA.", anchor: [-3.8, 1.6, -2.6], explode: 2.2 },
  ],
  annotations: [
    ann(1, "rio", "Remote I/O", "The reservoir's level and heartbeat, over fibre.", ["e-remote-io", "e-opcua", "e-cyber", "e-remote-access"], "left", "terminals"),
    ann(2, "plc", "Controller", "Runs the pump and serves tags over OPC UA.", ["e-remote-io", "e-opcua", "e-cyber", "e-remote-access"], "left", "plc"),
    ann(3, "key", "Remote access key", "A person on site decides who gets in.", ["e-remote-access"], "left", "pushbuttons"),
    ann(4, "tank", "Reservoir", "5 km away; its level is only as good as the link.", ["e-remote-io", "e-opcua"], "right", "terminals"),
    ann(5, "scada", "SCADA", "Writes the setpoint and commands.", ["e-opcua", "e-cyber"], "right", "plc"),
    ann(6, "vendor", "Vendor", "Asks for a remote session.", ["e-remote-access"], "right", "terminals"),
  ],
  initial: {
    startPressed: false, stopPressed: false, keyOn: false, level: 0.4, demand: 0.5, inflow: 0, overflowed: 0,
    clock: 0, hbFrozen: 0, levelFrozen: 0.4, scadaSp: 70, scadaStart: false, remoteReq: false,
  },
  faults: [
    { key: "linkDown", label: "Fibre to the reservoir cut", part: "rio" },
    { key: "staleOK", label: "Gateway says OK but its data is stale", part: "rio" },
    { key: "rogue", label: "Unknown device writing over OPC UA", part: "scada" },
  ],
  controls: [
    { kind: "hold", part: "start", label: "Hold to press", key: "startPressed", tone: "#2e9e5b" },
    { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
    { kind: "toggle", part: "key", label: "Key switch", key: "keyOn", on: "Remote access allowed", off: "Locked", logOn: "remote access key turned on", logOff: "remote access key turned off" },
    { kind: "slider", part: "scada", label: "SCADA fill setpoint", key: "scadaSp", min: 0, max: 120, step: 5, unit: "%" },
    { kind: "hold", part: "scada", label: "SCADA start command", key: "scadaStart", tone: "#2457a6" },
    { kind: "toggle", part: "vendor", label: "Vendor session request", key: "remoteReq", on: "Requesting", off: "No request", logOn: "vendor requests a remote session", logOff: "vendor request withdrawn" },
    { kind: "slider", part: "demand", label: "Town demand", key: "demand", min: 0, max: 1, step: 0.05, unit: "" },
    { kind: "meter", part: "tank", label: "Real level", key: "level", max: 1, scale: 100, unit: "%", tone: "#3d8fd6" },
  ],
  wiring: {
    terminals: terminals(4, 4),
    devices: [
      { id: "start", name: "Start S1", terminals: ["13", "14"], tone: "#22a061" },
      { id: "stop", name: "Stop S2, NC", terminals: ["11", "12"], tone: "#d23c3c" },
      { id: "fb", name: "Pump contactor K1", terminals: ["13", "14", "A1"], tone: "#2457a6" },
      { id: "key", name: "Key switch S3", terminals: ["13", "14"], tone: "#c9a227" },
      { id: "lamps", name: "Lamps H1 H2 H3", terminals: ["H1", "H2", "H3"], tone: "#22a061" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the local inputs", caption: "Only the pump house signals are wired; the reservoir is on the network.", role: "supply" },
      { n: 2, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Start to I0.0", caption: "Momentary.", role: "start", signal: "Start_PB" },
      { n: 3, plc: "I0.1", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop NC to I0.1", caption: "1 at rest.", role: "stop", signal: "Stop_PB" },
      { n: 4, plc: "I0.2", device: "fb", terminal: "14", color: "#2457a6", title: "Pump feedback to I0.2", caption: "Contactor auxiliary.", role: "running", signal: "Pump_FB" },
      { n: 5, plc: "I0.3", device: "key", terminal: "14", color: "#c9a227", title: "Key switch to I0.3", caption: "Turned: remote access allowed.", role: "remote allowed", signal: "Key_Allow" },
      { n: 6, plc: "Q0.0", device: "fb", terminal: "A1", color: "#2f6fd6", title: "Q0.0 to pump contactor", caption: "Runs the booster pump.", role: "run", signal: "Pump_Run" },
      { n: 7, plc: "Q0.1", device: "lamps", terminal: "H1", color: "#2f6fd6", title: "Q0.1 to Q0.3 to the lamps", caption: "Run, comms alarm, remote session.", role: "lamps", signal: "Run_Lamp" },
    ],
  },
  readInputs: (p, f) => {
    const linked = !f.linkDown && !f.staleOK;
    const hb = linked ? Math.floor(Number(p.clock)) % 32768 : Number(p.hbFrozen);
    const level = linked ? Number(p.level) : Number(p.levelFrozen);
    return {
      Start_PB: Boolean(p.startPressed),
      Stop_PB: !p.stopPressed,
      Pump_FB: Number(p.inflow) > 0,
      Key_Allow: Boolean(p.keyOn),
      Res_Level: Math.round(Math.max(0, Math.min(1, level)) * RAW),
      Res_HB: hb,
      RIO2_OK: !f.linkDown,
      // A rogue device writes an absurd setpoint and keeps pulsing start.
      SCADA_SP: f.rogue ? 999 : Number(p.scadaSp),
      SCADA_Start: f.rogue ? Math.floor(Number(p.clock) * 2) % 2 === 0 : Boolean(p.scadaStart),
      Remote_Req: Boolean(p.remoteReq),
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    const inflow = m.Pump_Run ? 0.05 : 0;
    const out = Number(p.demand) * 0.03;
    let level = Number(p.level) + (inflow - out) * dt;
    let overflowed = Number(p.overflowed);
    if (level > 1) {
      overflowed += level - 1;
      level = 1;
    }
    const linked = !f.linkDown && !f.staleOK;
    const clock = Number(p.clock) + dt;
    return {
      ...p,
      level: Math.max(0, level),
      inflow,
      overflowed,
      clock,
      // While the link is healthy the "last known" values track the real ones; when it fails they freeze.
      hbFrozen: linked ? Math.floor(clock) % 32768 : Number(p.hbFrozen),
      levelFrozen: linked ? level : Number(p.levelFrozen),
    };
  },
  events: (b, a) => (Number(b.overflowed) === 0 && Number(a.overflowed) > 0 ? [["fault · reservoir overflowed", "fault"]] : []),
  live: (part, p, m) => {
    if (part === "tank") return { text: `${Math.round(Number(p.level) * 100)} % real · ${Math.round((Number(m.Res_Level ?? 0) / RAW) * 100)} % seen`, ring: Number(p.level) > 0.95 ? "fault" : null };
    if (part === "rio") return { text: `HB ${m.Res_HB ?? "-"} · ${m.RIO2_OK ? "link OK" : "link down"}`, ring: m.RIO2_OK ? null : "fault" };
    if (part === "scada") return { text: `SP ${m.SCADA_SP ?? "-"} %`, ring: Number(m.SCADA_SP) > 100 ? "fault" : null };
    if (part === "vendor") return { text: p.remoteReq ? "requesting" : "idle", ring: m.Remote_Lamp ? "warn" : null };
    if (part === "key") return { text: p.keyOn ? "allowed" : "locked", ring: p.keyOn ? "warn" : null };
    return none;
  },
};
