import { tank } from "./process";
import type { Annotation, RigDef } from "./types";

/*
 * An operator station: the header tank, now run from a touch screen. The screen's buttons write
 * HMI_Start, HMI_Stop and HMI_Ack the way a real HMI writes tags in the PLC, and the screen shows
 * the valve, the level, the alarm banner and a level trend. The tank physics are the header tank's.
 */

const ann = (n: number, part: string, title: string, text: string, labs: string[], side: "left" | "right", icon: string): Annotation => ({ n, part, title, text, labs, more: 0, side, icon });
const LABS = ["f-hmi-what", "f-hmi-screen", "f-hmi-alarms"];

export const hmi: RigDef = {
  ...tank,
  id: "hmi",
  name: "Operator station",
  headline: ["Operator", "screen"],
  tagline: "HMI buttons · Status · Alarms · Trends",
  view: { target: [0.4, 1.8, 0.2], scale: 1.12 },
  tags: [
    ...tank.tags,
    { tag: "HMI_Start", address: "HMI", kind: "marker", color: "#2e9e5b", connectsTo: "Start button on the screen" },
    { tag: "HMI_Stop", address: "HMI", kind: "marker", color: "#d64545", connectsTo: "Stop button on the screen" },
    { tag: "HMI_Ack", address: "HMI", kind: "marker", color: "#e0a526", connectsTo: "Acknowledge button on the screen" },
  ],
  parts: [
    ...tank.parts,
    { id: "hmi", name: "Operator screen", kicker: "HMI · TOUCH PANEL", spec: "7 INCH · ETHERNET TO THE PLC", description: "Shows the process and lets the operator start, stop and acknowledge alarms without walking to the panel.", anchor: [4.2, 2.6, -1.6], explode: 0.8 },
    { id: "hmiStart", name: "Screen START", kicker: "HMI · WRITES HMI_Start", spec: "TOUCH BUTTON", description: "Sets HMI_Start in the PLC while touched.", anchor: [3.6, 1.9, -1.4], explode: 0.8 },
    { id: "hmiStop", name: "Screen STOP", kicker: "HMI · WRITES HMI_Stop", spec: "TOUCH BUTTON", description: "Sets HMI_Stop in the PLC while touched.", anchor: [4.2, 1.9, -1.4], explode: 0.8 },
    { id: "hmiAck", name: "Screen ACK", kicker: "HMI · WRITES HMI_Ack", spec: "TOUCH BUTTON", description: "Sets HMI_Ack in the PLC while touched.", anchor: [4.8, 1.9, -1.4], explode: 0.8 },
  ],
  annotations: [
    ann(1, "hmi", "Operator screen", "Its buttons write tags in the PLC; its indicators read them.", LABS, "left", "plc"),
    ann(2, "plc", "Controller", "Runs the tank. The screen only asks; the program decides.", LABS, "left", "plc"),
    ann(3, "valve", "Inlet valve", "Shown on the screen as open or closed.", LABS, "left", "contactor"),
    ann(4, "lt", "Transmitter", "The level on the screen and in the trend.", LABS, "right", "plc"),
    ann(5, "floats", "Float switches", "The high float raises the alarm.", LABS, "right", "terminals"),
    ann(6, "demand", "Outlet", "Change the demand and watch the trend.", LABS, "right", "terminals"),
  ],
  initial: { ...tank.initial, hmiStart: false, hmiStop: false, hmiAck: false },
  controls: [
    { kind: "hold", part: "hmiStart", label: "Touch START", key: "hmiStart", tone: "#2e9e5b" },
    { kind: "hold", part: "hmiStop", label: "Touch STOP", key: "hmiStop", tone: "#d64545" },
    { kind: "hold", part: "hmiAck", label: "Touch ACK", key: "hmiAck", tone: "#e0a526" },
    ...tank.controls,
  ],
  readInputs: (p, f, o) => ({
    ...tank.readInputs(p, f, o),
    HMI_Start: Boolean(p.hmiStart),
    HMI_Stop: Boolean(p.hmiStop),
    HMI_Ack: Boolean(p.hmiAck),
  }),
  live: (part, p, m, running) => {
    if (part === "hmi") return m.Alarm_Lamp ? { text: m.Alarm_Acked ? "alarm acknowledged" : "ALARM", ring: m.Alarm_Acked ? "warn" : "fault" } : { text: `level ${Math.round(Number(p.level) * 100)} %`, ring: "idle" };
    return tank.live(part, p, m, running);
  },
};
