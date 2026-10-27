"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useSim } from "@/store/sim";
import { contactorClosed, partById, readInputs, type PartId } from "@/rigs/motorStarter";
import { Cable, Decal, Dome, GlowScope, RBox, RCyl, Screw, ScrewRow, type V3 } from "./pbr";
import { PlatePrint } from "./PlatePrint";

const C = {
  housing: "#e6e8ea",
  housingDark: "#33383e",
  cover: "#4a5058",
  enclosure: "#d9dcdf",
  zinc: "#c4cad0",
  alu: "#b4bbc2",
  aluDark: "#9ea6ae",
  paint: "#4a5058",
  print: "#f2f0ea",
  orange: "#f26b1d",
  green: "#22a061",
  red: "#d23c3c",
  yellow: "#f0bf22",
  blue: "#2457a6",
  brown: "#6b4425",
  black: "#23272c",
  grey: "#8a9098",
};

export type RigPiece = PartId | "station" | "plate" | "wiring";
const OnlyCtx = createContext<RigPiece[] | null>(null);
const useShown = (piece: RigPiece) => {
  const only = useContext(OnlyCtx);
  return !only || only.includes(piece);
};

function useExplodeY(offset: number) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const { exploded, settings } = useSim.getState();
    const target = exploded ? offset : 0;
    g.position.y = settings.reduceMotion ? target : THREE.MathUtils.damp(g.position.y, target, 5, dt);
  });
  return ref;
}

function Part({ id, children }: { id: PartId; children: ReactNode }) {
  const part = partById(id)!;
  const ref = useExplodeY(part.explode);
  const glow = useSim((s) => s.hovered === id || s.selected === id);
  const shown = useShown(id);
  const { select, hover } = useSim.getState();
  if (!shown) return null;
  return (
    <group
      ref={ref}
      name={`part-${id}`}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(id);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        hover(id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hover(null);
        document.body.style.cursor = "";
      }}
    >
      <GlowScope value={glow ? 1 : 0}>{children}</GlowScope>
    </group>
  );
}

function Explode({ offset, children }: { offset: number; children: ReactNode }) {
  const ref = useExplodeY(offset);
  return <group ref={ref}>{children}</group>;
}

function Led({ on, color = "#3ee08a", position }: { on: boolean; color?: string; position: V3 }) {
  return <RBox size={[0.13, 0.05, 0.09]} radius={0.02} position={position} kind="lens" color={on ? color : "#59616b"} emissive={color} emissiveIntensity={on ? 12 : 0} />;
}

/** A recessed screw clamp: dark pocket, brass screw, printed number. */
function Clamp({ position, label, labelZ = 0.17, kind = "brass" }: { position: V3; label?: string; labelZ?: number; kind?: "brass" | "zinc" }) {
  const [x, y, z] = position;
  return (
    <group>
      <RBox size={[0.17, 0.03, 0.17]} position={[x, y - 0.01, z]} radius={0.012} kind="plastic" color="#2a2e33" />
      <Screw position={[x, y + 0.005, z]} r={0.055} kind={kind} />
      {label && <Decal text={label} position={[x, y + 0.006, z + labelZ]} width={0.2} height={0.07} color="#4d535b" weight={700} />}
    </group>
  );
}

/* ---------------------------------------------------------------- plate */

function Plate() {
  if (!useShown("plate")) return null;
  return (
    <group>
      <RBox size={[12.6, 0.24, 8.6]} position={[0, -0.12, 0]} radius={0.1} kind="zinc" color="#b9bec3" />
      <PlatePrint />
      {[-5.95, 5.95].flatMap((x) => [-4.0, 4.0].map((z) => <Screw key={`${x}${z}`} position={[x, 0.015, z]} r={0.13} kind="zinc" />))}
    </group>
  );
}

function DinRail({ x, z, length }: { x: number; z: number; length: number }) {
  return (
    <group position={[x, 0, z]}>
      <RBox size={[length, 0.06, 0.5]} position={[0, 0.03, 0]} radius={0.012} kind="zinc" color={C.zinc} />
      <RBox size={[length, 0.12, 0.08]} position={[0, 0.1, -0.21]} radius={0.012} kind="zinc" color={C.zinc} />
      <RBox size={[length, 0.12, 0.08]} position={[0, 0.1, 0.21]} radius={0.012} kind="zinc" color={C.zinc} />
    </group>
  );
}

