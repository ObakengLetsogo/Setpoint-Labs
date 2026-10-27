"use client";

import type { ComponentType } from "react";
import type { RigId } from "@/data/curriculum";
import { MotorStarterRig, type RigPiece } from "@/components/stage/MotorStarterRig";
import { ReversingRig, StarDeltaRig } from "./StarterRigs";
import { BottlingRig, ConveyorRig, SortingRig } from "./ConveyorRigs";
import { MixerRig, PumpsRig, TankRig } from "./ProcessRigs";

export type RigSceneProps = { only?: RigPiece[] | string[] };

/** The 3D model for each built rig. */
export const RIG_SCENES: Partial<Record<RigId, ComponentType<RigSceneProps>>> = {
  "motor-starter": MotorStarterRig as ComponentType<RigSceneProps>,
  "star-delta": StarDeltaRig as ComponentType<RigSceneProps>,
  reversing: ReversingRig as ComponentType<RigSceneProps>,
  conveyor: ConveyorRig as ComponentType<RigSceneProps>,
  sorting: SortingRig as ComponentType<RigSceneProps>,
  bottling: BottlingRig as ComponentType<RigSceneProps>,
  tank: TankRig as ComponentType<RigSceneProps>,
  pumps: PumpsRig as ComponentType<RigSceneProps>,
  mixer: MixerRig as ComponentType<RigSceneProps>,
};

export function RigScene({ id, only }: { id: RigId; only?: string[] }) {
  const Scene = RIG_SCENES[id] ?? MotorStarterRig;
  return <Scene only={only as RigPiece[]} />;
}
