"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useInputs, useSim } from "@/store/sim";
import { Decal, RBox, RCyl } from "@/components/stage/pbr";
import { BasePlate, K, Led, Part, PilotLamp, Plc, PushButton, RigRoot, Station, useBit, useShown } from "./kit";

const STEEL = "#c9ced4";
const ALU = "#b9c0c7";

/** Smoothly follows a 0..1 physical value, so motion looks continuous between scans. */
function useStroke(key: string) {
  const v = useRef(0);
  useFrame((_, dt) => {
    const target = Number(useSim.getState().physical[key] ?? 0);
    v.current = THREE.MathUtils.damp(v.current, target, 18, dt);
  });
  return v;
}

/**
 * A double acting air cylinder lying along +X: barrel, end caps, a rod that slides out by `stroke`
 * units, and a reed switch at each end that lights when its input is on.
 */
function Cylinder({ strokeKey, length, stroke, bore, homeTag, endTag, label }: { strokeKey: string; length: number; stroke: number; bore: number; homeTag: string; endTag: string; label: string }) {
  const s = useStroke(strokeKey);
  const rod = useRef<THREE.Group>(null);
  const live = useInputs();
  useFrame(() => {
    if (rod.current) rod.current.position.x = length / 2 + s.current * stroke;
  });
  return (
    <group>
      <RCyl r={bore} h={length} rotation={[0, 0, -Math.PI / 2]} kind="brushed" color={ALU} fillet={0.02} />
      <RBox size={[0.22, bore * 2.4, bore * 2.4]} position={[-length / 2, 0, 0]} radius={0.04} kind="paint" color={K.blue} />
      <RBox size={[0.22, bore * 2.4, bore * 2.4]} position={[length / 2, 0, 0]} radius={0.04} kind="paint" color={K.blue} />
      {/* air ports on the end caps */}
      <RCyl r={0.05} h={0.12} position={[-length / 2, bore * 1.2 + 0.05, 0]} kind="brass" color="#c8a24a" />
      <RCyl r={0.05} h={0.12} position={[length / 2, bore * 1.2 + 0.05, 0]} kind="brass" color="#c8a24a" />
      <group ref={rod}>
        <RCyl r={bore * 0.35} h={stroke + 0.3} position={[(stroke + 0.3) / 2 - 0.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]} kind="steel" color={STEEL} fillet={0.01} />
        <RBox size={[0.18, bore * 2.2, bore * 2.2]} position={[stroke + 0.2, 0, 0]} radius={0.04} kind="zinc" color={K.zinc} />
      </group>
      {/* reed switches clamped on the barrel, with their LED */}
      {[
        [homeTag, -length / 2 + 0.35],
        [endTag, length / 2 - 0.35],
      ].map(([tag, x]) => (
        <group key={tag as string} position={[x as number, bore + 0.04, 0]}>
          <RBox size={[0.3, 0.08, 0.12]} radius={0.02} kind="plastic" color={K.black} />
          <Led on={Boolean(live[tag as string])} color="#ffb020" position={[0.08, 0.06, 0]} />
        </group>
      ))}
      <Decal text={label} position={[0, bore + 0.01, bore + 0.02]} width={0.8} height={0.12} color="#f2f4f6" weight={800} />
    </group>
  );
}

/** One 5/2 valve on the manifold, with a coil on each energised side. */
function Valve({ x, coils, label }: { x: number; coils: string[]; label: string }) {
  return (
    <group position={[x, 0, 0]}>
      <RBox size={[0.42, 0.34, 1.2]} position={[0, 0.17, 0]} radius={0.04} kind="brushed" color={ALU} />
      {coils.map((tag, i) => (
        <Coil key={tag} tag={tag} z={coils.length === 1 ? -0.55 : i === 0 ? -0.55 : 0.55} />
      ))}
      <Decal text={label} position={[0, 0.345, 0.1]} width={0.36} height={0.1} color="#33383e" weight={800} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}

function Coil({ tag, z }: { tag: string; z: number }) {
  const on = useBit(tag);
  return (
    <group position={[0, 0.22, z]}>
      <RBox size={[0.38, 0.38, 0.36]} radius={0.05} kind="plastic" color={K.black} />
      <Led on={on} color="#ffb020" position={[0, 0.21, 0]} />
    </group>
  );
}

/** Puck that rides on the end of cylinder A while it pushes. */
function Puck({ x0, reach, y, z }: { x0: number; reach: number; y: number; z: number }) {
  const a = useStroke("a");
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.position.x = x0 + a.current * reach;
    g.visible = a.current > 0.02;
  });
  return (
    <group ref={ref} position={[x0, y, z]}>
      <RCyl r={0.28} h={0.18} kind="plastic" color={K.orange} fillet={0.04} />
    </group>
  );
}

