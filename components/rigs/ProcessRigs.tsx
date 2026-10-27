"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Cable, Decal, Dome, RBox, RCyl, type V3 } from "@/components/stage/pbr";
import { useSim } from "@/store/sim";
import { MIX, TANK, WELL } from "@/rigs/process";
import { BasePlate, BeaconModel, K, MotorModel, Part, PilotLamp, Plc, PushButton, RigRoot, Station, useShown } from "./kit";

const STEEL = "#cfd5db";

/** Stainless pipe along a path. */
function Pipe({ points, r = 0.09, color = STEEL }: { points: V3[]; r?: number; color?: string }) {
  return <Cable points={points} color={color} radius={r} kind="brushed" />;
}

/**
 * Vertical vessel with a glass body so the liquid shows. levelKey drives the liquid height,
 * color(s) gives its colour from the physical state.
 */
function Vessel({ r, h, levelKey, color, children }: { r: number; h: number; levelKey: string; color: (p: Record<string, number | boolean>) => string; children?: React.ReactNode }) {
  const liquid = useRef<THREE.Mesh>(null);
  const tint = useSim((s) => color(s.physical));
  useFrame(() => {
    const level = Math.max(0.001, Math.min(1, Number(useSim.getState().physical[levelKey] ?? 0)));
    if (liquid.current) {
      liquid.current.scale.y = level;
      liquid.current.position.y = 0.18 + ((h - 0.36) * level) / 2;
    }
  });
  return (
    <group>
      <RCyl r={r + 0.06} h={0.2} position={[0, 0.1, 0]} kind="brushed" color={STEEL} segments={48} fillet={0.04} />
      <RCyl r={r + 0.06} h={0.2} position={[0, h - 0.1, 0]} kind="brushed" color={STEEL} segments={48} fillet={0.04} />
      <Dome r={r + 0.06} squash={0.28} position={[0, h, 0]} kind="steel" color={STEEL} />
      <mesh ref={liquid} position={[0, 0.18, 0]}>
        <cylinderGeometry args={[r - 0.04, r - 0.04, h - 0.36, 48]} />
        <meshPhysicalMaterial color={tint} roughness={0.15} transmission={0} transparent opacity={0.88} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r, h - 0.36, 48, 1, true]} />
        <meshPhysicalMaterial color="#e8f2f8" roughness={0.05} metalness={0} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]}>
          <RBox size={[0.08, h - 0.2, 0.08]} position={[r + 0.03, h / 2, 0]} radius={0.02} kind="brushed" color={STEEL} />
        </group>
      ))}
      {children}
    </group>
  );
}

/** Solenoid valve on a horizontal pipe, axis along X. */
function Valve({ open, color = K.blue }: { open: boolean; color?: string }) {
  return (
    <group>
      <RBox size={[0.42, 0.3, 0.3]} radius={0.06} kind="brushed" color="#a9b1b9" />
      <RCyl r={0.14} h={0.36} position={[0, 0.32, 0]} kind="paint" color={color} fillet={0.04} />
      <RCyl r={0.06} h={0.05} position={[0, 0.52, 0]} kind="lens" color={open ? "#3ee08a" : "#59616b"} emissive="#3ee08a" emissiveIntensity={open ? 8 : 0} />
    </group>
  );
}

/** Float on a guide rod: rises with the level until it reaches its switching height. */
function Float({ at, levelKey, h }: { at: number; levelKey: string; h: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const level = Number(useSim.getState().physical[levelKey] ?? 0);
    const y = 0.18 + (h - 0.36) * Math.min(level, at + 0.03);
    if (ref.current) ref.current.position.y = Math.max(0.18 + (h - 0.36) * (at - 0.05), y);
  });
  return (
    <group ref={ref}>
      <RCyl r={0.1} h={0.16} kind="plastic" color={K.orange} fillet={0.04} />
    </group>
  );
}

