"use client";

import type { ComponentType } from "react";
import type { RigId } from "@/data/curriculum";
import { MotorStarterRig, type RigPiece } from "@/components/stage/MotorStarterRig";

export type RigSceneProps = { only?: RigPiece[] | string[] };

/** The 3D model for each built rig. */
export const RIG_SCENES: Partial<Record<RigId, ComponentType<RigSceneProps>>> = {
  "motor-starter": MotorStarterRig as ComponentType<RigSceneProps>,
};

export function RigScene({ id, only }: { id: RigId; only?: string[] }) {
  const Scene = RIG_SCENES[id] ?? MotorStarterRig;
  return <Scene only={only as RigPiece[]} />;
}