/** Slotted wiring duct. Fingers on both long faces, lid on top. */
function Duct({ x0, x1, z, depth = 0.5, height = 0.56, axis = "x" }: { x0: number; x1: number; z: number; depth?: number; height?: number; axis?: "x" | "z" }) {
  const len = x1 - x0;
  const mid = (x0 + x1) / 2;
  const slots = Math.floor(len / 0.3);
  const body = (
    <group>
      <RBox size={[len, height, depth]} position={[0, height / 2, 0]} radius={0.02} kind="plastic" color="#c3c8cd" />
      {Array.from({ length: slots }, (_, i) =>
        [-1, 1].map((side) => (
          <mesh key={`${i}${side}`} position={[-len / 2 + 0.15 + i * 0.3, height * 0.55, (side * depth) / 2 + side * 0.001]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
            <planeGeometry args={[0.07, height * 0.62]} />
            <meshStandardMaterial color="#7c838b" roughness={0.85} />
          </mesh>
        )),
      )}
      <RBox size={[len + 0.06, 0.05, depth + 0.07]} position={[0, height + 0.02, 0]} radius={0.02} kind="plastic" color="#d6dadf" />
    </group>
  );
  return axis === "x" ? <group position={[mid, 0, z]}>{body}</group> : <group position={[z, 0, mid]} rotation={[0, Math.PI / 2, 0]}>{body}</group>;
}

/* -------------------------------------------------------------- devices */

function TerminalCover({ width, z, count }: { width: number; z: number; count: number }) {
  return (
    <group position={[0, 0, z]}>
      <RBox size={[width, 0.1, 0.36]} position={[0, 1.43, 0]} radius={0.03} kind="plastic" color={C.cover} />
      <ScrewRow from={-width / 2 + 0.13} to={width / 2 - 0.13} y={1.495} z={0} count={count} r={0.045} kind="brass" />
    </group>
  );
}

function Breaker() {
  return (
    <Part id="mcb">
      <group position={[-4.6, 0.12, -2.2]}>
        <RBox size={[1.08, 1.3, 1.8]} position={[0, 0.65, 0]} radius={0.06} color={C.housing} />
        <RBox size={[1.0, 0.04, 0.62]} position={[0, 1.31, 0.02]} radius={0.015} color="#d4d8dc" />
        {[-0.33, 0, 0.33].map((dx) => (
          <group key={dx}>
            <RBox size={[0.24, 0.17, 0.34]} position={[dx, 1.39, -0.05]} radius={0.04} kind="plastic" color={C.housingDark} />
            <RBox size={[0.18, 0.02, 0.08]} position={[dx, 1.48, -0.14]} radius={0.008} kind="plastic" color={C.green} />
          </group>
        ))}
        <Decal text="Q1  C10" position={[-0.18, 1.335, 0.42]} width={0.56} height={0.15} />
        <Decal text="400 V~" position={[0.3, 1.335, 0.42]} width={0.36} height={0.11} color="#6b6f76" weight={600} />
        <ScrewRow from={-0.33} to={0.33} y={1.31} z={-0.74} count={3} kind="zinc" />
        <ScrewRow from={-0.33} to={0.33} y={1.31} z={0.74} count={3} kind="zinc" />
      </group>
    </Part>
  );
}

function Controller() {
  const running = useSim((s) => s.running);
  const hasError = useSim((s) => s.error !== null);
  return (
    <Part id="plc">
      <group position={[-3.0, 0.12, -2.2]}>
        <RBox size={[2.0, 1.38, 2.0]} position={[0, 0.69, 0]} radius={0.07} color={C.housing} />
        <TerminalCover width={1.9} z={-0.76} count={9} />
        <TerminalCover width={1.9} z={0.76} count={9} />
        <RBox size={[1.26, 0.04, 1.0]} position={[-0.27, 1.395, 0]} radius={0.02} kind="plastic" color={C.housingDark} />
        <RBox size={[0.07, 0.03, 0.9]} position={[-0.84, 1.42, 0]} radius={0.01} kind="plastic" color={C.orange} />
        <Decal text="SETPOINT" position={[-0.2, 1.42, -0.27]} width={0.9} height={0.16} color="#f3f1ec" family='"Arial Narrow", Arial, sans-serif' weight={800} letterSpacing={0.08} />
        <Decal text="PLC1  CPU 1214  DC/DC/DC" position={[-0.2, 1.42, -0.07]} width={0.95} height={0.08} color="#97a1ad" weight={600} />
        <RBox size={[0.68, 0.025, 0.24]} position={[-0.26, 1.42, 0.25]} radius={0.01} kind="lens" color="#141a20" />
        <Decal text={running ? "RUN" : "STOP"} position={[-0.26, 1.436, 0.25]} width={0.4} height={0.13} color={running ? "#45d483" : "#f5a524"} family="ui-monospace, Menlo, monospace" />
        <Led on={running} position={[0.6, 1.415, -0.3]} />
        <Led on={!running} color="#ffb020" position={[0.6, 1.415, -0.08]} />
        <Led on={hasError} color="#ff4d4d" position={[0.6, 1.415, 0.14]} />
        <Decal text={"RUN\nSTOP\nERROR"} position={[0.86, 1.4, -0.08]} width={0.3} height={0.6} color="#6b7078" align="left" weight={600} />
      </group>
    </Part>
  );
}

function SignalBoard() {
  const memory = useSim((s) => s.memory);
  const physical = useSim((s) => s.physical);
  const faults = useSim((s) => s.faults);
  const inputs = readInputs(physical, faults);
  const ins = ["Start_PB", "Stop_PB", "Overload_OK", "EStop_OK"].map((t) => Boolean(inputs[t]));
  const outs = ["Motor_Run", "Run_Lamp", "Fault_Lamp"].map((t) => Boolean(memory[t]));
  return (
    <Part id="io">
      <group position={[-1.4, 0.12, -2.2]}>
        <RBox size={[0.95, 1.38, 2.0]} position={[0, 0.69, 0]} radius={0.07} color={C.housing} />
        <TerminalCover width={0.86} z={-0.76} count={4} />
        <TerminalCover width={0.86} z={0.76} count={4} />
        <RBox size={[0.8, 0.04, 1.04]} position={[0, 1.395, 0]} radius={0.02} kind="plastic" color={C.housingDark} />
        <Decal text="DI   DQ" position={[0, 1.42, -0.43]} width={0.6} height={0.09} color="#97a1ad" weight={700} />
        {ins.map((on, i) => (
          <group key={`i${i}`}>
            <Led on={on} position={[-0.27, 1.415, -0.26 + i * 0.19]} />
            <Decal text={`.${i}`} position={[-0.13, 1.42, -0.26 + i * 0.19]} width={0.13} height={0.08} color="#97a1ad" />
          </group>
        ))}
        {outs.map((on, i) => (
          <group key={`q${i}`}>
            <Led on={on} color="#4da3ff" position={[0.08, 1.415, -0.26 + i * 0.19]} />
            <Decal text={`.${i}`} position={[0.22, 1.42, -0.26 + i * 0.19]} width={0.13} height={0.08} color="#97a1ad" />
          </group>
        ))}
      </group>
    </Part>
  );
}

function Contactor() {
  const closed = useSim((s) => s.running && contactorClosed(s.memory, s.physical));
  const flag = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (flag.current) flag.current.position.z = THREE.MathUtils.damp(flag.current.position.z, closed ? 0.06 : -0.06, 16, dt);
  });
  return (
    <Part id="contactor">
      <group position={[0.4, 0.12, -2.2]}>
        <RBox size={[1.0, 0.95, 1.72]} position={[0, 0.475, 0]} radius={0.06} color="#dfe2e5" />
        <RBox size={[0.84, 0.3, 1.02]} position={[0, 1.08, 0]} radius={0.07} kind="plastic" color="#eceef0" />
        {[-0.22, 0, 0.22].map((dx, i) => (
          <Clamp key={`l${dx}`} position={[dx, 0.96, -0.68]} label={["1L1", "3L2", "5L3"][i]} labelZ={0.16} />
        ))}
        <Clamp position={[-0.42, 0.96, -0.68]} label="A1" labelZ={0.16} kind="zinc" />
        <Clamp position={[0.42, 0.96, -0.68]} label="A2" labelZ={0.16} kind="zinc" />
        <RBox size={[0.13, 0.02, 0.05]} position={[-0.42, 0.985, -0.82]} radius={0.006} kind="plastic" color={C.blue} />
        <RBox size={[0.13, 0.02, 0.05]} position={[0.42, 0.985, -0.82]} radius={0.006} kind="plastic" color={C.blue} />
        <RBox size={[0.34, 0.03, 0.2]} position={[0, 1.24, -0.24]} radius={0.02} kind="plastic" color="#2a2e33" />
        <group ref={flag}>
          <RBox size={[0.24, 0.02, 0.08]} position={[0, 1.255, -0.24]} radius={0.01} kind="plastic" color={closed ? "#2fbf77" : "#e9ebee"} />
        </group>
        <RBox size={[0.34, 0.012, 0.2]} position={[0, 1.268, -0.24]} radius={0.01} kind="lens" color="#dfe9f0" />
        <group position={[0, 0, 0.24]}>
          <RBox size={[0.56, 0.16, 0.42]} position={[0, 1.31, 0]} radius={0.04} kind="plastic" color="#d4d8dc" />
          <Screw position={[-0.14, 1.395, 0.05]} r={0.045} kind="brass" />
          <Screw position={[0.14, 1.395, 0.05]} r={0.045} kind="brass" />
          <Decal text="13 NO 14" position={[0, 1.392, -0.12]} width={0.42} height={0.07} color="#4d535b" weight={700} />
        </group>
        <Decal text="K1" position={[-0.3, 1.232, 0.38]} width={0.18} height={0.11} />
        <Decal text="AC-3 9 A · 24 V DC" position={[0.12, 1.232, 0.42]} width={0.5} height={0.05} color="#6b6f76" weight={600} />
        {[-0.22, 0, 0.22].map((dx) => (
          <Screw key={`t${dx}`} position={[dx, 0.96, 0.66]} r={0.05} kind="brass" />
        ))}
      </group>
    </Part>
  );
}

