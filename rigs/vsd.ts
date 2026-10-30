import type { PlcTerminal, RigDef } from "./types";

/*
 * A variable speed drive feeding a fan motor. The PLC sends run and reset commands and a speed
 * reference on an analog output; the drive reports ready, running, fault and at speed.
 * Analog values use 0..27648 for 0..100 %, i.e. 0..50 Hz.
 */

export const VSD = { full: 27648, maxHz: 50, ramp: 10 };

const terminals: PlcTerminal[] = [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  ...Array.from({ length: 7 }, (_, i): PlcTerminal => ({ id: `I0.${i}`, label: `I0.${i}`, kind: "input" })),
  ...Array.from({ length: 4 }, (_, i): PlcTerminal => ({ id: `Q0.${i}`, label: `Q0.${i}`, kind: "output" })),
  { id: "AI0", label: "AI0", kind: "input" },
  { id: "AQ0", label: "AQ0", kind: "output" },
];

export const vsd: RigDef = {
  id: "vsd",
  name: "Fan drive",
  headline: ["Variable", "speed"],
  tagline: "Run · Speed reference · Ramps · Faults",
  tags: [
    { tag: "Start_PB", address: "I0.0", kind: "input", color: "#2e9e5b", connectsTo: "Start pushbutton, NO" },
    { tag: "Stop_PB", address: "I0.1", kind: "input", color: "#d64545", connectsTo: "Stop pushbutton, NC" },
    { tag: "Drive_Ready", address: "I0.2", kind: "input", color: "#2457a6", connectsTo: "Drive relay 1: ready" },
    { tag: "Drive_Running", address: "I0.3", kind: "input", color: "#2457a6", connectsTo: "Drive relay 2: running" },
    { tag: "Drive_Fault", address: "I0.4", kind: "input", color: "#d64545", connectsTo: "Drive relay 3: fault" },
    { tag: "At_Speed", address: "I0.5", kind: "input", color: "#2e9e5b", connectsTo: "Drive digital out: at setpoint" },
    { tag: "Reset_PB", address: "I0.6", kind: "input", color: "#3d434a", connectsTo: "Fault reset pushbutton, NO" },
    { tag: "Speed_Pot", address: "IW64", kind: "input", color: "#6b4fa0", connectsTo: "Speed potentiometer, 0 to 27648", analog: true },
    { tag: "Motor_Hz", address: "IW66", kind: "input", color: "#6b4fa0", connectsTo: "Drive analog out: frequency × 10", analog: true },
    { tag: "Drive_Run", address: "Q0.0", kind: "output", color: "#2457a6", connectsTo: "Drive digital in 1: run forward" },
    { tag: "Drive_Reset", address: "Q0.1", kind: "output", color: "#2457a6", connectsTo: "Drive digital in 2: fault reset" },
    { tag: "Fault_Lamp", address: "Q0.2", kind: "output", color: "#d64545", connectsTo: "Red fault lamp" },
    { tag: "Run_Lamp", address: "Q0.3", kind: "output", color: "#2e9e5b", connectsTo: "Green run lamp" },
    { tag: "Speed_Ref", address: "QW64", kind: "output", color: "#6b4fa0", connectsTo: "Drive analog in: speed reference, 0 to 27648", analog: true },
  ],
  parts: [
    { id: "start", name: "Start", kicker: "INPUT · I0.0", spec: "22 MM · GREEN · 1 NO", description: "Starts the fan.", anchor: [-4.4, 1.4, 3.2], explode: 1.4 },
    { id: "stop", name: "Stop", kicker: "INPUT · I0.1 · NC", spec: "22 MM · RED · 1 NC", description: "Stops the fan; the drive ramps it down.", anchor: [-3.7, 1.4, 3.2], explode: 1.4 },
    { id: "reset", name: "Reset", kicker: "INPUT · I0.6", spec: "22 MM · BLUE · 1 NO", description: "Asks the program to reset a drive fault.", anchor: [-3.0, 1.4, 3.2], explode: 1.4 },
    { id: "pot", name: "Speed pot", kicker: "ANALOG · IW64", spec: "10 KΩ · 0 TO 10 V", description: "The operator's speed setting, read as 0 to 27648.", anchor: [-2.2, 1.5, 3.2], explode: 1.4 },
    { id: "plc", name: "Controller", kicker: "CPU · AI 2 / AQ 2", spec: "24 V DC · SCAN 100 MS", description: "Scales the pot to a speed reference, runs the drive and handles its faults.", anchor: [-3.8, 1.6, -2.6], explode: 2.2 },
    { id: "drive", name: "Drive", kicker: "VSD · 4 KW", spec: "400 V · 0 TO 50 HZ · RAMP 10 HZ/S", description: "Turns fixed mains into variable frequency, so the motor runs at any speed.", anchor: [-0.6, 3.2, -2.6], explode: 1.6 },
    { id: "motor", name: "Fan motor", kicker: "LOAD · 4 KW", spec: "400 V · 8 A · 1450 RPM AT 50 HZ", description: "Drives the fan. Speed follows the drive frequency.", anchor: [2.6, 2.2, 1.0], explode: 0.9 },
    { id: "fan", name: "Fan", kicker: "LOAD", spec: "AXIAL · 600 MM", description: "Fan power rises with the cube of speed, so a little slower saves a lot.", anchor: [4.6, 3.0, 1.0], explode: 0.9 },
  ],
  annotations: [
    { n: 1, part: "start", title: "Pushbuttons", text: "Start, normally closed Stop and a fault Reset.", labs: ["P4.5", "P4.6"], more: 0, side: "left", icon: "pushbuttons" },
    { n: 2, part: "pot", title: "Speed pot", text: "The operator's speed setting as 0 to 27648.", labs: ["P4.5"], more: 0, side: "left", icon: "plc" },
    { n: 3, part: "plc", title: "Controller", text: "Scales the speed, sends run and reset, watches the drive's relays.", labs: ["P4.5", "P4.6"], more: 0, side: "left", icon: "plc" },
    { n: 4, part: "drive", title: "Drive", text: "Ramps the frequency at 10 Hz per second towards the reference.", labs: ["P4.5", "P4.6"], more: 0, side: "right", icon: "plc" },
    { n: 5, part: "motor", title: "Motor", text: "Speed and current follow the drive output.", labs: ["P4.5", "P4.6"], more: 0, side: "right", icon: "motor" },
    { n: 6, part: "fan", title: "Fan", text: "Jam it to make the drive trip on overcurrent.", labs: ["P4.6"], more: 0, side: "right", icon: "motor" },
  ],
  initial: { startPressed: false, stopPressed: false, resetPressed: false, pot: 0.6, hz: 0, amps: 0, fault: 0, faultT: 0, resetPrev: false, faults: 0, fanAngle: 0, atSpeed: false, hzNorm: 0 },
  faults: [
    { key: "jam", label: "Jam the fan", part: "fan" },
    { key: "mainsLoss", label: "Mains supply lost", part: "drive" },
  ],
  controls: [
    { kind: "hold", part: "start", label: "Hold to press", key: "startPressed", tone: "#2e9e5b" },
    { kind: "hold", part: "stop", label: "Hold to press", key: "stopPressed", tone: "#d64545" },
    { kind: "hold", part: "reset", label: "Hold to press", key: "resetPressed", tone: "#2457a6" },
    { kind: "slider", part: "pot", label: "Speed setting", key: "pot", min: 0, max: 1, step: 0.05, unit: "" },
    { kind: "meter", part: "drive", label: "Output frequency", key: "hz", max: 50, unit: "Hz", tone: "#2457a6" },
    { kind: "meter", part: "motor", label: "Current", key: "amps", max: 20, unit: "A", tone: "#6b4fa0" },
    { kind: "status", part: "drive", label: "Fault code", value: (p) => ({ text: Number(p.fault) === 1 ? "F001 overcurrent" : Number(p.fault) === 2 ? "F003 undervoltage" : "none", on: Number(p.fault) > 0 }) },
  ],
  wiring: {
    terminals,
    devices: [
      { id: "start", name: "Start S1", terminals: ["13", "14"], tone: "#22a061" },
      { id: "stop", name: "Stop S2, NC", terminals: ["11", "12"], tone: "#d23c3c" },
      { id: "reset", name: "Reset S3", terminals: ["13", "14"], tone: "#2457a6" },
      { id: "pot", name: "Speed pot R1", terminals: ["1", "W", "3"], tone: "#6b4fa0" },
      { id: "drive", name: "Drive U1", terminals: ["DI1", "DI2", "AI1", "RL1", "RL2", "RL3", "DO1", "AO1"], tone: "#2457a6" },
    ],
    wires: [
      { n: 1, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the inputs", caption: "Supply for buttons and the drive relays.", role: "supply" },
      { n: 2, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Start to I0.0", caption: "1 while pressed.", role: "start", signal: "Start_PB" },
      { n: 3, plc: "I0.1", device: "stop", terminal: "12", color: "#d23c3c", title: "Stop NC to I0.1", caption: "1 at rest.", role: "stop healthy", signal: "Stop_PB" },
      { n: 4, plc: "I0.2", device: "drive", terminal: "RL1", color: "#2457a6", title: "Drive ready relay to I0.2", caption: "1 when powered and healthy.", role: "ready", signal: "Drive_Ready" },
      { n: 5, plc: "I0.4", device: "drive", terminal: "RL3", color: "#d23c3c", title: "Drive fault relay to I0.4", caption: "1 while the drive has tripped.", role: "fault", signal: "Drive_Fault" },
      { n: 6, plc: "I0.5", device: "drive", terminal: "DO1", color: "#22a061", title: "Drive at speed to I0.5", caption: "1 when the output matches the reference.", role: "at speed", signal: "At_Speed" },
      { n: 7, plc: "I0.6", device: "reset", terminal: "14", color: "#2457a6", title: "Reset to I0.6", caption: "1 while pressed.", role: "reset", signal: "Reset_PB" },
      { n: 8, plc: "AI0", device: "pot", terminal: "W", color: "#6b4fa0", title: "Pot wiper to AI0", caption: "0 to 10 V, read as 0 to 27648.", role: "speed setting" },
      { n: 9, plc: "Q0.0", device: "drive", terminal: "DI1", color: "#2f6fd6", title: "Q0.0 to drive DI1", caption: "Run forward while on.", role: "run", signal: "Drive_Run" },
      { n: 10, plc: "Q0.1", device: "drive", terminal: "DI2", color: "#2f6fd6", title: "Q0.1 to drive DI2", caption: "A rising edge resets a fault.", role: "reset", signal: "Drive_Reset" },
      { n: 11, plc: "AQ0", device: "drive", terminal: "AI1", color: "#6b4fa0", title: "AQ0 to drive AI1", caption: "Speed reference, 0 to 10 V for 0 to 50 Hz.", role: "reference" },
    ],
  },
  readInputs: (p, f) => {
    const hz = Number(p.hz);
    const fault = Number(p.fault);
    const ready = !f.mainsLoss && fault === 0;
    return {
      Start_PB: Boolean(p.startPressed),
      Stop_PB: !p.stopPressed,
      Reset_PB: Boolean(p.resetPressed),
      Drive_Ready: ready,
      Drive_Running: hz > 0.2,
      Drive_Fault: fault > 0,
      At_Speed: Boolean(p.atSpeed),
      Speed_Pot: Math.round(Number(p.pot) * VSD.full),
      Motor_Hz: Math.round(hz * 10),
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    let fault = Number(p.fault);
    let faultT = Number(p.faultT);
    let faults = Number(p.faults);
    // Reset on the rising edge of the reset command, once the cause has gone.
    const resetNow = Boolean(m.Drive_Reset) && !p.resetPrev;
    if (resetNow && fault > 0 && !(fault === 2 && f.mainsLoss)) fault = 0;
    if (f.mainsLoss && fault === 0) {
      fault = 2;
      faults += 1;
    }
    const run = fault === 0 && Boolean(m.Drive_Run);
    const refHz = Math.max(0, Math.min(VSD.maxHz, (Number(m.Speed_Ref ?? 0) / VSD.full) * VSD.maxHz));
    const target = run ? refHz : 0;
    let hz = Number(p.hz);
    const step = VSD.ramp * dt;
    hz = fault > 0 ? Math.max(0, hz - VSD.ramp * 3 * dt) : hz < target ? Math.min(target, hz + step) : Math.max(target, hz - step);
    const load = (hz / VSD.maxHz) ** 2;
    const amps = hz > 0.2 ? 2.4 + 5.6 * load + (f.jam ? 14 : 0) : 0;
    if (fault === 0 && amps > 16) {
      faultT += dt;
      if (faultT > 1) {
        fault = 1;
        faults += 1;
        faultT = 0;
      }
    } else faultT = 0;
    const atSpeed = run && Math.abs(hz - refHz) < 0.5 && refHz > 0.5;
    const fanAngle = (Number(p.fanAngle) + (f.jam ? 0 : hz) * dt * 2.4) % (Math.PI * 2);
    return { ...p, hz, hzNorm: f.jam ? 0 : hz / VSD.maxHz, amps, fault, faultT, faults, resetPrev: Boolean(m.Drive_Reset), atSpeed, fanAngle };
  },
  events: (b, a) => {
    if (Number(b.fault) === 0 && Number(a.fault) === 1) return [["fault · drive tripped, F001 overcurrent", "fault"]];
    if (Number(b.fault) === 0 && Number(a.fault) === 2) return [["fault · drive tripped, F003 undervoltage", "fault"]];
    if (Number(b.fault) > 0 && Number(a.fault) === 0) return [["drive fault reset", "info"]];
    return [];
  },
  live: (part, p) => {
    const hz = Number(p.hz);
    if (part === "drive") return Number(p.fault) > 0 ? { text: Number(p.fault) === 1 ? "F001 overcurrent" : "F003 undervoltage", ring: "fault" } : hz > 0.2 ? { text: `${hz.toFixed(1)} Hz`, ring: "run" } : { text: "ready", ring: null };
    if (part === "motor") return hz > 0.2 ? { text: `${Math.round((hz / 50) * 1450)} rpm · ${Number(p.amps).toFixed(1)} A`, ring: Number(p.amps) > 12 ? "warn" : "run" } : { text: null, ring: null };
    if (part === "pot") return { text: `${Math.round(Number(p.pot) * 100)} %`, ring: null };
    return { text: null, ring: null };
  },
};