/** Centrifugal pump with its motor, discharge pipe upwards. Origin at the base. */
function PumpSet({ speedKey }: { speedKey: string }) {
  return (
    <group>
      <RBox size={[2.3, 0.14, 1.0]} position={[0.2, 0.07, 0]} radius={0.04} kind="paint" color="#3e5f86" />
      <group position={[0.65, 0.14, 0]} scale={0.42}>
        <MotorModel speedKey={speedKey} label="4 kW" />
      </group>
      <group position={[-0.55, 0.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <RCyl r={0.42} h={0.36} kind="paint" color="#3e5f86" fillet={0.08} />
      </group>
      <RCyl r={0.12} h={0.6} position={[-0.55, 1.2, 0]} kind="brushed" color={STEEL} fillet={0.02} />
    </group>
  );
}

function AutoStation({ lamps, extra }: { lamps: [string, string, string][]; extra?: React.ReactNode }) {
  const station = useShown("station");
  return (
    <>
      <Station position={[-3.4, 0, 3.15]} w={3.6} d={1.5}>
        {station && lamps.map(([tag, color, label], i) => <PilotLamp key={tag} tag={tag} position={[-1.0 + i * 0.7, 0, -0.42]} color={color} label={label} />)}
      </Station>
      <PushButton part="start" position={[-4.4, 0, 3.2]} color={K.green} label="AUTO" />
      <PushButton part="stop" position={[-3.7, 0, 3.2]} color={K.red} label="STOP" />
      {extra}
    </>
  );
}

/* ------------------------------------------------------------------ tank */

const T = { x: 0.4, z: 0.2, r: 1.25, h: 4.0 };

export function TankRig({ only }: { only?: string[] | null }) {
  const open = useSim((s) => Number(s.physical.inflow) > 0);
  const floats = useShown("floats");
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />
      <Part id="tank">
        <group position={[T.x, 0.05, T.z]}>
          <Vessel r={T.r} h={T.h} levelKey="level" color={() => "#3d8fd6"} />
          <Decal text="T1  1000 L" position={[0, 0.21, T.r + 0.07]} width={0.9} height={0.12} color="#4d535b" weight={700} />
        </group>
      </Part>
      {floats && (
        <Part id="floats">
          <group position={[T.x + 0.7, 0.05, T.z]}>
            <RCyl r={0.025} h={T.h - 0.3} position={[0, T.h / 2, 0]} kind="steel" color={STEEL} fillet={0.005} />
            <Float at={TANK.low} levelKey="level" h={T.h} />
            <Float at={TANK.high} levelKey="level" h={T.h} />
          </group>
        </Part>
      )}
      <Part id="valve">
        <group position={[-1.4, T.h + 0.55, T.z]}>
          <Valve open={open} />
        </group>
        <Pipe points={[[-4.6, T.h + 0.55, T.z], [-1.65, T.h + 0.55, T.z]]} />
        <Pipe points={[[-1.15, T.h + 0.55, T.z], [T.x - 0.5, T.h + 0.55, T.z], [T.x - 0.5, T.h + 0.1, T.z]]} />
        {open && (
          <mesh position={[T.x - 0.5, T.h * 0.55, T.z]}>
            <cylinderGeometry args={[0.04, 0.04, T.h * 0.9, 8]} />
            <meshStandardMaterial color="#3d8fd6" transparent opacity={0.6} />
          </mesh>
        )}
      </Part>
      <RBox size={[0.2, T.h + 0.6, 0.2]} position={[-4.6, (T.h + 0.6) / 2, T.z]} radius={0.04} kind="brushed" color={K.aluDark} />
      <Part id="lt">
        <group position={[T.x - 0.6, T.h + 0.32, T.z + 0.6]}>
          <RCyl r={0.16} h={0.3} position={[0, 0.15, 0]} kind="steel" color={STEEL} fillet={0.03} />
          <RBox size={[0.36, 0.3, 0.3]} position={[0, 0.45, 0]} radius={0.05} kind="paint" color="#3e5f86" />
          <Decal text="LT1" position={[0, 0.61, 0]} width={0.26} height={0.12} color="#e9edf2" weight={800} />
        </group>
      </Part>
      <Part id="demand">
        <Pipe points={[[T.x, 0.3, T.z + T.r - 0.1], [T.x, 0.3, T.z + T.r + 0.5], [2.6, 0.3, T.z + T.r + 0.5], [4.9, 0.3, T.z + T.r + 0.5]]} />
        <group position={[2.6, 0.3, T.z + T.r + 0.5]}>
          <RBox size={[0.4, 0.3, 0.3]} radius={0.06} kind="brushed" color="#a9b1b9" />
          <RCyl r={0.04} h={0.4} position={[0, 0.3, 0]} kind="steel" color={STEEL} fillet={0.01} />
          <RBox size={[0.5, 0.05, 0.08]} position={[0, 0.5, 0]} radius={0.02} kind="plastic" color={K.red} />
        </group>
      </Part>
      <Plc position={[-3.8, 0.12, -2.6]} inputs={["Start_PB", "Stop_PB", "Float_Low", "Float_High"]} outputs={["Inlet_Valve", "Run_Lamp", "Alarm_Lamp"]} model="CPU 1214 · AI 2" />
      <AutoStation lamps={[["Run_Lamp", "#39d27f", "AUTO"], ["Alarm_Lamp", "#ff4f4f", "HIGH"]]} />
    </RigRoot>
  );
}

/* ----------------------------------------------------------------- pumps */

const WW = { x: 0.8, z: 0.4, r: 1.4, h: 3.0 };

export function PumpsRig({ only }: { only?: string[] | null }) {
  const floats = useShown("floats");
  const inflowOn = useSim((s) => Number(s.physical.inflow) > 0.02);
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />
      <Part id="well">
        <group position={[WW.x, 0.05, WW.z]}>
          <Vessel r={WW.r} h={WW.h} levelKey="level" color={() => "#6f8f86"} />
          <Decal text="WET WELL" position={[0, 0.21, WW.r + 0.07]} width={0.9} height={0.12} color="#4d535b" weight={700} />
        </group>
      </Part>
      {floats && (
        <Part id="floats">
          <group position={[WW.x - 0.5, 0.05, WW.z - 0.6]}>
            <RCyl r={0.025} h={WW.h - 0.3} position={[0, WW.h / 2, 0]} kind="steel" color={STEEL} fillet={0.005} />
            {[WELL.low, WELL.lead, WELL.lag, WELL.highHigh].map((at) => (
              <Float key={at} at={at} levelKey="level" h={WW.h} />
            ))}
          </group>
        </Part>
      )}
      <Part id="inflow">
        <Pipe points={[[-4.6, WW.h - 0.4, WW.z], [WW.x - 0.9, WW.h - 0.4, WW.z], [WW.x - 0.9, WW.h - 0.7, WW.z]]} r={0.12} color="#8e979f" />
        {inflowOn && (
          <mesh position={[WW.x - 0.9, WW.h * 0.45, WW.z]}>
            <cylinderGeometry args={[0.05, 0.05, WW.h * 0.75, 8]} />
            <meshStandardMaterial color="#6f8f86" transparent opacity={0.6} />
          </mesh>
        )}
      </Part>
      <RBox size={[0.22, WW.h - 0.2, 0.22]} position={[-4.6, (WW.h - 0.2) / 2, WW.z]} radius={0.04} kind="brushed" color={K.aluDark} />
      {(["p1", "p2"] as const).map((id, i) => (
        <Part key={id} id={id}>
          <group position={[3.5, 0, i === 0 ? -0.9 : 1.6]}>
            <PumpSet speedKey={`${id}Speed`} />
            <Decal text={id === "p1" ? "P1" : "P2"} position={[0.2, 0.145, 0.38]} width={0.3} height={0.14} color="#e9edf2" weight={800} />
          </group>
          <Pipe points={[[2.95, 0.62, i === 0 ? -0.9 : 1.6], [WW.x + 0.7, 0.62, i === 0 ? -0.4 : 1.2], [WW.x + 0.6, 0.3, WW.z + (i === 0 ? -0.3 : 0.3)]]} r={0.1} />
          <Pipe points={[[2.95, 1.5, i === 0 ? -0.9 : 1.6], [2.95, 2.4, i === 0 ? -0.9 : 1.6], [5.2, 2.4, i === 0 ? -0.9 : 1.6]]} r={0.1} />
        </Part>
      ))}
      <Part id="horn">
        <group position={[-1.4, 0, 2.8]}>
          <BeaconModel tag="Horn" color="#ff6a1a" />
        </group>
      </Part>
      <Plc position={[-3.8, 0.12, -2.6]} inputs={["Start_PB", "Stop_PB", "LS_Low", "LS_Lead", "LS_Lag", "LS_HighHigh", "P1_OK", "P2_OK"]} outputs={["P1_Run", "P2_Run", "Horn", "Alarm_Lamp"]} model="CPU 1214 · AI 2" />
      <AutoStation
        lamps={[["Alarm_Lamp", "#ff4f4f", "ALARM"]]}
        extra={<PushButton part="ack" position={[-3.0, 0, 3.2]} color="#2b3036" label="ACK" />}
      />
    </RigRoot>
  );
}