function OverloadRelay() {
  const tripped = useSim((s) => s.physical.overloadTripped);
  const heat = useSim((s) => s.physical.heat);
  const w = 0.6 * Math.max(0.04, heat);
  return (
    <Part id="overload">
      <group position={[0.4, 0.12, -0.89]}>
        <RBox size={[0.92, 0.88, 1.1]} position={[0, 0.44, 0]} radius={0.06} kind="plastic" color="#3d434a" />
        {[-0.22, 0, 0.22].map((dx) => (
          <RCyl key={dx} r={0.035} h={0.18} position={[dx, 0.66, -0.58]} rotation={[Math.PI / 2, 0, 0]} kind="copper" color="#c27a4c" fillet={0.01} segments={16} />
        ))}
        <RBox size={[0.82, 0.03, 0.42]} position={[0, 0.885, -0.18]} radius={0.01} kind="plastic" color="#2b3036" />
        <RCyl r={0.12} h={0.09} position={[-0.24, 0.92, -0.2]} kind="plastic" color={C.blue} fillet={0.03} />
        <Decal text="RESET" position={[-0.24, 0.9, -0.36]} width={0.26} height={0.06} color="#c9ced4" />
        <RCyl r={0.14} h={0.06} position={[0.1, 0.91, -0.2]} kind="plastic" color="#efede7" fillet={0.02} />
        <RBox size={[0.03, 0.02, 0.12]} position={[0.1, 0.95, -0.24]} rotation={[0, -0.5, 0]} radius={0.008} color={C.orange} />
        <Decal text="2.5 · 4 A" position={[0.1, 0.9, -0.36]} width={0.3} height={0.06} color="#c9ced4" />
        <RBox size={[0.14, 0.03, 0.16]} position={[0.33, 0.9, -0.2]} radius={0.01} kind="lens" color="#c9d3da" />
        <RBox
          size={[0.1, 0.02, 0.1]}
          position={[0.33, 0.91, -0.2]}
          radius={0.008}
          kind="plastic"
          color={tripped ? "#ff7a2a" : C.green}
          emissive={tripped ? "#ff7a2a" : C.green}
          emissiveIntensity={tripped ? 6 : 0}
        />
        <RBox size={[w, 0.012, 0.04]} position={[-0.3 + w / 2, 0.892, -0.02]} radius={0.004} kind="plastic" color={heat > 0.7 ? "#ff5a3a" : "#f2a23a"} />
        <Decal text="F2" position={[-0.32, 0.884, 0.08]} width={0.14} height={0.1} color="#e9ecef" />
        {[-0.38, -0.18, 0.02].map((dx, i) => (
          <Clamp key={`t${dx}`} position={[dx, 0.885, 0.38]} label={["2T1", "4T2", "6T3"][i]} labelZ={-0.17} />
        ))}
        <Clamp position={[0.22, 0.885, 0.38]} label="95" labelZ={-0.17} kind="zinc" />
        <Clamp position={[0.38, 0.885, 0.38]} label="96" labelZ={-0.17} kind="zinc" />
      </group>
    </Part>
  );
}

