"use client";

import { useSim } from "@/store/sim";
import { loops } from "@/rigs/instruments";
import { Decal, RBox, RCyl } from "@/components/stage/pbr";
import { BasePlate, K, Part, PilotLamp, Plc, RigRoot, Station, useShown } from "./kit";

const STEEL = "#c9ced4";

/** Current in each loop, recomputed from the bench state and its faults. */
function useLoops() {
  const physical = useSim((s) => s.physical);
  const faults = useSim((s) => s.faults);
  return loops(physical, faults);
}

/** A field transmitter on a pipe stand: process connection, housing and a small LCD. */
function Transmitter({ id, x, tag, mA, color = "#3e5f86", sensor }: { id: string; x: number; tag: string; mA: number; color?: string; sensor: "pipe" | "flange" | "well" | "flow" }) {
  return (
    <Part id={id}>
      <group position={[x, 0, 0]}>
        <RCyl r={0.06} h={1.5} position={[0, 0.75, -0.3]} kind="brushed" color={K.aluDark} fillet={0.01} />
        {sensor === "flow" ? (
          <RCyl r={0.3} h={0.7} position={[0, 1.2, 0]} rotation={[0, 0, Math.PI / 2]} kind="paint" color="#3e5f86" fillet={0.04} />
        ) : sensor === "well" ? (
          <RCyl r={0.05} h={0.9} position={[0, 1.0, 0]} kind="steel" color={STEEL} fillet={0.01} />
        ) : (
          <RCyl r={0.16} h={0.3} position={[0, 1.25, 0]} kind="steel" color={STEEL} fillet={0.03} />
        )}
        <RBox size={[0.6, 0.5, 0.42]} position={[0, 1.75, 0]} radius={0.08} kind="paint" color={color} />
        <RCyl r={0.17} h={0.06} position={[0, 1.78, 0.23]} rotation={[Math.PI / 2, 0, 0]} kind="lens" color="#cfe0ea" />
        <Decal text={mA < 0.5 ? "----" : `${mA.toFixed(2)} mA`} position={[0, 1.78, 0.265]} width={0.3} height={0.09} color={mA < 3.6 || mA > 21 ? "#b32020" : "#1d3d2e"} weight={800} rotation={[0, 0, 0]} />
        <Decal text={tag} position={[0, 2.01, 0]} width={0.3} height={0.1} color="#e9edf2" weight={800} />
      </group>
    </Part>
  );
}

export function InstrumentRig({ only }: { only?: string[] | null }) {
  const l = useLoops();
  const sourcing = useSim((s) => Boolean(s.physical.calSource));
  const calmA = useSim((s) => Number(s.physical.calmA));
  const urv = useSim((s) => Number(s.physical.ptUrv));
  const station = useShown("station");
  return (
    <RigRoot only={only}>
      <BasePlate w={11.6} d={8.0} />
      <RBox size={[9.4, 0.12, 0.12]} position={[0, 1.2, -0.3]} radius={0.03} kind="steel" color={STEEL} />
      <Transmitter id="pt" x={-3.2} tag="PT1" mA={l.pt} sensor="pipe" />
      <Transmitter id="lt" x={-1.1} tag="LT1" mA={l.lt} sensor="flange" />
      <Transmitter id="ft" x={1.1} tag="FT1" mA={l.ft} sensor="flow" />
      <Transmitter id="tt" x={3.2} tag="TT1" mA={l.tt} sensor="well" color="#5a6470" />

      <Part id="cal">
        <group position={[-2.6, 0.12, 2.6]} rotation={[-0.5, 0.2, 0]}>
          <RBox size={[1.0, 0.18, 1.5]} radius={0.12} kind="plastic" color="#e3b505" />
          <RBox size={[0.76, 0.04, 0.5]} position={[0, 0.1, -0.35]} radius={0.03} kind="plastic" color="#1f2a24" />
          <Decal text={sourcing ? `SRC ${calmA.toFixed(2)} mA` : `MEAS ${l.pt.toFixed(2)} mA`} position={[0, 0.125, -0.35]} width={0.66} height={0.13} color="#9df2b8" weight={800} rotation={[-Math.PI / 2, 0, 0]} />
          {[-0.25, 0, 0.25].map((x) => (
            <RCyl key={x} r={0.08} h={0.04} position={[x, 0.1, 0.25]} kind="plastic" color={K.black} />
          ))}
        </group>
      </Part>

      <Part id="hart">
        <group position={[-0.6, 0.12, 2.6]} rotation={[-0.5, -0.1, 0]}>
          <RBox size={[0.8, 0.16, 1.3]} radius={0.1} kind="plastic" color="#2b3036" />
          <RBox size={[0.62, 0.04, 0.5]} position={[0, 0.09, -0.3]} radius={0.03} kind="plastic" color="#cfe0ea" />
          <Decal text={`PT1  0-${urv} bar`} position={[0, 0.115, -0.3]} width={0.54} height={0.12} color="#1b2430" weight={800} rotation={[-Math.PI / 2, 0, 0]} />
          <Decal text="HART" position={[0, 0.085, 0.4]} width={0.3} height={0.1} color="#f2f4f6" weight={800} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
      </Part>

      <Plc position={[3.4, 0.12, -2.6]} inputs={[]} outputs={["Fault_Lamp"]} model="CPU 1215 · AI 4 HART" />
      <Station position={[2.6, 0, 3.0]} w={2.0} d={1.3}>
        {station && <PilotLamp tag="Fault_Lamp" position={[0, 0, -0.3]} color="#ff4f4f" label="INSTR FAULT" />}
      </Station>
    </RigRoot>
  );
}
