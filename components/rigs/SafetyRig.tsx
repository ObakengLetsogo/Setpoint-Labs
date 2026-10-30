"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSim } from "@/store/sim";
import { Decal, RBox, RCyl } from "@/components/stage/pbr";
import { BasePlate, EStopButton, K, Led, Part, PilotLamp, Plc, PushButton, RigRoot, Station, useShown } from "./kit";

const YELLOW = "#e3b505";
const FENCE = { x0: -3.2, x1: 3.2, z0: -1.6, z1: 1.4, h: 2.6 };

/** A mesh fence panel between two posts. */
function Panel({ from, to }: { from: [number, number]; to: [number, number] }) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dz, dx);
  return (
    <group position={[(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]} rotation={[0, -ang, 0]}>
      <RBox size={[len, 0.06, 0.06]} position={[0, FENCE.h, 0]} radius={0.02} kind="paint" color={YELLOW} />
      <RBox size={[len, 0.06, 0.06]} position={[0, 0.25, 0]} radius={0.02} kind="paint" color={YELLOW} />
      <mesh position={[0, FENCE.h / 2 + 0.12, 0]}>
        <planeGeometry args={[len - 0.1, FENCE.h - 0.3]} />
        <meshStandardMaterial color="#3a4047" transparent opacity={0.28} side={THREE.DoubleSide} wireframe />
      </mesh>
    </group>
  );
}

function Post({ x, z }: { x: number; z: number }) {
  return <RBox size={[0.1, FENCE.h + 0.1, 0.1]} position={[x, (FENCE.h + 0.1) / 2, z]} radius={0.02} kind="paint" color={YELLOW} />;
}

/** The hazard: a turntable with an arm that turns with the drive's speed. */
function Machine() {
  const arm = useRef<THREE.Group>(null);
  useFrame(() => {
    if (arm.current) arm.current.rotation.y = Number(useSim.getState().physical.angle ?? 0);
  });
  return (
    <Part id="machine">
      <group position={[0, 0.12, -0.2]}>
        <RCyl r={0.9} h={0.5} position={[0, 0.25, 0]} kind="paint" color="#5a6470" fillet={0.05} />
        <group ref={arm} position={[0, 0.6, 0]}>
          <RCyl r={0.3} h={0.6} position={[0, 0.3, 0]} kind="paint" color={K.orange} fillet={0.05} />
          <RBox size={[2.0, 0.24, 0.3]} position={[0.9, 0.7, 0]} radius={0.06} kind="paint" color={K.orange} />
          <RBox size={[0.3, 0.5, 0.3]} position={[1.8, 0.45, 0]} radius={0.05} kind="steel" color="#c9ced4" />
        </group>
      </group>
    </Part>
  );
}

function Door() {
  const open = useSim((s) => Boolean(s.physical.doorOpen));
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y = THREE.MathUtils.damp(g.current.rotation.y, open ? -1.4 : 0, 6, dt);
  });
  return (
    <Part id="door">
      <group position={[1.0, 0, FENCE.z1]}>
        <group ref={g}>
          <group position={[0.75, 0, 0]}>
            <RBox size={[1.5, 0.06, 0.06]} position={[0, FENCE.h, 0]} radius={0.02} kind="paint" color={YELLOW} />
            <RBox size={[1.5, 0.06, 0.06]} position={[0, 0.25, 0]} radius={0.02} kind="paint" color={YELLOW} />
            <RBox size={[0.06, FENCE.h - 0.2, 0.06]} position={[0.72, FENCE.h / 2 + 0.12, 0]} radius={0.02} kind="paint" color={YELLOW} />
            <mesh position={[0, FENCE.h / 2 + 0.12, 0]}>
              <planeGeometry args={[1.4, FENCE.h - 0.3]} />
              <meshStandardMaterial color="#3a4047" transparent opacity={0.28} side={THREE.DoubleSide} wireframe />
            </mesh>
          </group>
        </group>
        {/* coded interlock switch on the post */}
        <RBox size={[0.16, 0.3, 0.12]} position={[2.42, 1.3, 0.08]} radius={0.03} kind="plastic" color={YELLOW} />
        <Led on={!open} color="#3ee08a" position={[2.42, 1.48, 0.15]} />
      </group>
    </Part>
  );
}

function Curtain() {
  const blocked = useSim((s) => Boolean(s.physical.handInCurtain));
  const color = blocked ? "#ff4f4f" : "#3ee08a";
  return (
    <Part id="curtain">
      <group position={[-2.0, 0, FENCE.z1]}>
        {[-0.75, 0.75].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <RBox size={[0.12, 1.9, 0.12]} position={[0, 1.15, 0]} radius={0.03} kind="plastic" color={YELLOW} />
            <RBox size={[0.04, 1.6, 0.02]} position={[x < 0 ? 0.07 : -0.07, 1.15, 0]} radius={0.01} kind="plastic" color="#2b3036" />
          </group>
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[0, 0.45 + i * 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 1.38, 6]} />
            <meshBasicMaterial color={color} transparent opacity={blocked ? 0.9 : 0.45} toneMapped={false} />
          </mesh>
        ))}
        {blocked && <RBox size={[0.18, 0.08, 0.5]} position={[0, 1.2, 0.2]} radius={0.04} kind="plastic" color="#d9a07a" />}
      </group>
    </Part>
  );
}