/* ----------------------------------------------------------- terminals */

export const X1 = {
  z: 1.15,
  control: ["1", "2", "3", "4", "5", "6", "7"],
  controlX: (i: number) => -5.0 + i * 0.34,
  power: ["L1", "L2", "L3"],
  powerX: (i: number) => -2.42 + i * 0.34,
  motor: ["T1", "T2", "T3"],
  motorX: (i: number) => -1.28 + i * 0.34,
};
const X1_TOP = 0.84;
const X1_BACK = X1.z - 0.33;
const X1_FRONT = X1.z + 0.35;

function TerminalBlock({ x, label, color }: { x: number; label: string; color: string }) {
  return (
    <group position={[x, 0.12, X1.z]}>
      <RBox size={[0.3, 0.72, 1.0]} position={[0, 0.36, 0]} radius={0.035} kind="plastic" color={color} />
      <RBox size={[0.24, 0.025, 0.2]} position={[0, 0.73, 0.02]} radius={0.008} kind="plastic" color={C.print} />
      <Decal text={label} position={[0, 0.745, 0.02]} width={0.22} height={0.13} />
      <Screw position={[0, 0.72, -0.33]} r={0.055} kind="brass" />
      <Screw position={[0, 0.72, 0.35]} r={0.055} kind="brass" />
    </group>
  );
}

function Terminals() {
  return (
    <Part id="terminals">
      <DinRail x={-2.85} z={X1.z} length={5.0} />
      {X1.control.map((l, i) => (
        <TerminalBlock key={l} x={X1.controlX(i)} label={l} color={i === 6 ? "#4f7fc9" : "#c9ced3"} />
      ))}
      {X1.power.map((l, i) => (
        <TerminalBlock key={l} x={X1.powerX(i)} label={l} color="#a3a9b0" />
      ))}
      {X1.motor.map((l, i) => (
        <TerminalBlock key={l} x={X1.motorX(i)} label={l} color="#a3a9b0" />
      ))}
      {[-5.27, -2.7, -1.56, -0.42].map((x) => (
        <RBox key={x} size={[0.1, 0.85, 1.0]} position={[x, 0.545, X1.z]} radius={0.03} color={C.orange} />
      ))}
    </Part>
  );
}

/* -------------------------------------------------------------- station */

const ST = { x: -3.3, z: 2.95 };

