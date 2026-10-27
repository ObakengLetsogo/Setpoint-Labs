"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Cable, Decal, RBox, RCyl, type V3 } from "@/components/stage/pbr";
import { useSim } from "@/store/sim";
import { LIFT, ROAD } from "@/rigs/sequences";
import { BasePlate, K, Led, Part, Plc, RigRoot, useBit, useShown } from "./kit";

/* --------------------------------------------------------------- traffic */

const ASPHALT = "#3a3f45";
const LANE_MAIN = -0.65; // left hand traffic heading +X keeps to -Z
const LANE_SIDE = -0.65; // heading -Z keeps to -X

function Lamp({ on, color, position, rotation }: { on: boolean; color: string; position: V3; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      <RCyl r={0.13} h={0.04} rotation={[Math.PI / 2, 0, 0]} kind="lens" color={on ? color : "#3c4148"} emissive={color} emissiveIntensity={on ? 12 : 0} fillet={0.01} />
      <RBox size={[0.32, 0.04, 0.16]} position={[0, 0.15, 0.06]} radius={0.01} kind="plastic" color="#1d2126" />
    </group>
  );
}

/** Three aspect signal head on a pole, facing `facing` (radians about Y; 0 faces +Z). */
function SignalHead({ position, facing, red, amber, green }: { position: V3; facing: number; red: string; amber: string; green: string }) {
  const r = useBit(red);
  const a = useBit(amber);
  const g = useBit(green);
  return (
    <group position={position}>
      <RCyl r={0.08} h={2.6} position={[0, 1.3, 0]} kind="paint" color="#4a5058" fillet={0.02} />
      <group position={[0, 2.85, 0]} rotation={[0, facing, 0]}>
        <RBox size={[0.42, 1.12, 0.3]} radius={0.05} kind="paint" color="#23272c" />
        <RBox size={[0.6, 1.3, 0.04]} position={[0, 0, -0.16]} radius={0.02} kind="paint" color="#2b3036" />
        <Lamp on={r} color="#ff3b30" position={[0, 0.34, 0.16]} />
        <Lamp on={a} color="#ffb020" position={[0, 0, 0.16]} />
        <Lamp on={g} color="#22d36b" position={[0, -0.34, 0.16]} />
      </group>
    </group>
  );
}

function Car({ axis, keyName, color }: { axis: "x" | "z"; keyName: string; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const v = Number(useSim.getState().physical[keyName] ?? 0);
    if (!ref.current) return;
    if (axis === "x") ref.current.position.set(v, 0, LANE_MAIN);
    else ref.current.position.set(LANE_SIDE, 0, v);
  });
  return (
    <group ref={ref}>
      <group rotation={[0, axis === "x" ? 0 : Math.PI / 2, 0]}>
        <RBox size={[1.2, 0.36, 0.62]} position={[0, 0.34, 0]} radius={0.12} kind="plasticGloss" color={color} />
        <RBox size={[0.66, 0.28, 0.56]} position={[-0.08, 0.62, 0]} radius={0.1} kind="lens" color="#2b3542" />
        {[-0.38, 0.38].flatMap((x) =>
          [-0.3, 0.3].map((z) => <RCyl key={`${x}${z}`} r={0.14} h={0.1} position={[x, 0.15, z]} rotation={[Math.PI / 2, 0, 0]} kind="rubber" color="#1b1f24" fillet={0.02} />),
        )}
        <RBox size={[0.04, 0.08, 0.14]} position={[0.6, 0.38, 0.2]} radius={0.01} kind="lens" color="#fff4d6" />
        <RBox size={[0.04, 0.08, 0.14]} position={[0.6, 0.38, -0.2]} radius={0.01} kind="lens" color="#fff4d6" />
      </group>
    </group>
  );
}