/* ----------------------------------------------------------------- mixer */

const MV = { x: 0.6, z: 0.4, r: 1.15, h: 3.6 };

function mixColor(p: Record<string, number | boolean>) {
  const a = new THREE.Color("#2f78d0");
  const b = new THREE.Color("#f0b429");
  const mixed = new THREE.Color("#3aa86b");
  const fa = Number(p.fracA ?? 0);
  const layered = a.clone().lerp(b, 1 - fa);
  return "#" + layered.lerp(mixed, Number(p.mixed ?? 0)).getHexString();
}

function Agitator() {
  const shaft = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (shaft.current) shaft.current.rotation.y += Number(useSim.getState().physical.agitator) * dt * 9;
  });
  return (
    <Part id="agitator">
      <group position={[MV.x, 0.9 + MV.h + 0.35, MV.z]}>
        <RBox size={[0.9, 0.12, 0.9]} position={[0, -0.1, 0]} radius={0.04} kind="brushed" color={STEEL} />
        <RCyl r={0.32} h={0.9} position={[0, 0.45, 0]} kind="paint" color="#3e5f86" fillet={0.06} />
        <Dome r={0.32} squash={0.4} position={[0, 0.9, 0]} kind="paint" color="#3e5f86" />
        <group ref={shaft}>
          <RCyl r={0.045} h={MV.h - 0.2} position={[0, -(MV.h - 0.2) / 2, 0]} kind="steel" color="#d5dade" fillet={0.01} />
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
              <RBox size={[0.7, 0.04, 0.16]} position={[0.35, -(MV.h - 0.75), 0]} rotation={[0.4, 0, 0]} radius={0.015} kind="steel" color="#c7cdd3" />
            </group>
          ))}
        </group>
      </group>
    </Part>
  );
}

