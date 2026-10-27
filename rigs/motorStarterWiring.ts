import type { FieldDevice, PlcTerminal, WireDef } from "./types";

/** Motor starter bench wiring: PLC terminals, field devices and numbered wires. */

export const PLC_TERMINALS: PlcTerminal[] = [
  { id: "24V", label: "L+ 24V", kind: "power" },
  { id: "0V", label: "M 0V", kind: "ground" },
  { id: "I0.0", label: "I0.0", kind: "input" },
  { id: "I0.1", label: "I0.1", kind: "input" },
  { id: "I0.2", label: "I0.2", kind: "input" },
  { id: "I0.3", label: "I0.3", kind: "input" },
  { id: "I0.4", label: "I0.4", kind: "input" },
  { id: "I0.5", label: "I0.5", kind: "input" },
  { id: "Q0.0", label: "Q0.0", kind: "output" },
  { id: "Q0.1", label: "Q0.1", kind: "output" },
  { id: "Q0.2", label: "Q0.2", kind: "output" },
  { id: "Q0.3", label: "Q0.3", kind: "output" },
];

export const FIELD_DEVICES: FieldDevice[] = [
  { id: "start", name: "Start pushbutton S1", terminals: ["13", "14"], tone: "#22a061" },
  { id: "stop", name: "Stop pushbutton S2", terminals: ["13", "14"], tone: "#d23c3c" },
  { id: "estop", name: "E-stop S0", terminals: ["11", "12"], tone: "#e0b326" },
  { id: "overload", name: "Overload relay F2", terminals: ["95", "96"], tone: "#f26b1d" },
  { id: "coil", name: "Contactor coil K1", terminals: ["A1", "A2"], tone: "#2457a6" },
  { id: "runLamp", name: "Run lamp H1", terminals: ["X1", "X2"], tone: "#22a061" },
  { id: "faultLamp", name: "Fault lamp H2", terminals: ["X1", "X2"], tone: "#d23c3c" },
  { id: "aux", name: "AUX pushbutton S3", terminals: ["13", "14"], tone: "#3d434a" },
  { id: "beacon", name: "Beacon and sounder H3", terminals: ["X1", "X2"], tone: "#e0a526" },
];

export const WIRES: WireDef[] = [
  { n: 1, plc: "24V", device: "start", terminal: "13", color: "#c9372c", title: "+24 V to the station common", caption: "Every input switches this supply. Wire power first, so you know which side is live.", role: "supply to buttons" },
  { n: 2, plc: "I0.0", device: "start", terminal: "14", color: "#22a061", title: "Start 14 to I0.0", caption: "Pressing Start puts 24 V on I0.0. Let go and it falls back to 0 V.", role: "start command", signal: "Start_PB" },
  { n: 3, plc: "I0.1", device: "stop", terminal: "14", color: "#d23c3c", title: "Stop 14 to I0.1", caption: "Stop is normally open on this rig, so a broken wire would hide the stop. The safe stop lesson rewires it.", role: "stop command", signal: "Stop_PB" },
  { n: 4, plc: "I0.2", device: "overload", terminal: "96", color: "#f26b1d", title: "Overload 96 to I0.2", caption: "Normally closed: I0.2 sits at 1 while healthy and drops to 0 on a trip.", role: "overload healthy", signal: "Overload_OK" },
  { n: 5, plc: "I0.3", device: "estop", terminal: "12", color: "#e0b326", title: "E-stop NC to I0.3", caption: "Fails safe if the wire breaks: an open circuit reads the same as a pressed E-stop.", role: "e-stop healthy", signal: "EStop_OK" },
  { n: 6, plc: "Q0.0", device: "coil", terminal: "A1", color: "#2f6fd6", title: "Q0.0 to contactor A1", caption: "The output sources 24 V into the coil. The coil pulls in and the main contacts close.", role: "run the motor", signal: "Motor_Run" },
  { n: 7, plc: "0V", device: "coil", terminal: "A2", color: "#1b2430", title: "Coil A2 to 0 V", caption: "Current needs a way home. Without this wire Q0.0 switches on and nothing happens.", role: "coil return" },
  { n: 8, plc: "Q0.1", device: "runLamp", terminal: "X1", color: "#2f6fd6", title: "Q0.1 to run lamp X1", caption: "A green lamp that follows the run command, so the operator can see it from across the floor.", role: "run indication", signal: "Run_Lamp" },
  { n: 9, plc: "Q0.2", device: "faultLamp", terminal: "X1", color: "#2f6fd6", title: "Q0.2 to fault lamp X1", caption: "Lit while the overload is tripped. It tells the operator why the motor refuses to start.", role: "fault indication", signal: "Fault_Lamp" },
  { n: 10, plc: "I0.4", device: "aux", terminal: "14", color: "#3d434a", title: "AUX 14 to I0.4", caption: "A spare button. Each lesson gives it a job: jog, reset or acknowledge.", role: "aux command", signal: "Aux_PB" },
  { n: 11, plc: "Q0.3", device: "beacon", terminal: "X1", color: "#2f6fd6", title: "Q0.3 to beacon X1", caption: "An amber beacon with a sounder. It warns people before a start and while an alarm waits.", role: "warning", signal: "Beacon" },
];