function Roads() {
  if (!useShown("plate")) return null;
  const dashes = (len: number) => Array.from({ length: Math.floor(len / 0.9) }, (_, i) => -len / 2 + 0.45 + i * 0.9);
  return (
    <group>
      <RBox size={[12.4, 0.03, ROAD.half * 2]} position={[0, 0.015, 0]} radius={0.01} kind="paint" color={ASPHALT} />
      <RBox size={[ROAD.half * 2, 0.03, 8.4]} position={[0, 0.016, 0]} radius={0.01} kind="paint" color={ASPHALT} />
      {dashes(12).filter((x) => Math.abs(x) > ROAD.half + 0.2).map((x) => (
        <RBox key={`m${x}`} size={[0.45, 0.01, 0.06]} position={[x, 0.035, 0]} radius={0.003} kind="paint" color="#e9edf2" />
      ))}
      {dashes(8).filter((z) => Math.abs(z) > ROAD.half + 0.2).map((z) => (
        <RBox key={`s${z}`} size={[0.06, 0.01, 0.45]} position={[0, 0.036, z]} radius={0.003} kind="paint" color="#e9edf2" />
      ))}
      <RBox size={[0.1, 0.01, ROAD.half]} position={[ROAD.stopMain + 0.6, 0.036, -ROAD.half / 2]} radius={0.003} kind="paint" color="#ffffff" />
      <RBox size={[ROAD.half, 0.01, 0.1]} position={[-ROAD.half / 2, 0.036, ROAD.stopSide - 0.6]} radius={0.003} kind="paint" color="#ffffff" />
      {Array.from({ length: 6 }, (_, i) => (
        <RBox key={`z${i}`} size={[0.8, 0.01, 0.24]} position={[ROAD.stopMain + 1.25, 0.037, -ROAD.half + 0.22 + i * 0.43]} radius={0.003} kind="paint" color="#f2f4f6" />
      ))}
    </group>
  );
}

function PedPole() {
  const walk = useBit("Walk");
  const dont = useBit("Dont_Walk");
  const pressed = useSim((s) => Boolean(s.physical.pedPressed));
  return (
    <>
      <Part id="pedsig">
        <group position={[ROAD.stopMain + 1.25, 0, -ROAD.half - 0.5]}>
          <RCyl r={0.07} h={2.3} position={[0, 1.15, 0]} kind="paint" color="#4a5058" fillet={0.02} />
          <group position={[0, 2.45, 0]}>
            <RBox size={[0.4, 0.75, 0.26]} radius={0.05} kind="paint" color="#23272c" />
            <Lamp on={dont} color="#ff3b30" position={[0, 0.17, 0.14]} />
            <Lamp on={walk} color="#22d36b" position={[0, -0.17, 0.14]} />
          </group>
        </group>
      </Part>
      <Part id="ped">
        <group position={[ROAD.stopMain + 1.25, 0, -ROAD.half - 0.5]}>
          <group
            position={[0, 1.15, 0.1]}
            onPointerDown={(e) => {
              e.stopPropagation();
              useSim.getState().press("ped", true);
              useSim.getState().select("ped");
            }}
          >
            <RBox size={[0.3, 0.42, 0.16]} radius={0.04} kind="paint" color="#e0a526" />
            <RCyl r={0.08} h={0.05} position={[0, -0.06, 0.09]} rotation={[Math.PI / 2, 0, 0]} kind="plastic" color={pressed ? "#ff3b30" : "#2b3036"} fillet={0.01} />
            <Decal text="WAIT" position={[0, 0.12, 0.081]} width={0.22} height={0.07} color="#1b2430" weight={800} rotation={[0, 0, 0]} />
          </group>
        </group>
      </Part>
    </>
  );
}