/** Cylinder B's rod points down; its own group is rotated so +X faces the floor. */
function PressHead() {
  return (
    <group position={[2.6, 1.0, 0.6]}>
      <RBox size={[1.0, 0.1, 1.0]} position={[0, 0.05, 0]} radius={0.03} kind="zinc" color={K.zinc} />
      <Decal text="PRESS" position={[0, 0.105, 0.38]} width={0.5} height={0.1} color="#4d535b" weight={700} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}

export function PneumaticRig({ only }: { only?: string[] | null }) {
  const air = useSim((s) => Boolean(s.physical.air) && !s.faults.airLoss);
  const parts = useSim((s) => Number(s.physical.parts));
  const partIn = useBit("Part_In");
  const station = useShown("station");
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />

      {/* the work table */}
      <RBox size={[6.6, 0.9, 2.2]} position={[0.6, 0.45, 0.6]} radius={0.08} kind="paint" color={K.enclosure} />

      <Part id="magazine">
        <group position={[-1.4, 0.9, 0.6]}>
          <RBox size={[0.8, 2.0, 0.8]} position={[0, 1.0, 0]} radius={0.06} kind="lens" color="#cfe0ea" />
          {Array.from({ length: Math.min(10, parts) }, (_, i) => (
            <RCyl key={i} r={0.28} h={0.17} position={[0, 0.12 + i * 0.18, 0]} kind="plastic" color={K.orange} fillet={0.04} />
          ))}
          <RBox size={[0.16, 0.12, 0.12]} position={[-0.48, 0.15, 0]} radius={0.02} kind="plastic" color={K.black} />
          <Led on={partIn} color="#3ee08a" position={[-0.48, 0.24, 0]} />
        </group>
      </Part>

      <Part id="cylA">
        <group position={[-3.4, 1.15, 0.6]}>
          <Cylinder strokeKey="a" length={1.6} stroke={1.9} bore={0.2} homeTag="A_Home" endTag="A_End" label="A" />
        </group>
      </Part>
      <Puck x0={-1.4} reach={4.0} y={1.0} z={0.6} />

      <Part id="cylB">
        <group position={[2.6, 3.6, 0.6]} rotation={[0, 0, -Math.PI / 2]}>
          <Cylinder strokeKey="b" length={1.2} stroke={0.9} bore={0.17} homeTag="B_Home" endTag="B_End" label="B" />
        </group>
        <RBox size={[0.2, 3.0, 0.2]} position={[3.4, 2.4, 0.6]} radius={0.04} kind="brushed" color={K.aluDark} />
        <RBox size={[1.0, 0.16, 0.3]} position={[3.0, 3.8, 0.6]} radius={0.04} kind="brushed" color={K.aluDark} />
      </Part>
      <PressHead />

      <Part id="valves">
        <group position={[-2.2, 0.0, -1.8]}>
          <RBox size={[1.6, 0.2, 1.4]} position={[0, 0.1, 0]} radius={0.04} kind="paint" color={K.paint} />
          <group position={[0, 0.2, 0]}>
            <Valve x={-0.45} coils={["A_Extend"]} label="Y1" />
            <Valve x={0.45} coils={["B_Extend", "B_Retract"]} label="Y2 Y3" />
          </group>
        </group>
      </Part>

      <Part id="frl">
        <group position={[-4.2, 0.0, -1.6]}>
          <RBox size={[0.5, 1.4, 0.5]} position={[0, 0.7, 0]} radius={0.06} kind="paint" color={K.paint} />
          <RCyl r={0.2} h={0.6} position={[0, 0.6, 0.35]} kind="lens" color="#d9e6ee" />
          <RCyl r={0.24} h={0.06} position={[0, 1.15, 0.28]} rotation={[Math.PI / 2, 0, 0]} kind="plastic" color="#f2f4f6" />
          <Decal text={air ? "6 bar" : "0 bar"} position={[0, 1.15, 0.315]} width={0.3} height={0.1} color={air ? "#1d5e44" : "#9b2c2c"} weight={800} />
          <Decal text="FRL" position={[0, 1.42, 0]} width={0.3} height={0.1} color="#f2f4f6" weight={800} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
      </Part>

      <Plc position={[3.8, 0.12, -2.6]} inputs={["Start_PB", "Stop_PB", "Air_OK", "Part_In", "A_Home", "A_End", "B_Home", "B_End"]} outputs={["A_Extend", "B_Extend", "B_Retract", "Run_Lamp"]} model="CPU 1214 DC/DC/DC" />

      <Station position={[-3.4, 0, 3.15]} w={3.0} d={1.5}>
        {station && <PilotLamp tag="Run_Lamp" position={[0.9, 0, -0.42]} color="#39d27f" label="CYCLE" />}
      </Station>
      <PushButton part="start" position={[-4.2, 0, 3.0]} color={K.green} label="START" />
      <PushButton part="stop" position={[-3.5, 0, 3.0]} color={K.red} label="STOP" />
    </RigRoot>
  );
}

