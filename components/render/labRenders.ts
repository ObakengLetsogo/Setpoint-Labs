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
  "foundations-1": { only: ["start", "stop"], az: 0.5 },
  "foundations-2": { only: ["contactor"], state: "run", az: 0.7 },
  "foundations-3": { only: ["overload"], state: "fault", az: 0.6 },
  "foundations-4": { only: ["contactor", "overload"], az: -0.6 },
  "foundations-5": { only: ["motor"], az: -0.9, state: "run" },
  "foundations-6": { only: ["plc"], az: 0.3 },
  "foundations-7": { only: ["plc"], az: -0.5, el: 0.9 },
  "foundations-8": { only: ["motor", "overload"], az: 0.9 },
  "foundations-9": { only: ["io"], state: "run", az: 0.4 },
  "foundations-10": { only: ["plc", "io"], az: -0.3 },
  "foundations-11": { only: ["start"], az: 1.0, el: 0.4 },
  "foundations-12": { only: ["terminals"], az: 0.2, el: 0.9 },
  "foundations-13": { only: ["motor"], az: 1.4, el: 0.35 },
  "foundations-14": { only: ["contactor"], az: -1.0, el: 0.8 },
  "foundations-15": { only: ["station"], state: "run", az: 0.2 },
  "foundations-16": { only: ["estop", "stop"], az: -0.4 },
  "foundations-17": { only: ["estop"], state: "estop", az: 0.5 },
  "foundations-18": { only: ["station", "start"], az: -0.8 },
  "foundations-19": { only: ["plc", "io", "contactor"], az: 0.6, el: 0.8 },
  "foundations-20": { only: ["mcb"], state: "fault", az: 0.5 },
  P1: { only: ["terminals"], az: -0.7 },
  P2: { only: ["motor"], az: 0.2, el: 0.5, state: "run" },
  P3: { only: ["io"], az: -0.8 },
  P4: { only: ["station"], state: "fault", az: -0.3 },
  P5: { only: ["overload", "contactor"], az: 0.9, el: 0.9 },
  W1: { only: ["mcb", "plc"], az: 0.4 },
  W2: { only: ["terminals"], az: 1.1, el: 0.45 },
  W3: { only: ["mcb"], az: -0.9 },
  W4: { only: ["plc", "io"], az: 1.0, el: 0.5, state: "run" },
  W5: { only: ["contactor"], az: -0.3, el: 0.22, state: "run" },
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