function SafetyPanel() {
  const out = useSim((s) => Boolean(s.physical.relayOut));
  const fault = useSim((s) => Boolean(s.physical.relayFault));
  const k1 = useSim((s) => Boolean(s.physical.k1));
  const k2 = useSim((s) => Boolean(s.physical.k2));
  return (
    <group position={[-3.2, 0, -2.6]}>
      <RBox size={[2.4, 2.6, 0.3]} position={[0.6, 1.5, -0.15]} radius={0.04} kind="paint" color="#d9dcdf" />
      <Part id="relay">
        <group position={[0, 2.3, 0.1]}>
          <RBox size={[0.5, 0.9, 0.4]} radius={0.04} kind="plastic" color={YELLOW} />
          <Led on={out} color="#3ee08a" position={[-0.12, 0.25, 0.21]} />
          <Led on={fault} color="#ff4f4f" position={[0.12, 0.25, 0.21]} />
          <Decal text="A1" position={[0, -0.25, 0.205]} width={0.2} height={0.1} color="#2b3036" weight={800} rotation={[0, 0, 0]} />
        </group>
      </Part>
      <Part id="contactors">
        {[
          [0.8, k1, "K1"],
          [1.4, k2, "K2"],
        ].map(([x, on, label]) => (
          <group key={label as string} position={[x as number, 2.2, 0.1]}>
            <RBox size={[0.45, 0.7, 0.4]} radius={0.04} kind="plastic" color="#e9ecef" />
            <RBox size={[0.2, 0.08, 0.04]} position={[0, on ? 0.05 : 0.15, 0.21]} radius={0.01} kind="plastic" color={on ? K.green : "#6b6f76"} />
            <Decal text={label as string} position={[0, -0.22, 0.205]} width={0.2} height={0.1} color="#2b3036" weight={800} rotation={[0, 0, 0]} />
          </group>
        ))}
      </Part>
      <Decal text="SAFETY" position={[0.6, 1.0, 0.01]} width={0.8} height={0.14} color="#3a4047" weight={800} rotation={[0, 0, 0]} />
    </group>
  );
}

export function SafetyRig({ only }: { only?: string[] | null }) {
  const station = useShown("station");
  const { x0, x1, z0, z1 } = FENCE;
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />
      {/* yellow and black floor marking around the cell */}
      <RBox size={[x1 - x0 + 0.4, 0.01, z1 - z0 + 0.4]} position={[0, 0.125, (z0 + z1) / 2]} radius={0.005} kind="paint" color="#e7d27a" />
      <RBox size={[x1 - x0, 0.012, z1 - z0]} position={[0, 0.13, (z0 + z1) / 2]} radius={0.005} kind="paint" color="#c9cdd2" />
      {[x0, -2.75, -1.25, 1.0, 2.5, x1].map((x) => (
        <Post key={x} x={x} z={z1} />
      ))}
      <Post x={x0} z={z0} />
      <Post x={x1} z={z0} />
      <Panel from={[x0, z0]} to={[x1, z0]} />
      <Panel from={[x0, z0]} to={[x0, z1]} />
      <Panel from={[x1, z0]} to={[x1, z1]} />
      <Panel from={[x0, z1]} to={[-2.75, z1]} />
      <Panel from={[-1.25, z1]} to={[1.0, z1]} />
      <Panel from={[2.5, z1]} to={[x1, z1]} />
      <Machine />
      <Door />
      <Curtain />
      <SafetyPanel />
      <Plc position={[3.8, 0.12, -2.6]} inputs={["ES_A", "ES_B", "Door_A", "Door_B", "LC_OSSD1", "LC_OSSD2", "K_FB", "Reset_PB"]} outputs={["Drive_Run", "Run_Lamp", "Safety_Lamp"]} model="CPU 1516F · SAFETY" />
      <Station position={[-3.1, 0, 3.15]} w={4.2} d={1.5}>
        {station && (
          <>
            <PilotLamp tag="Run_Lamp" position={[0.9, 0, -0.42]} color="#39d27f" label="RUN" />
            <PilotLamp tag="Safety_Lamp" position={[1.4, 0, -0.42]} color="#4f8dff" label="RESET" />
          </>
        )}
      </Station>
      <PushButton part="start" position={[-4.4, 0, 3.2]} color={K.green} label="START" />
      <PushButton part="stop" position={[-3.7, 0, 3.2]} color={K.red} label="STOP" />
      <PushButton part="reset" position={[-3.0, 0, 3.2]} color="#2457a6" label="RESET" />
      <EStopButton position={[-1.6, 0, 3.1]} />
    </RigRoot>
  );
}
