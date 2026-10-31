"use client";

import { useSim } from "@/store/sim";
import { Decal, RBox, RCyl } from "@/components/stage/pbr";
import { BasePlate, K, Led, MotorModel, Part, PilotLamp, Plc, PushButton, RigRoot, Station, useShown } from "./kit";

const BEIGE = "#d8cfb8";

/** An S5-era rack: beige cards, a CPU with its run lamp. */
function OldRack() {
  const failed = useSim((s) => Boolean(s.faults.oldFail));
  const motor = useSim((s) => Boolean(s.physical.oldMotor));
  return (
    <Part id="old">
      <group position={[-3.6, 0.12, -2.2]}>
        <RBox size={[2.6, 1.8, 0.7]} position={[0, 1.1, 0]} radius={0.04} kind="paint" color="#a9a28f" />
        {Array.from({ length: 7 }, (_, i) => (
          <RBox key={i} size={[0.3, 1.5, 0.12]} position={[-1.05 + i * 0.35, 1.1, 0.4]} radius={0.02} kind="plastic" color={i === 0 ? "#8a8473" : BEIGE} />
        ))}
        <Led on={!failed} color="#3ee08a" position={[-1.05, 1.6, 0.48]} />
        <Led on={failed} color="#ff4f4f" position={[-1.05, 1.45, 0.48]} />
        <Led on={motor && !failed} color="#ffb020" position={[-0.35, 1.6, 0.48]} />
        <Decal text="S5 · 1990" position={[0, 2.12, 0.2]} width={0.9} height={0.14} color="#3a4047" weight={800} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
    </Part>
  );
}

function Changeover() {
  const pos = useSim((s) => Number(s.physical.cutover ?? 0));
  return (
    <Part id="cutover">
      <group position={[0, 0.12, -2.2]}>
        <RBox size={[1.2, 1.6, 0.4]} position={[0, 0.8, 0]} radius={0.04} kind="paint" color={K.enclosure} />
        <group position={[0, 1.2, 0.22]} rotation={[0, 0, (1 - pos) * 0.8]}>
          <RCyl r={0.22} h={0.1} rotation={[Math.PI / 2, 0, 0]} kind="plastic" color="#2b3036" />
          <RBox size={[0.08, 0.36, 0.1]} position={[0, 0, 0.06]} radius={0.02} kind="plastic" color="#f2f4f6" />
        </group>
        <Decal text="0 OLD   1 SHADOW   2 NEW" position={[0, 0.75, 0.21]} width={1.05} height={0.1} color="#3a4047" weight={800} rotation={[0, 0, 0]} />
      </group>
    </Part>
  );
}

export function LegacyRig({ only }: { only?: string[] | null }) {
  const station = useShown("station");
  const guardOpen = useSim((s) => Boolean(s.physical.guardOpen));
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />
      <OldRack />
      <Changeover />
      <Part id="new">
        <Plc position={[3.8, 0.12, -2.4]} inputs={["Start_PB", "Stop_PB", "Guard_OK", "Old_Motor", "Old_Lamp", "Old_Healthy"]} outputs={["Motor_Run", "Run_Lamp"]} model="CPU 1516 · NEW" />
      </Part>
      <Part id="motor">
        <group position={[1.6, 0.12, 1.0]} scale={0.5}>
          <MotorModel speedKey="speed" label="M1  5.5 KW  CONVEYOR" />
        </group>
      </Part>
      <Station position={[-3.4, 0, 3.15]} w={3.6} d={1.5}>
        {station && <PilotLamp tag="Run_Lamp" position={[1.2, 0, -0.42]} color="#39d27f" label="RUN" />}
      </Station>
      <PushButton part="start" position={[-4.4, 0, 3.2]} color={K.green} label="START" />
      <PushButton part="stop" position={[-3.7, 0, 3.2]} color={K.red} label="STOP" />
      <Part id="guard">
        <group position={[-3.0, 0, 3.2]}>
          <RBox size={[0.5, 0.3, 0.4]} position={[0, 1.25, 0]} radius={0.04} kind="plastic" color="#e3b505" />
          <RBox size={[0.4, 0.1, 0.1]} position={[guardOpen ? 0.35 : 0, 1.45, 0]} radius={0.02} kind="steel" color="#c9ced4" />
        </group>
      </Part>
    </RigRoot>
  );
}
