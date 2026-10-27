import type { RigId } from "@/data/curriculum";
import { motorStarter } from "./motorStarter";
import { reversing, starDelta } from "./starters";
import type { RigDef } from "./types";

/** Every rig that is built. A lesson on a rig missing here stays planned. */
export const RIGS: Partial<Record<RigId, RigDef>> = {
  "motor-starter": motorStarter,
  "star-delta": starDelta,
  reversing,
};

export const rigFor = (id: RigId | undefined): RigDef => (id && RIGS[id]) || motorStarter;
