"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSim } from "@/store/sim";
import { Decal, RBox, RCyl } from "@/components/stage/pbr";
import { BasePlate, BeaconModel, K, Part, PilotLamp, Plc, PushButton, RigRoot, Station, useShown } from "./kit";

type V3 = [number, number, number];
const YELLOW = "#e3b505";
const ORE = "#6e5a48";
const LUMPS = 14;

/**
 * A troughed belt conveyor between two points, with ore lumps that ride along it at the belt's
 * speed and show its load, and a yellow pull-wire along one side.
 */
function Belt({ from, to, speedKey, loadKey, pulledKey, label }: { from: V3; to: V3; speedKey: string; loadKey: string; pulledKey: string; label: string }) {
  const d = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const len = d.length();
  const yaw = Math.atan2(-d.z, d.x);
  const pitch = Math.asin(d.y / len);
  const lumps = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const pulled = useSim((s) => Boolean(s.physical[pulledKey]));
  useFrame((_, dt) => {
    const { physical } = useSim.getState();
    const speed = Number(physical[speedKey] ?? 0);
    const load = Number(physical[loadKey] ?? 0);
    phase.current = (phase.current + (speed * dt) / 4) % 1;
    lumps.current?.children.forEach((c, i) => {
      const u = (i / LUMPS + phase.current) % 1;
      c.position.x = -len / 2 + u * len;
      c.visible = load > (i % 7) / 7;
    });
  });
  return (
    <group position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]} rotation={[0, yaw, 0]}>
      <group rotation={[0, 0, pitch]}>
        {/* stringers, belt and idlers */}
        {[-0.38, 0.38].map((z) => (
          <RBox key={z} size={[len, 0.12, 0.06]} position={[0, -0.1, z]} radius={0.02} kind="paint" color="#4d535b" />
        ))}
        <RBox size={[len, 0.04, 0.66]} position={[0, 0, 0]} radius={0.015} kind="rubber" color="#24282d" />
        {Array.from({ length: Math.floor(len / 0.6) }, (_, i) => (
          <RCyl key={i} r={0.05} h={0.7} position={[-len / 2 + 0.3 + i * 0.6, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]} kind="steel" color="#aeb6bd" />
        ))}
        <RCyl r={0.16} h={0.74} position={[-len / 2, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]} kind="paint" color="#3a4047" />
        <RCyl r={0.2} h={0.74} position={[len / 2, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]} kind="paint" color={K.blue} />
        <group ref={lumps}>
          {Array.from({ length: LUMPS }, (_, i) => (
            <mesh key={i} position={[0, 0.09, ((i * 37) % 5) * 0.08 - 0.16]} rotation={[i, i * 0.7, 0]}>
              <dodecahedronGeometry args={[0.08 + (i % 3) * 0.02, 0]} />
              <meshStandardMaterial color={ORE} roughness={0.95} />
            </mesh>
          ))}
        </group>
        {/* pull-wire along the walkway side */}
        <mesh position={[0, 0.3, 0.55]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, len, 6]} />
          <meshStandardMaterial color={pulled ? "#d23c3c" : YELLOW} />
        </mesh>
        {[-len / 2 + 0.5, len / 2 - 0.5].map((x) => (
          <RBox key={x} size={[0.2, 0.26, 0.14]} position={[x, 0.3, 0.58]} radius={0.03} kind="plastic" color={pulled ? "#d23c3c" : YELLOW} />
        ))}
        <Decal text={label} position={[0, -0.1, 0.42]} width={0.6} height={0.14} color="#f2f4f6" weight={800} rotation={[0, 0, 0]} />
      </group>
    </group>
  );
}

