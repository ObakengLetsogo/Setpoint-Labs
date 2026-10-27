import type { IoPoint } from "../types";

/** Motor starter bench I/O, shared by every lesson that runs on it. */
export const IO: Record<string, IoPoint> = {
  start: { address: "I0.0", tagName: "Start_PB", color: "#2e9e5b", connectsTo: "Start pushbutton", description: "Green, momentary, normally open" },
  stop: { address: "I0.1", tagName: "Stop_PB", color: "#d64545", connectsTo: "Stop pushbutton", description: "Red, momentary, normally open" },
  ol: { address: "I0.2", tagName: "Overload_OK", color: "#f26b1d", connectsTo: "Overload relay 95-96", description: "Normally closed, opens when the overload trips" },
  run: { address: "Q0.0", tagName: "Motor_Run", color: "#2457a6", connectsTo: "Contactor coil A1-A2", description: "Closes the main contacts that power the motor" },
  runLamp: { address: "Q0.1", tagName: "Run_Lamp", color: "#2e9e5b", connectsTo: "Green pilot lamp", description: "Lit while the motor is commanded on" },
  faultLamp: { address: "Q0.2", tagName: "Fault_Lamp", color: "#d64545", connectsTo: "Red pilot lamp", description: "Lit while the overload is tripped" },
  seal: { address: "M0.0", tagName: "Run_Seal", color: "#6b6f76", connectsTo: "Internal memory bit", description: "Remembers that the motor should keep running" },
};

