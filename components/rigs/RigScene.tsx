"use client";

import type { ComponentType } from "react";
import type { RigId } from "@/data/curriculum";
import { MotorStarterRig, type RigPiece } from "@/components/stage/MotorStarterRig";
import { ReversingRig, StarDeltaRig } from "./StarterRigs";
import { BottlingRig, ConveyorRig, SortingRig } from "./ConveyorRigs";
import { MixerRig, PumpsRig, TankRig } from "./ProcessRigs";
import { LiftRig, TrafficRig } from "./SequenceRigs";
import { VsdRig } from "./VsdRig";
import { PneumaticRig } from "./PneumaticRig";
import { HmiRig } from "./HmiRig";
import { PidRig } from "./PidRig";
import { InstrumentRig } from "./InstrumentRig";
import { MccRig } from "./MccRig";
import { SafetyRig } from "./SafetyRig";
import { MineConveyorRig } from "./MineConveyorRig";

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
  traffic: TrafficRig as ComponentType<RigSceneProps>,
  lift: LiftRig as ComponentType<RigSceneProps>,
  vsd: VsdRig as ComponentType<RigSceneProps>,
  pickplace: PneumaticRig as ComponentType<RigSceneProps>,
  hmi: HmiRig as ComponentType<RigSceneProps>,
  pid: PidRig as ComponentType<RigSceneProps>,
  instruments: InstrumentRig as ComponentType<RigSceneProps>,
  mcc: MccRig as ComponentType<RigSceneProps>,
  safety: SafetyRig as ComponentType<RigSceneProps>,
  mineconv: MineConveyorRig as ComponentType<RigSceneProps>,
  dewater: PumpsRig as ComponentType<RigSceneProps>,
  ventfan: VsdRig as ComponentType<RigSceneProps>,
  hoist: LiftRig as ComponentType<RigSceneProps>,
};

export function RigScene({ id, only }: { id: RigId; only?: string[] }) {
  const Scene = RIG_SCENES[id] ?? MotorStarterRig;
  return <Scene only={only as RigPiece[]} />;
}