function FeederCrusher() {
  const jaw = useRef<THREE.Group>(null);
  useFrame((state) => {
    const cr = Number(useSim.getState().physical.cr ?? 0);
    if (jaw.current) jaw.current.rotation.z = Math.sin(state.clock.elapsedTime * 12 * cr) * 0.06 * cr;
  });
  const trip = useSim((s) => Boolean(s.physical.crTrip));
  return (
    <Part id="feeder">
      <group position={[-4.2, 0, -1.4]}>
        {/* hopper and vibrating feeder */}
        <RBox size={[1.6, 0.9, 1.4]} position={[0, 3.3, 0]} radius={0.05} kind="paint" color="#8a9097" />
        <RBox size={[1.2, 0.2, 1.0]} position={[0.5, 2.7, 0]} radius={0.04} kind="paint" color="#5a6470" />
        {/* jaw crusher */}
        <RBox size={[1.6, 1.6, 1.4]} position={[0.6, 1.5, 0]} radius={0.08} kind="paint" color={trip ? "#a33" : "#d9a521"} />
        <group ref={jaw} position={[0.6, 1.5, 0.72]}>
          <RBox size={[0.8, 1.0, 0.06]} radius={0.02} kind="steel" color="#7a828a" />
        </group>
        <RCyl r={0.45} h={0.2} position={[0.6, 1.6, -0.8]} rotation={[Math.PI / 2, 0, 0]} kind="steel" color="#5a6470" />
        <Decal text="CRUSHER  250 kW" position={[0.6, 2.32, 0.4]} width={1.1} height={0.14} color="#2b3036" weight={800} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
    </Part>
  );
}

function Stockpile() {
  const stock = useSim((s) => Number(s.physical.stock ?? 0));
  const h = 0.3 + Math.min(1.6, stock / 60);
  return (
    <mesh position={[4.9, 0.12 + h / 2, 2.6]}>
      <coneGeometry args={[h * 1.1, h, 24]} />
      <meshStandardMaterial color={ORE} roughness={1} />
    </mesh>
  );
}

export function MineConveyorRig({ only }: { only?: string[] | null }) {
  const station = useShown("station");
  const chute = useSim((s) => Number(s.physical.chute ?? 0));
  return (
    <RigRoot only={only}>
      <BasePlate w={13.2} d={8.8} />
      <FeederCrusher />
      <Part id="cv01">
        <Belt from={[-3.2, 0.9, -1.4]} to={[1.1, 2.6, -0.4]} speedKey="c1" loadKey="ore1" pulledKey="pw1Pulled" label="CV01" />
      </Part>
      <Part id="chute">
        <group position={[1.4, 2.0, -0.2]}>
          <RBox size={[0.8, 1.0, 0.8]} radius={0.04} kind="paint" color={chute >= 1 ? "#a33" : "#8a9097"} />
          <RBox size={[0.6, 0.6 * Math.min(1, chute), 0.6]} position={[0, -0.3 + 0.3 * Math.min(1, chute), 0.21]} radius={0.02} kind="plastic" color={ORE} />
          <RBox size={[0.12, 0.3, 0.12]} position={[0.46, 0.3, 0]} radius={0.02} kind="plastic" color={YELLOW} />
        </group>
      </Part>
      <Part id="cv02">
        <Belt from={[1.6, 1.6, 0.0]} to={[4.6, 2.2, 2.4]} speedKey="c2" loadKey="ore2" pulledKey="pw2Pulled" label="CV02" />
      </Part>
      <Stockpile />
      <group position={[0.2, 0.12, -2.6]}>
        <RBox size={[0.3, 2.4, 0.3]} position={[0, 1.2, 0]} radius={0.04} kind="paint" color={K.paint} />
        <group position={[0, 2.1, 0]}>
          <BeaconModel tag="Siren" color="#ff9f1a" />
        </group>
      </group>
      <Plc position={[4.2, 0.12, -2.6]} inputs={["PW_01", "PW_02", "Sway_01", "Sway_02", "Spd_01", "Spd_02", "Chute_Blk", "Cr_FB"]} outputs={["Siren", "CV02_Run", "CV01_Run", "Crusher_Run", "Feeder_Run", "Run_Lamp", "Fault_Lamp"]} model="CPU 1516 · ET 200 REMOTE I/O" />
      <Station position={[-3.4, 0, 3.15]} w={3.6} d={1.5}>
        {station && (
          <>
            <PilotLamp tag="Run_Lamp" position={[0.9, 0, -0.42]} color="#39d27f" label="RUN" />
            <PilotLamp tag="Fault_Lamp" position={[1.4, 0, -0.42]} color="#ff4f4f" label="TRIP" />
          </>
        )}
      </Station>
      <PushButton part="start" position={[-4.4, 0, 3.2]} color={K.green} label="START" />
      <PushButton part="stop" position={[-3.7, 0, 3.2]} color={K.red} label="STOP" />
      <PushButton part="reset" position={[-3.0, 0, 3.2]} color="#2457a6" label="RESET" />
    </RigRoot>
  );
}
