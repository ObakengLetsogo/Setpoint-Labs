import type { RigPiece } from "@/components/stage/MotorStarterRig";

export type RenderState = "idle" | "run" | "fault" | "estop";

export interface RenderSpec {
  only: RigPiece[];
  /** Camera azimuth in radians around the pieces, 0 looks from the front. */
  az?: number;
  /** Camera elevation in radians above the horizon. */
  el?: number;
  state?: RenderState;
}

/** One render per lab so every node on the track has its own picture. Rendered by /render/parts?lab=<id>. */
export const LAB_RENDERS: Record<string, RenderSpec> = {
  "f-symbols": { only: ["start", "stop", "aux"], az: 0.5 },
  "foundations-1": { only: ["start", "stop"], az: -0.3, el: 0.4 },
  "f-scan": { only: ["plc", "io"], az: 0.3 },
  "foundations-2": { only: ["contactor"], state: "run", az: 0.7 },
  "f-latch": { only: ["contactor"], az: -1.0, el: 0.8 },
  "f-jog": { only: ["aux"], az: 0.8, el: 0.45 },
  "foundations-3": { only: ["overload"], state: "fault", az: 0.6 },
  "f-ton": { only: ["beacon"], state: "run", az: 0.4, el: 0.3 },
  "f-tof": { only: ["station"], state: "run", az: 0.2 },
  "f-flasher": { only: ["station"], state: "fault", az: -0.3 },
  "f-counters": { only: ["io"], state: "run", az: 0.4 },
  "f-compare": { only: ["motor"], state: "run", az: -0.9 },
  "f-edge": { only: ["start"], az: 1.0, el: 0.4 },
  "f-estop": { only: ["estop"], state: "estop", az: 0.5 },
  "f-safe-stop": { only: ["estop", "stop"], az: -0.4 },
  "w-schematics": { only: ["terminals"], az: 0.2, el: 0.9 },
  "w-power-control": { only: ["mcb", "contactor"], az: 0.5 },
  "w-terminals": { only: ["terminals"], az: -0.7 },
  "w-multimeter": { only: ["mcb"], az: -0.9 },
  "w-loop-check": { only: ["plc", "io"], az: 1.0, el: 0.5, state: "run" },
  "w-commissioning": { only: ["contactor", "overload"], az: 0.9, el: 0.9 },
  "a-structured-text": { only: ["plc"], az: -0.5, el: 0.9 },
  "a-function-blocks": { only: ["plc", "io"], az: -0.3 },
  "a-comms": { only: ["io"], az: -0.8 },
  "a-hmi": { only: ["station"], state: "run", az: 0.6 },
  "a-fault-finding": { only: ["overload", "contactor"], state: "fault", az: -0.6 },
  "a-documentation": { only: ["terminals", "mcb"], az: 0.4 },
  "t-iec": { only: ["plc"], az: 0.3 },
  "t-siemens": { only: ["plc"], az: 0.9, el: 0.4 },
  "t-rockwell": { only: ["plc", "io"], az: 0.6, el: 0.8 },
  "t-schneider": { only: ["io"], az: 0.2, el: 0.6 },
  "t-mitsubishi": { only: ["plc"], az: -0.9, el: 0.5 },
  "t-omron": { only: ["plc", "io"], az: 1.2, el: 0.35 },
  "t-delta": { only: ["io"], az: -0.4, el: 0.3 },
};

export const PART_RENDERS: Record<string, RenderSpec> = {
  pushbuttons: { only: ["station", "start", "stop", "estop"] },
  estop: { only: ["estop"] },
  plc: { only: ["plc", "io"] },
  contactor: { only: ["contactor"] },
  overload: { only: ["overload"] },
  motor: { only: ["motor"] },
  terminals: { only: ["terminals"] },
  breaker: { only: ["mcb"] },
};
