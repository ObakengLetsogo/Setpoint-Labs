import type { IoPoint } from "../types";

/** Motor starter bench I/O, shared by every lesson that runs on it. */
export const IO: Record<string, IoPoint> = {
  start: { address: "I0.0", tagName: "Start_PB", color: "#2e9e5b", connectsTo: "Start pushbutton", description: "Green, momentary, normally open" },
  stop: { address: "I0.1", tagName: "Stop_PB", color: "#d64545", connectsTo: "Stop pushbutton", description: "Red, momentary, normally open" },
  ol: { address: "I0.2", tagName: "Overload_OK", color: "#f26b1d", connectsTo: "Overload relay 95-96", description: "Normally closed, opens when the overload trips" },
  run: { address: "Q0.0", tagName: "Motor_Run", color: "#2457a6", connectsTo: "Contactor coil A1-A2", description: "Closes the main contacts that power the motor" },
  runLamp: { address: "Q0.1", tagName: "Run_Lamp", color: "#2e9e5b", connectsTo: "Green pilot lamp", description: "Lit while the motor is commanded on" },
  faultLamp: { address: "Q0.2", tagName: "Fault_Lamp", color: "#d64545", connectsTo: "Red pilot lamp", description: "Lit while the overload is tripped" },
  estop: { address: "I0.3", tagName: "EStop_OK", color: "#c9a227", connectsTo: "E-stop monitoring contact", description: "Normally closed, 1 while the E-stop is released" },
  aux: { address: "I0.4", tagName: "Aux_PB", color: "#3d434a", connectsTo: "Black AUX pushbutton", description: "Momentary, normally open. Jog, reset or acknowledge" },
  amps: { address: "IW64", tagName: "Motor_Amps", color: "#6b4fa0", connectsTo: "Current transducer", description: "Motor current in tenths of an amp, 26 = 2.6 A" },
  beacon: { address: "Q0.3", tagName: "Beacon", color: "#e0a526", connectsTo: "Amber beacon and sounder", description: "Warns people nearby" },
  stopNC: { address: "I0.1", tagName: "Stop_PB", color: "#d64545", connectsTo: "Stop pushbutton", description: "Rewired normally closed: 1 at rest, 0 when pressed or broken" },
  seal: { address: "M0.0", tagName: "Run_Seal", color: "#6b6f76", connectsTo: "Internal memory bit", description: "Remembers that the motor should keep running" },
};

