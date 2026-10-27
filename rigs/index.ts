import type { RigId } from "@/data/curriculum";
import { motorStarter } from "./motorStarter";
import { reversing, starDelta } from "./starters";
import { bottling, conveyor, sorting } from "./conveyors";
import { mixer, pumps, tank } from "./process";
import { lift, traffic } from "./sequences";
import { vsd } from "./vsd";
import type { RigDef } from "./types";

/** Every rig that is built. A lesson on a rig missing here stays planned. */
export const RIGS: Partial<Record<RigId, RigDef>> = {
  "motor-starter": motorStarter,
  "star-delta": starDelta,
  reversing,
  conveyor,
  sorting,
  bottling,
  tank,
  pumps,
  mixer,
  traffic,
  lift,
  vsd,
};

export const rigFor = (id: RigId | undefined): RigDef => (id && RIGS[id]) || motorStarter;