function PushButton({ id, x, color, label }: { id: "start" | "stop"; x: number; color: string; label: string }) {
  const pressed = useSim((s) => (id === "start" ? s.physical.startPressed || s.faults.stuckStart : s.physical.stopPressed));
  const cap = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (cap.current) cap.current.position.y = THREE.MathUtils.damp(cap.current.position.y, pressed ? -0.09 : 0, 25, dt);
  });
  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useSim.getState().press(id, true);
    useSim.getState().select(id);
  };
  return (
    <Part id={id}>
      <group position={[x, 0, ST.z + 0.3]}>
        <RCyl r={0.38} h={0.09} position={[0, 1.13, 0]} kind="steel" color="#d9dde1" fillet={0.035} />
        <group ref={cap}>
          <RCyl r={0.28} h={0.2} position={[0, 1.27, 0]} kind="plastic" color={color} fillet={0.06} onPointerDown={down} />
        </group>
        <RBox size={[0.62, 0.02, 0.17]} position={[0, 1.1, 0.53]} radius={0.008} kind="plastic" color="#2b3036" />
        <Decal text={label} position={[0, 1.112, 0.53]} width={0.5} height={0.11} color="#f2f4f6" letterSpacing={0.06} />
      </group>
    </Part>
  );
}

function EStop() {
  const pressed = useSim((s) => s.physical.estopPressed);
  const head = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (head.current) head.current.position.y = THREE.MathUtils.damp(head.current.position.y, pressed ? -0.11 : 0, 20, dt);
  });
  return (
    <Part id="estop">
      <group
        position={[-2.25, 0, ST.z + 0.15]}
        onPointerDown={(e) => {
          e.stopPropagation();
          useSim.getState().select("estop");
          useSim.getState().toggleEstop();
        }}
      >
        <RCyl r={0.6} h={0.06} position={[0, 1.12, 0]} kind="plastic" color={C.yellow} fillet={0.02} />
        <Decal text="EMERGENCY STOP" position={[0, 1.152, 0.44]} width={0.66} height={0.09} letterSpacing={0.04} />
        <group ref={head}>
          <RCyl r={0.2} h={0.24} position={[0, 1.27, 0]} kind="plastic" color="#2b3036" fillet={0.03} />
          <RCyl r={0.43} h={0.08} position={[0, 1.42, 0]} kind="plastic" color="#b52f2f" fillet={0.035} />
          <Dome r={0.43} squash={0.4} position={[0, 1.455, 0]} kind="plasticGloss" color={C.red} />
        </group>
      </group>
    </Part>
  );
}

function PilotLamp({ x, on, color, label }: { x: number; on: boolean; color: string; label: string }) {
  return (
    <group position={[x, 0, ST.z - 0.43]}>
      <RCyl r={0.25} h={0.08} position={[0, 1.13, 0]} kind="steel" color="#d9dde1" fillet={0.03} />
      <RCyl r={0.19} h={0.08} position={[0, 1.2, 0]} kind="lens" color={on ? color : "#c9d3cd"} emissive={color} emissiveIntensity={on ? 12 : 0} fillet={0.02} />
      <Dome r={0.19} squash={0.45} position={[0, 1.24, 0]} kind="lens" color={on ? color : "#d7dfda"} emissive={color} emissiveIntensity={on ? 12 : 0} />
      <Decal text={label} position={[0.44, 1.105, 0]} width={0.42} height={0.09} color="#5f646b" align="left" weight={700} />
    </group>
  );
}

function Station() {
  const runLamp = useSim((s) => Boolean(s.memory.Run_Lamp));
  const faultLamp = useSim((s) => Boolean(s.memory.Fault_Lamp));
  const shown = useShown("station");
  return (
    <>
      {shown && (
        <Explode offset={1.4}>
          <RBox size={[3.5, 1.08, 1.6]} position={[ST.x, 0.54, ST.z]} radius={0.14} kind="paint" color={C.enclosure} />
          <RBox size={[3.34, 0.02, 1.44]} position={[ST.x, 1.085, ST.z]} radius={0.01} kind="plastic" color="#e8eaec" />
          {[-4.9, -1.7].flatMap((x) => [ST.z - 0.63, ST.z + 0.63].map((z) => <Screw key={`${x}${z}`} position={[x, 1.1, z]} r={0.055} />))}
          <PilotLamp x={-4.3} on={runLamp} color="#39d27f" label="RUN" />
          <PilotLamp x={-3.4} on={faultLamp} color="#ff4f4f" label="FAULT" />
          <RCyl r={0.17} h={0.2} position={[ST.x, 0.6, ST.z - 0.86]} rotation={[Math.PI / 2, 0, 0]} kind="plastic" color="#3a3f45" fillet={0.03} />
          <RCyl r={0.12} h={0.08} position={[ST.x, 0.6, ST.z - 0.98]} rotation={[Math.PI / 2, 0, 0]} kind="plastic" color="#2b3036" fillet={0.02} />
        </Explode>
      )}
      <PushButton id="start" x={-4.3} color={C.green} label="START" />
      <PushButton id="stop" x={-3.4} color={C.red} label="STOP" />
      <EStop />
    </>
  );
}

/* ---------------------------------------------------------------- motor */

const M = { x: 3.9, y: 1.42, z: 1.0 };

