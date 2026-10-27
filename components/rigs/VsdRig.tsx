"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Cable, Decal, RBox, RCyl } from "@/components/stage/pbr";
import { useSim } from "@/store/sim";
import { BasePlate, K, Led, MotorModel, Part, PilotLamp, Plc, PushButton, RigRoot, Station, useShown } from "./kit";

const MOTOR = { x: 1.6, z: 1.0, scale: 0.8 };

function Drive() {
  const hz = useSim((s) => Number(s.physical.hz));
  const fault = useSim((s) => Number(s.physical.fault));
  const running = hz > 0.2;
  const text = fault === 1 ? "F001" : fault === 2 ? "F003" : `${hz.toFixed(1)} Hz`;
  return (
    <Part id="drive">
      <group position={[-0.6, 0, -2.6]}>
        <RBox size={[1.3, 2.4, 1.0]} position={[0, 1.2, 0]} radius={0.08} kind="paint" color="#2f3a46" />
        <RBox size={[1.0, 0.7, 0.04]} position={[0, 1.9, 0.51]} radius={0.04} kind="plastic" color="#1b2026" />
        <RBox size={[0.8, 0.28, 0.02]} position={[0, 2.02, 0.535]} radius={0.02} kind="lens" color="#0f1a14" />
        <Decal text={text} position={[0, 2.02, 0.548]} width={0.74} height={0.22} color={fault ? "#ff6b5a" : "#56e39a"} family="ui-monospace, Menlo, monospace" weight={700} rotation={[0, 0, 0]} />
        <Led on={!fault} color="#3ee08a" position={[-0.3, 1.72, 0.55]} />
        <Led on={running} color="#4da3ff" position={[0, 1.72, 0.55]} />
        <Led on={fault > 0} color="#ff4d4d" position={[0.3, 1.72, 0.55]} />
        {Array.from({ length: 6 }, (_, i) => (
          <RBox key={i} size={[0.9, 0.04, 0.02]} position={[0, 0.5 + i * 0.12, 0.51]} radius={0.01} kind="plastic" color="#1b2026" />
        ))}
        <Decal text="VSD  4 kW" position={[0, 2.41, 0]} width={0.8} height={0.14} color="#c9d2dc" weight={800} />
      </group>
    </Part>
  );
}

function Fan() {
  const rotor = useRef<THREE.Group>(null);
  useFrame(() => {
    if (rotor.current) rotor.current.rotation.x = -Number(useSim.getState().physical.fanAngle);
  });
  const hub = 1.42 * MOTOR.scale;
  return (
    <Part id="fan">
      <group position={[MOTOR.x + 2.15, hub, MOTOR.z]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.12, 1.12, 0.55, 64, 1, true]} />
          <meshStandardMaterial color="#9aa3ad" metalness={0.6} roughness={0.45} side={THREE.DoubleSide} />
        </mesh>
        {[-0.275, 0.275].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[1.12, 0.04, 12, 64]} />
            <meshStandardMaterial color="#7d868f" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[(i * Math.PI) / 2 + Math.PI / 4, 0, 0]}>
            <RBox size={[0.03, 1.1, 0.03]} position={[0.3, 0.55, 0]} radius={0.01} kind="steel" color="#aeb6bd" />
          </group>
        ))}
        <group ref={rotor} position={[0.05, 0, 0]}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <RCyl r={0.2} h={0.3} kind="steel" color="#c7cdd3" fillet={0.04} />
          </group>
          {Array.from({ length: 5 }, (_, i) => (
            <group key={i} rotation={[(i * Math.PI * 2) / 5, 0, 0]}>
              <RBox size={[0.06, 0.85, 0.32]} position={[0, 0.6, 0]} rotation={[0.35, 0, 0]} radius={0.02} kind="paint" color={K.orange} />
            </group>
          ))}
        </group>
        <RBox size={[0.4, hub - 0.2, 0.6]} position={[0, -(hub - 0.2) / 2 - 0.2, 0]} radius={0.04} kind="paint" color="#5b636c" />
      </group>
    </Part>
  );
}

/** Speed potentiometer knob that turns with its setting. */
function Pot() {
  const pot = useSim((s) => Number(s.physical.pot));
  return (
    <Part id="pot">
      <group position={[-2.2, 0, 3.2]}>
        <RCyl r={0.33} h={0.09} position={[0, 1.13, 0]} kind="steel" color="#d9dde1" fillet={0.035} />
        <group position={[0, 1.24, 0]} rotation={[0, -(pot - 0.5) * Math.PI * 1.5, 0]}>
          <RCyl r={0.22} h={0.16} kind="plastic" color="#2b3036" fillet={0.04} />
          <RBox size={[0.04, 0.02, 0.18]} position={[0, 0.09, 0.09]} radius={0.008} kind="plastic" color="#f2f4f6" />
        </group>
        <RBox size={[0.6, 0.02, 0.17]} position={[0, 1.1, 0.5]} radius={0.008} kind="plastic" color="#2b3036" />
        <Decal text="SPEED" position={[0, 1.112, 0.5]} width={0.48} height={0.11} color="#f2f4f6" letterSpacing={0.06} />
      </group>
    </Part>
  );
}

export function VsdRig({ only }: { only?: string[] | null }) {
  const station = useShown("station");
  const wiring = useShown("wiring");
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />
      <Drive />
      <Part id="motor">
        <group position={[MOTOR.x, 0, MOTOR.z]} scale={MOTOR.scale}>
          <MotorModel speedKey="hzNorm" label="4 kW  400 V  50 Hz" />
        </group>
      </Part>
      <Fan />
      <Plc position={[-3.8, 0.12, -2.6]} inputs={["Start_PB", "Stop_PB", "Drive_Ready", "Drive_Running", "Drive_Fault", "At_Speed", "Reset_PB"]} outputs={["Drive_Run", "Drive_Reset", "Fault_Lamp", "Run_Lamp"]} model="CPU 1214 · AI 2 AQ 2" />
      <Station position={[-3.3, 0, 3.15]} w={3.9} d={1.5}>
        {station && (
          <>
            <PilotLamp tag="Run_Lamp" position={[-1.1, 0, -0.42]} color="#39d27f" label="RUN" />
            <PilotLamp tag="Fault_Lamp" position={[-0.4, 0, -0.42]} color="#ff4f4f" label="FAULT" />
          </>
        )}
      </Station>
      <PushButton part="start" position={[-4.4, 0, 3.2]} color={K.green} label="START" />
      <PushButton part="stop" position={[-3.7, 0, 3.2]} color={K.red} label="STOP" />
      <PushButton part="reset" position={[-3.0, 0, 3.2]} color={K.blue} label="RESET" />
      <Pot />
      {wiring && (
        <>
          <Cable color="#3a4047" radius={0.09} points={[[-0.6, 0.3, -2.1], [0.2, 0.12, -1.3], [MOTOR.x - 0.12, 0.12, MOTOR.z - 1.0], [MOTOR.x - 0.12, 1.4, MOTOR.z - 0.75], [MOTOR.x - 0.12, 2.0, MOTOR.z - 0.3]]} />
          <Cable color="#3a4047" radius={0.06} points={[[-3.0, 1.2, -1.6], [-2.4, 0.12, -1.0], [-1.6, 0.12, -1.6], [-1.25, 1.0, -2.6]]} />
        </>
      )}
    </RigRoot>
  );
}
