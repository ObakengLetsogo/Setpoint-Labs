import type { RigId } from "@/data/curriculum";
import { motorStarter } from "./motorStarter";
import { reversing, starDelta } from "./starters";
import { bottling, conveyor, sorting } from "./conveyors";
import { mixer, pumps, tank } from "./process";
import { lift, traffic } from "./sequences";
import { vsd } from "./vsd";
import { pickPlace } from "./pneumatics";
import { hmi } from "./hmi";
import { pid } from "./pid";
import { instruments } from "./instruments";
import { mcc } from "./mcc";
import { safety } from "./safety";
import { mineConveyor } from "./mineconv";
import { dewater, ventFan, winder } from "./minesvc";
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
  pickplace: pickPlace,
  hmi,
  pid,
  instruments,
  mcc,
  safety,
  mineconv: mineConveyor,
  dewater,
  ventfan: ventFan,
  hoist: winder,
};

export const rigFor = (id: RigId | undefined): RigDef => (id && RIGS[id]) || motorStarter;