function Motor() {
  const coupling = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (coupling.current) coupling.current.rotation.x -= useSim.getState().physical.motorSpeed * dt * 14;
  });
  const ribs = Array.from({ length: 22 }, (_, i) => (i / 22) * Math.PI * 2);
  return (
    <Part id="motor">
      <group>
        <RBox size={[2.6, 0.12, 1.9]} position={[M.x - 0.1, 0.06, M.z]} radius={0.04} kind="zinc" color="#b9c0c7" />
        {[M.x - 0.85, M.x + 0.85].map((x) => (
          <group key={x}>
            <RBox size={[0.46, 0.4, 1.6]} position={[x, 0.32, M.z]} radius={0.05} kind="brushed" color={C.aluDark} />
            <Screw position={[x, 0.13, x < M.x ? M.z - 0.62 : M.z + 0.62]} r={0.07} />
          </group>
        ))}
        <group position={[M.x, M.y, M.z]}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <RCyl r={0.92} h={2.3} kind="brushed" color={C.alu} segments={64} fillet={0.03} />
          </group>
          {ribs.map((a) => (
            <group key={a} rotation={[a, 0, 0]}>
              <RBox size={[2.18, 0.14, 0.045]} position={[0, 0.96, 0]} radius={0.018} kind="brushed" color={C.alu} />
            </group>
          ))}
          <group rotation={[0, 0, Math.PI / 2]}>
            <RCyl r={0.98} h={0.22} position={[0, -1.24, 0]} kind="brushed" color={C.aluDark} segments={64} fillet={0.05} />
            <RCyl r={0.98} h={0.2} position={[0, 1.24, 0]} kind="brushed" color={C.aluDark} segments={64} fillet={0.05} />
            <RCyl r={0.36} h={0.12} position={[0, -1.4, 0]} kind="brushed" color={C.alu} segments={48} fillet={0.03} />
          </group>
          <group position={[-1.68, 0, 0]}>
            <group rotation={[0, 0, Math.PI / 2]}>
              <RCyl r={1.0} h={0.72} kind="paint" color={C.paint} segments={64} fillet={0.08} />
            </group>
            {Array.from({ length: 16 }, (_, i) => (
              <group key={i} rotation={[(i / 16) * Math.PI * 2, 0, 0]}>
                <RBox size={[0.36, 0.03, 0.09]} position={[0.02, 1.0, 0]} radius={0.012} kind="plastic" color="#1b1f24" />
              </group>
            ))}
            {[0.78, 0.6, 0.42, 0.24].map((r) => (
              <mesh key={r} position={[-0.362, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <ringGeometry args={[r - 0.07, r, 48]} />
                <meshStandardMaterial color="#15191d" roughness={0.9} />
              </mesh>
            ))}
            <mesh position={[-0.363, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <circleGeometry args={[0.12, 32]} />
              <meshStandardMaterial color="#3a4047" roughness={0.6} />
            </mesh>
          </group>
          <group ref={coupling} position={[1.42, 0, 0]}>
            <group rotation={[0, 0, Math.PI / 2]}>
              <RCyl r={0.11} h={0.62} position={[0, -0.22, 0]} kind="steel" color="#d5dade" segments={32} fillet={0.02} />
              <RCyl r={0.3} h={0.28} position={[0, -0.6, 0]} kind="steel" color="#aeb6bd" segments={48} fillet={0.04} />
              <RCyl r={0.3} h={0.06} position={[0, -0.76, 0]} kind="plastic" color={C.orange} segments={48} fillet={0.015} />
            </group>
            <RBox size={[0.3, 0.05, 0.06]} position={[0.18, 0.11, 0]} radius={0.01} kind="steel" color="#9aa2aa" />
            {[0, 1, 2, 3].map((i) => (
              <group key={i} rotation={[(i * Math.PI) / 2 + 0.4, 0, 0]}>
                <RCyl r={0.035} h={0.03} position={[0.81, 0.19, 0]} rotation={[0, 0, Math.PI / 2]} kind="plastic" color="#1b1f24" segments={12} fillet={0.005} />
              </group>
            ))}
          </group>
        </group>
        <RBox size={[0.9, 0.46, 0.84]} position={[M.x - 0.15, 2.6, M.z]} radius={0.06} kind="brushed" color={C.alu} />
        <RBox size={[0.98, 0.07, 0.92]} position={[M.x - 0.15, 2.86, M.z]} radius={0.03} kind="brushed" color={C.aluDark} />
        {[M.x - 0.52, M.x + 0.22].flatMap((x) => [M.z - 0.38, M.z + 0.38].map((z) => <Screw key={`${x}${z}`} position={[x, 2.9, z]} r={0.04} kind="steel" />))}
        <RCyl r={0.12} h={0.2} position={[M.x - 0.15, 2.58, M.z + 0.52]} rotation={[Math.PI / 2, 0, 0]} kind="plastic" color="#2f343a" fillet={0.03} />
        <group position={[M.x + 0.15, M.y + 0.68, M.z + 0.7]} rotation={[0.8, 0, 0]}>
          <RBox size={[1.0, 0.02, 0.5]} radius={0.008} kind="zinc" color="#d9dde1" />
          <Decal
            text={"3~ MOTOR  TEFC  IE3\n1.1 kW   400 V   2.6 A\n1420 rpm   50 Hz   IP55"}
            position={[0, 0.012, 0]}
            width={0.92}
            height={0.44}
            align="left"
            color="#1f242a"
            family="ui-monospace, Menlo, monospace"
            weight={600}
          />
        </group>
      </group>
    </Part>
  );
}

/* --------------------------------------------------------------- wiring */

const LOWER = { z: 0.1, depth: 0.5, h: 0.56 };
const UPPER = { z: -3.76, depth: 0.46, h: 0.52 };
const lowerBack = (x: number): V3 => [x, 0.4, LOWER.z - LOWER.depth / 2 + 0.06];
const lowerFront = (x: number): V3 => [x, 0.4, LOWER.z + LOWER.depth / 2 - 0.06];
const upperFront = (x: number): V3 => [x, 0.36, UPPER.z + UPPER.depth / 2 - 0.06];

/** From a front row terminal of a rail module, down its face and into the lower duct. */
function frontStub(x: number, y: number, z: number, face: number): V3[] {
  return [
    [x, y + 0.02, z],
    [x, y + 0.12, z + 0.16],
    [x, y - 0.1, face + 0.08],
    [x, 0.7, face + 0.1],
    [x, 0.46, (face + LOWER.z - LOWER.depth / 2) / 2],
    lowerBack(x),
  ];
}

/** From a back row terminal, down the back face and into the upper duct. */
function backStub(x: number, y: number, z: number, face: number): V3[] {
  return [
    [x, y + 0.02, z],
    [x, y + 0.12, z - 0.16],
    [x, y - 0.1, face - 0.08],
    [x, 0.66, face - 0.1],
    [x, 0.42, (face + UPPER.z + UPPER.depth / 2) / 2],
    upperFront(x),
  ];
}

/** From an overload front clamp, down its face into the lower duct. */
function overloadStub(x: number): V3[] {
  return [[x, 1.025, -0.51], [x, 1.1, -0.38], [x, 0.84, -0.29], [x, 0.56, -0.22], lowerBack(x)];
}

function x1Back(x: number): V3[] {
  return [lowerFront(x), [x, 0.5, LOWER.z + 0.42], [x, 0.98, X1_BACK - 0.1], [x, X1_TOP + 0.02, X1_BACK]];
}

const PLC_FRONT = (i: number) => -3.0 - 0.82 + i * 0.205;
const IO_FRONT = (i: number) => -1.4 - 0.3 + i * 0.2;

function Wiring() {
  const exploded = useSim((s) => s.exploded);
  const memory = useSim((s) => s.memory);
  const physical = useSim((s) => s.physical);
  const faults = useSim((s) => s.faults);
  const running = useSim((s) => s.running);
  const shown = useShown("wiring");
  if (exploded || !shown) return null;
  const inputs = readInputs(physical, faults);
  const power = running && contactorClosed(memory, physical);
  const g = (on: unknown) => (on ? 0.32 : 0);
  const F: [boolean, boolean] = [true, false];

  const signals: { color: string; on: unknown; plcX: number; x1: number }[] = [
    { color: "#c9372c", on: running, plcX: PLC_FRONT(0), x1: 0 },
    { color: "#22a061", on: inputs.Start_PB, plcX: PLC_FRONT(2), x1: 1 },
    { color: "#d23c3c", on: inputs.Stop_PB, plcX: PLC_FRONT(3), x1: 2 },
    { color: "#e0b326", on: inputs.EStop_OK, plcX: PLC_FRONT(5), x1: 3 },
    { color: "#2f6fd6", on: memory.Run_Lamp, plcX: IO_FRONT(1), x1: 4 },
    { color: "#2f6fd6", on: memory.Fault_Lamp, plcX: IO_FRONT(2), x1: 5 },
    { color: "#1d3f8a", on: running, plcX: PLC_FRONT(1), x1: 6 },
  ];
  const front = -2.2 + 0.76;
  const frontFace = -2.2 + 1.0;
  const backRow = -2.2 - 0.76;
  const backFace = -2.2 - 1.0;

  return (
    <group>
      <Duct x0={-5.75} x1={1.55} z={LOWER.z} depth={LOWER.depth} height={LOWER.h} />
      <Duct x0={-5.75} x1={1.55} z={UPPER.z} depth={UPPER.depth} height={UPPER.h} />
      <Duct x0={UPPER.z + UPPER.depth / 2} x1={LOWER.z - LOWER.depth / 2} z={-5.98} depth={0.42} height={0.5} axis="z" />

      {signals.map((s, i) => (
        <group key={`s${i}`}>
          <Cable color={s.color} glow={g(s.on)} ferrules={F} points={frontStub(s.plcX, 1.615, front, frontFace)} />
          <Cable color={s.color} glow={g(s.on)} ferrules={[false, true]} points={x1Back(X1.controlX(s.x1))} />
        </group>
      ))}
      <Cable color="#f26b1d" glow={g(inputs.Overload_OK)} ferrules={F} points={frontStub(PLC_FRONT(4), 1.615, front, frontFace)} />
      <Cable color="#f26b1d" glow={g(inputs.Overload_OK)} ferrules={F} points={overloadStub(0.78)} />
      <Cable color="#c9372c" glow={g(running)} ferrules={F} points={overloadStub(0.62)} />
      <Cable color="#2f6fd6" glow={g(memory.Motor_Run)} ferrules={F} points={frontStub(IO_FRONT(0), 1.615, front, frontFace)} />
      <Cable color="#2f6fd6" glow={g(memory.Motor_Run)} ferrules={F} points={backStub(0.4 - 0.42, 1.08, -2.2 - 0.68, -2.2 - 0.86)} />
      <Cable color="#1d3f8a" glow={g(running)} ferrules={F} points={backStub(0.4 + 0.42, 1.08, -2.2 - 0.68, -2.2 - 0.86)} />
      <Cable color="#1d3f8a" glow={g(running)} ferrules={F} points={backStub(IO_FRONT(3), 1.615, backRow, backFace)} />

      {[C.brown, C.black, C.grey].map((color, i) => (
        <group key={`p${i}`}>
          <Cable color={color} radius={0.046} glow={power ? 0.12 : 0} ferrules={F} points={backStub(-4.6 + (i - 1) * 0.33, 1.43, -2.2 - 0.74, -2.2 - 0.9)} />
          <Cable color={color} radius={0.046} glow={power ? 0.12 : 0} ferrules={F} points={backStub(0.4 + (i - 1) * 0.22, 1.08, -2.2 - 0.68, -2.2 - 0.86)} />
          <Cable color={color} radius={0.046} ferrules={F} points={frontStub(-4.6 + (i - 1) * 0.33, 1.43, -2.2 + 0.74, -2.2 + 0.9)} />
          <Cable color={color} radius={0.046} ferrules={[false, true]} points={x1Back(X1.powerX(i))} />
          <Cable color={color} radius={0.046} glow={power ? 0.12 : 0} ferrules={F} points={overloadStub(0.02 + i * 0.2)} />
          <Cable color={color} radius={0.046} glow={power ? 0.12 : 0} ferrules={[false, true]} points={x1Back(X1.motorX(i))} />
        </group>
      ))}

      {X1.control.map((_, i) => {
        const x = X1.controlX(i);
        const color = signals.find((s) => s.x1 === i)?.color ?? C.grey;
        return (
          <Cable
            key={`f${i}`}
            color={color}
            radius={0.035}
            ferrules={[true, false]}
            points={[[x, X1_TOP + 0.02, X1_FRONT], [x, 0.98, X1_FRONT + 0.12], [x, 0.66, X1_FRONT + 0.3], [ST.x - 0.12 + i * 0.04, 0.6, ST.z - 1.0]]}
          />
        );
      })}

      {[C.brown, C.black, C.grey].map((color, i) => (
        <Cable
          key={`sup${i}`}
          color={color}
          radius={0.04}
          ferrules={[true, false]}
          points={[[X1.powerX(i), X1_TOP + 0.02, X1_FRONT], [X1.powerX(i), 0.9, X1_FRONT + 0.14], [X1.powerX(i), 0.5, X1_FRONT + 0.3], [-2.08 + i * 0.03, 0.26, 1.96]]}
        />
      ))}
      <Cable color="#5c636b" radius={0.1} points={[[-6.6, 0.18, 1.98], [-5.5, 0.2, 1.98], [-3.8, 0.22, 1.98], [-2.08, 0.24, 1.97]]} />

      {[C.brown, C.black, C.grey].map((color, i) => (
        <Cable
          key={`mot${i}`}
          color={color}
          radius={0.04}
          ferrules={[true, false]}
          points={[[X1.motorX(i), X1_TOP + 0.02, X1_FRONT], [X1.motorX(i), 0.9, X1_FRONT + 0.14], [X1.motorX(i), 0.5, X1_FRONT + 0.3], [-0.9 + i * 0.03, 0.26, 1.96]]}
        />
      ))}
      <Cable
        color="#3a4047"
        radius={0.1}
        glow={power ? 0.1 : 0}
        points={[[-0.9, 0.24, 1.97], [0.6, 0.22, 2.2], [2.2, 0.24, 2.45], [3.4, 0.3, 2.42], [M.x - 0.15, 0.9, 2.42], [M.x - 0.15, 2.1, 2.3], [M.x - 0.15, 2.58, 1.86], [M.x - 0.15, 2.58, 1.62]]}
      />
    </group>
  );
}

export function MotorStarterRig({ only = null }: { only?: RigPiece[] | null }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);

  useEffect(() => {
    const release = () => {
      const { physical, press } = useSim.getState();
      if (physical.startPressed) press("start", false);
      if (physical.stopPressed) press("stop", false);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const { settings } = useSim.getState();
    if (settings.turntable && !settings.reduceMotion) spin.current += dt * 0.18;
    g.rotation.y = spin.current;
    g.position.y = settings.reduceMotion || only ? 0 : Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
  });

  return (
    <OnlyCtx.Provider value={only}>
      <group ref={group}>
        <Plate />
        {!only && (
          <Explode offset={1.1}>
            <DinRail x={-2.0} z={-2.2} length={7.0} />
          </Explode>
        )}
        <Breaker />
        <Controller />
        <SignalBoard />
        <Contactor />
        <OverloadRelay />
        <Terminals />
        <Station />
        <Motor />
        <Wiring />
      </group>
    </OnlyCtx.Provider>
  );
}