export function TrafficRig({ only }: { only?: string[] | null }) {
  const loop = useSim((s) => Math.abs(Number(s.physical.sideCar) - ROAD.stopSide) < 0.05);
  const loopShown = useShown("loop");
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />
      <Roads />
      <Part id="main">
        <SignalHead position={[ROAD.stopMain + 0.4, 0, -ROAD.half - 0.5]} facing={-Math.PI / 2} red="Main_Red" amber="Main_Amber" green="Main_Green" />
      </Part>
      <Part id="side">
        <SignalHead position={[-ROAD.half - 0.5, 0, ROAD.stopSide - 0.4]} facing={0} red="Side_Red" amber="Side_Amber" green="Side_Green" />
      </Part>
      <PedPole />
      {loopShown && (
        <Part id="loop">
          <group position={[LANE_SIDE, 0.04, ROAD.stopSide + 0.55]}>
            <RBox size={[0.9, 0.012, 0.9]} radius={0.003} kind="paint" color={loop ? "#ffb020" : "#5c636b"} emissive="#ffb020" emissiveIntensity={loop ? 0.6 : 0} />
            <RBox size={[0.78, 0.014, 0.78]} radius={0.003} kind="paint" color={ASPHALT} />
          </group>
        </Part>
      )}
      <Car axis="x" keyName="mainCar" color="#2457a6" />
      <Car axis="z" keyName="sideCar" color="#d23c3c" />
      <Plc position={[4.2, 0.12, -3.0]} inputs={["Ped_PB", "Car_Wait", "Night_Sw"]} outputs={["Main_Red", "Main_Amber", "Main_Green", "Side_Red", "Side_Amber", "Side_Green", "Walk", "Dont_Walk"]} model="STREET CONTROLLER" />
      <Part id="night">
        <group position={[5.6, 0, -1.6]}>
          <RBox size={[0.5, 1.2, 0.5]} position={[0, 0.6, 0]} radius={0.06} kind="paint" color="#9aa3ad" />
          <RCyl r={0.1} h={0.06} position={[0, 1.0, 0.26]} rotation={[Math.PI / 2, 0, 0]} kind="brass" color="#c9a55e" fillet={0.01} />
        </group>
      </Part>
    </RigRoot>
  );
}

/* ------------------------------------------------------------------ lift */

const SHAFT = { w: 2.4, d: 2.0, floors: 3 };
const TOP_Y = (SHAFT.floors - 1) * LIFT.floorH + 2.2;

function LiftCar() {
  const car = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const ropes = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = useSim.getState().physical;
    const y = Number(p.carY) * LIFT.floorH + 0.16;
    const d = Number(p.door);
    if (car.current) car.current.position.y = y;
    if (left.current) left.current.position.x = -0.42 - d * 0.42;
    if (right.current) right.current.position.x = 0.42 + d * 0.42;
    if (ropes.current) {
      const len = TOP_Y - (y + 1.5);
      ropes.current.scale.y = Math.max(0.01, len);
      ropes.current.position.y = y + 1.5 + len / 2;
    }
  });
  return (
    <>
      <Part id="car">
        <group ref={car}>
          <RBox size={[1.9, 1.5, 1.7]} position={[0, 0.75, 0]} radius={0.06} kind="brushed" color={K.alu} />
          <RBox size={[1.95, 0.1, 1.75]} position={[0, 1.52, 0]} radius={0.03} kind="paint" color="#4a5058" />
          <RBox size={[1.7, 1.3, 0.02]} position={[0, 0.72, 0.86]} radius={0.01} kind="paint" color="#1b1f24" />
        </group>
      </Part>
      <Part id="doors">
        <DoorPanels left={left} right={right} />
      </Part>
      <mesh ref={ropes} position={[0, 4, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1, 8]} />
        <meshStandardMaterial color="#8a9098" metalness={0.8} roughness={0.4} />
      </mesh>
    </>
  );
}

/** Door panels ride with the car; their own refs slide them apart. */
function DoorPanels({ left, right }: { left: React.RefObject<THREE.Group | null>; right: React.RefObject<THREE.Group | null> }) {
  const holder = useRef<THREE.Group>(null);
  useFrame(() => {
    if (holder.current) holder.current.position.y = Number(useSim.getState().physical.carY) * LIFT.floorH + 0.16;
  });
  return (
    <group ref={holder}>
      <group ref={left} position={[-0.42, 0, 0]}>
        <RBox size={[0.84, 1.3, 0.05]} position={[0, 0.72, 0.9]} radius={0.015} kind="brushed" color="#d5dade" />
      </group>
      <group ref={right} position={[0.42, 0, 0]}>
        <RBox size={[0.84, 1.3, 0.05]} position={[0, 0.72, 0.9]} radius={0.015} kind="brushed" color="#d5dade" />
      </group>
    </group>
  );
}