export function MixerRig({ only }: { only?: string[] | null }) {
  const a = useSim((s) => s.running && Boolean(s.memory.Valve_A));
  const b = useSim((s) => s.running && Boolean(s.memory.Valve_B));
  const d = useSim((s) => s.running && Boolean(s.memory.Drain_Valve));
  const levels = useShown("levels");
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />
      <Part id="vessel">
        <group position={[MV.x, 0.9, MV.z]}>
          <Vessel r={MV.r} h={MV.h} levelKey="level" color={mixColor} />
        </group>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]} position={[MV.x, 0, MV.z]}>
            <RBox size={[0.14, 0.95, 0.14]} position={[MV.r - 0.1, 0.47, 0]} radius={0.03} kind="brushed" color={STEEL} />
          </group>
        ))}
      </Part>
      {levels && (
        <Part id="levels">
          {[MIX.low, MIX.mid, MIX.full].map((at) => (
            <group key={at} position={[MV.x + MV.r + 0.05, 0.9 + 0.18 + (MV.h - 0.36) * at, MV.z]} rotation={[0, 0, -Math.PI / 2]}>
              <RCyl r={0.08} h={0.3} kind="steel" color={STEEL} fillet={0.02} />
              <RCyl r={0.081} h={0.06} position={[0, 0.14, 0]} kind="plastic" color={K.orange} fillet={0.01} />
            </group>
          ))}
        </Part>
      )}
      <Agitator />
      <Part id="valveA">
        <Pipe points={[[-4.6, MV.h + 2.05, MV.z - 0.4], [MV.x - 0.6, MV.h + 2.05, MV.z - 0.4], [MV.x - 0.6, MV.h + 1.55, MV.z - 0.4]]} color="#7aa6d8" />
        <group position={[-0.9, MV.h + 2.05, MV.z - 0.4]}>
          <Valve open={a} color={K.blue} />
        </group>
      </Part>
      <RBox size={[0.2, MV.h + 2.1, 0.2]} position={[-4.6, (MV.h + 2.1) / 2, MV.z - 0.4]} radius={0.04} kind="brushed" color={K.aluDark} />
      <Part id="valveB">
        <Pipe points={[[5.2, MV.h + 2.05, MV.z - 0.4], [MV.x + 0.6, MV.h + 2.05, MV.z - 0.4], [MV.x + 0.6, MV.h + 1.55, MV.z - 0.4]]} color="#e3c27a" />
        <group position={[2.1, MV.h + 2.05, MV.z - 0.4]}>
          <Valve open={b} color="#c98a12" />
        </group>
      </Part>
      <RBox size={[0.2, MV.h + 2.1, 0.2]} position={[5.2, (MV.h + 2.1) / 2, MV.z - 0.4]} radius={0.04} kind="brushed" color={K.aluDark} />
      <Part id="drain">
        <Pipe points={[[MV.x, 0.95, MV.z], [MV.x, 0.45, MV.z], [MV.x, 0.45, MV.z + 1.2], [MV.x + 3.2, 0.45, MV.z + 1.2]]} />
        <group position={[MV.x, 0.45, MV.z + 1.2]}>
          <Valve open={d} color="#3a3f45" />
        </group>
      </Part>
      <Plc position={[-3.8, 0.12, -2.6]} inputs={["Start_PB", "Stop_PB", "LS_Low", "LS_Mid", "LS_Full"]} outputs={["Valve_A", "Valve_B", "Agitator", "Drain_Valve", "Done_Lamp"]} />
      <AutoStation lamps={[["Done_Lamp", "#39d27f", "DONE"]]} />
    </RigRoot>
  );
}