function CallButton({ n }: { n: number }) {
  const id = `call${n}`;
  const pressed = useSim((s) => Boolean(s.physical[id]));
  return (
    <Part id={id}>
      <group position={[-1.6, (n - 1) * LIFT.floorH + 1.0, SHAFT.d / 2 + 0.2]}>
        <RBox size={[0.26, 0.42, 0.08]} radius={0.03} kind="brushed" color="#c7cdd3" />
        <group
          onPointerDown={(e) => {
            e.stopPropagation();
            useSim.getState().press(id, true);
            useSim.getState().select(id);
          }}
        >
          <RCyl r={0.08} h={0.05} position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]} kind="lens" color={pressed ? "#3ee08a" : "#e9edf2"} emissive="#3ee08a" emissiveIntensity={pressed ? 8 : 0} fillet={0.01} />
        </group>
        <Decal text={String(n)} position={[0, 0.15, 0.041]} width={0.12} height={0.1} color="#1b2430" weight={800} rotation={[0, 0, 0]} />
      </group>
    </Part>
  );
}

function FloorSensors() {
  const y = useSim((s) => Number(s.physical.carY));
  return (
    <Part id="sensors">
      <group position={[SHAFT.w / 2 + 0.05, 0, -SHAFT.d / 2 + 0.2]}>
        {[0, 1, 2].map((n) => (
          <group key={n} position={[0, n * LIFT.floorH + 0.75, 0]}>
            <RBox size={[0.16, 0.24, 0.16]} radius={0.03} kind="plastic" color="#2b3036" />
            <Led on={Math.abs(y - n) < 0.03} color="#ffb020" position={[0.09, 0.06, 0]} />
          </group>
        ))}
      </group>
    </Part>
  );
}

export function LiftRig({ only }: { only?: string[] | null }) {
  const shaft = useShown("plate");
  const wiring = useShown("wiring");
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />
      {shaft && (
        <group>
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => <RBox key={`${sx}${sz}`} size={[0.14, TOP_Y, 0.14]} position={[(sx * SHAFT.w) / 2, TOP_Y / 2, (sz * SHAFT.d) / 2]} radius={0.03} kind="paint" color="#5b636c" />),
          )}
          {[0, 1, 2].map((n) => (
            <group key={n}>
              <RBox size={[2.2, 0.14, 2.4]} position={[-SHAFT.w / 2 - 1.15, n * LIFT.floorH + 0.07, 0]} radius={0.03} kind="paint" color="#c9ced3" />
              <Decal text={`FLOOR ${n + 1}`} position={[-SHAFT.w / 2 - 1.15, n * LIFT.floorH + 0.145, 0.8]} width={0.9} height={0.14} color="#4d535b" weight={800} />
              {n > 0 && <RBox size={[0.08, 0.08, 2.4]} position={[-SHAFT.w / 2 - 2.2, n * LIFT.floorH - 0.3, 0]} radius={0.02} kind="paint" color="#5b636c" />}
            </group>
          ))}
          {[1, 2].map((n) => (
            <RBox key={`leg${n}`} size={[0.12, n * LIFT.floorH, 0.12]} position={[-SHAFT.w / 2 - 2.2, (n * LIFT.floorH) / 2, n === 1 ? -1.1 : 1.1]} radius={0.02} kind="paint" color="#5b636c" />
          ))}
        </group>
      )}
      <Part id="hoist">
        <group position={[0, TOP_Y, 0]}>
          <RBox size={[SHAFT.w + 0.3, 0.16, SHAFT.d + 0.3]} position={[0, 0.08, 0]} radius={0.03} kind="paint" color="#4a5058" />
          <group position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
            <RCyl r={0.32} h={1.0} kind="steel" color="#aeb6bd" fillet={0.04} />
          </group>
          <RBox size={[0.7, 0.55, 0.6]} position={[0.95, 0.43, 0]} radius={0.06} kind="paint" color="#3e5f86" />
        </group>
      </Part>
      <LiftCar />
      {[1, 2, 3].map((n) => (
        <CallButton key={n} n={n} />
      ))}
      <FloorSensors />
      <Plc position={[3.8, 0.12, -2.2]} inputs={["Call_1", "Call_2", "Call_3", "Floor_1", "Floor_2", "Floor_3", "Door_Closed", "Door_Opened"]} outputs={["Motor_Up", "Motor_Down", "Door_Open", "Door_Close"]} />
      {wiring && <Cable color="#3a4047" radius={0.07} points={[[2.6, 1.0, -2.2], [2.0, 0.15, -1.6], [1.4, 0.15, -1.2], [1.3, 1.0, -1.1], [1.3, TOP_Y, -1.1]]} />}
    </RigRoot>
  );
}
