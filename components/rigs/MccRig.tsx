"use client";

import { useSim } from "@/store/sim";
import { Decal, RBox, RCyl } from "@/components/stage/pbr";
import { BasePlate, K, Led, MotorModel, Part, PilotLamp, Plc, PushButton, RigRoot, Station, useShown } from "./kit";

const CAB = { z: -1.8, h: 4.4, d: 1.2 };
const TRIP = ["", "OVERLOAD", "PHASE LOSS", "EARTH FAULT", "JAM"];

/** One section of the MCC: a painted column with a door, so buckets can sit in front of it. */
function Column({ x, label }: { x: number; label: string }) {
  return (
    <group position={[x, 0, CAB.z]}>
      <RBox size={[1.9, CAB.h, CAB.d]} position={[0, CAB.h / 2, 0]} radius={0.04} kind="paint" color="#d9dcdf" />
      <RBox size={[1.9, 0.3, CAB.d + 0.04]} position={[0, CAB.h + 0.15, 0]} radius={0.03} kind="paint" color="#bcc1c6" />
      <Decal text={label} position={[0, CAB.h - 0.2, CAB.d / 2 + 0.01]} width={1.4} height={0.14} color="#3a4047" weight={800} rotation={[0, 0, 0]} />
    </group>
  );
}

/** A small panel display: dark glass with one line of text. */
function Display({ text, color = "#9df2b8", position, width = 1.1 }: { text: string; color?: string; position: [number, number, number]; width?: number }) {
  return (
    <group position={position}>
      <RBox size={[width + 0.1, 0.3, 0.04]} radius={0.02} kind="plastic" color="#1f2a24" />
      <Decal text={text} position={[0, 0, 0.025]} width={width} height={0.16} color={color} weight={800} rotation={[0, 0, 0]} />
    </group>
  );
}

function SoftStarter() {
  const a1 = useSim((s) => Number(s.physical.a1));
  const phase = useSim((s) => Number(s.physical.ssPhase));
  const fault = useSim((s) => Boolean(s.physical.ssFault));
  const text = fault ? "FAULT  START TIME" : phase === 2 ? `BYPASS  ${Math.round(a1)} A` : phase === 1 ? `RAMP  ${Math.round(a1)} A` : phase === 3 ? `SOFT STOP ${Math.round(a1)} A` : "READY";
  return (
    <Part id="ss">
      <group position={[-2.0, 2.6, CAB.z + CAB.d / 2 + 0.2]}>
        <RBox size={[1.2, 1.6, 0.4]} radius={0.06} kind="plastic" color="#3a4047" />
        <Display text={text} color={fault ? "#ff8a8a" : "#9df2b8"} position={[0, 0.4, 0.22]} width={0.95} />
        {[-0.3, 0, 0.3].map((x) => (
          <RCyl key={x} r={0.06} h={0.05} position={[x, -0.1, 0.22]} rotation={[Math.PI / 2, 0, 0]} kind="plastic" color="#8a9097" />
        ))}
        <Led on={phase === 2} color="#3ee08a" position={[-0.4, -0.5, 0.22]} />
        <Led on={fault} color="#ff4f4f" position={[0.4, -0.5, 0.22]} />
        <Decal text="SOFT STARTER  U1" position={[0, -0.68, 0.205]} width={0.9} height={0.1} color="#e9edf2" weight={700} rotation={[0, 0, 0]} />
      </group>
    </Part>
  );
}

function Feeder2() {
  const th = useSim((s) => Number(s.physical.th));
  const trip = useSim((s) => Number(s.physical.trip));
  const remote = useSim((s) => Boolean(s.physical.f2Remote));
  const isol = useSim((s) => Boolean(s.physical.f2Isol));
  const k2 = useSim((s) => Boolean(s.physical.k2));
  const a2 = useSim((s) => Number(s.physical.a2));
  return (
    <>
      <Part id="mpr">
        <group position={[0, 3.4, CAB.z + CAB.d / 2 + 0.12]}>
          <RBox size={[1.2, 0.9, 0.24]} radius={0.05} kind="plastic" color="#2b3036" />
          <Display text={trip ? `TRIP ${TRIP[trip]}` : `${Math.round(a2)} A  TH ${Math.round(th)} %`} color={trip ? "#ff8a8a" : th >= 90 ? "#ffd27a" : "#9df2b8"} position={[0, 0.15, 0.13]} width={1.0} />
          <Decal text="PROTECTION RELAY  F2" position={[0, -0.28, 0.125]} width={0.95} height={0.09} color="#e9edf2" weight={700} rotation={[0, 0, 0]} />
        </group>
      </Part>
      <Part id="f2">
        <group position={[0, 1.9, CAB.z + CAB.d / 2 + 0.06]}>
          <RBox size={[1.7, 1.5, 0.1]} radius={0.03} kind="paint" color="#c9cdd2" />
          {/* isolator handle: vertical when on */}
          <group position={[-0.45, 0.2, 0.1]} rotation={[0, 0, isol ? 0 : Math.PI / 2]}>
            <RCyl r={0.22} h={0.08} rotation={[Math.PI / 2, 0, 0]} kind="plastic" color="#e3b505" />
            <RBox size={[0.1, 0.5, 0.1]} position={[0, 0, 0.08]} radius={0.03} kind="plastic" color={K.red} />
          </group>
          {/* local / remote selector */}
          <group position={[0.4, 0.2, 0.1]} rotation={[0, 0, remote ? -Math.PI / 4 : Math.PI / 4]}>
            <RCyl r={0.16} h={0.06} rotation={[Math.PI / 2, 0, 0]} kind="plastic" color="#2b3036" />
            <RBox size={[0.06, 0.26, 0.08]} position={[0, 0, 0.05]} radius={0.02} kind="plastic" color="#f2f4f6" />
          </group>
          <Decal text={remote ? "REMOTE" : "LOCAL"} position={[0.4, -0.12, 0.06]} width={0.4} height={0.09} color="#33383e" weight={800} rotation={[0, 0, 0]} />
          <Decal text={isol ? "ON" : "OFF"} position={[-0.45, -0.15, 0.06]} width={0.3} height={0.09} color="#33383e" weight={800} rotation={[0, 0, 0]} />
          <Led on={k2} color="#3ee08a" position={[0, -0.5, 0.07]} />
          <Decal text="FEEDER 2  CONVEYOR" position={[0, 0.62, 0.06]} width={1.1} height={0.1} color="#33383e" weight={800} rotation={[0, 0, 0]} />
        </group>
      </Part>
    </>
  );
}

function Meter() {
  const kw = useSim((s) => Number(s.physical.kw));
  const kwh = useSim((s) => Number(s.physical.kwh));
  const pf = useSim((s) => Number(s.physical.pf));
  return (
    <Part id="meter">
      <group position={[2.0, 3.2, CAB.z + CAB.d / 2 + 0.1]}>
        <RBox size={[1.0, 1.0, 0.2]} radius={0.05} kind="plastic" color="#e9ecef" />
        <Display text={`${kw.toFixed(1)} kW`} position={[0, 0.25, 0.11]} width={0.8} />
        <Display text={`${kwh.toFixed(2)} kWh`} position={[0, -0.08, 0.11]} width={0.8} />
        <Decal text={`PF ${pf.toFixed(2)}`} position={[0, -0.36, 0.105]} width={0.5} height={0.1} color="#33383e" weight={800} rotation={[0, 0, 0]} />
      </group>
    </Part>
  );
}

export function MccRig({ only }: { only?: string[] | null }) {
  const station = useShown("station");
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />
      <Column x={-2.0} label="FEEDER 1  PUMP" />
      <Column x={0} label="FEEDER 2  CONVEYOR" />
      <Column x={2.0} label="INCOMER" />
      <SoftStarter />
      <Feeder2 />
      <Meter />
      <Part id="m1">
        <group position={[-2.6, 0.12, 1.4]} scale={0.5}>
          <MotorModel speedKey="s1" label="M1  15 KW  PUMP" />
        </group>
      </Part>
      <Part id="m2">
        <group position={[1.6, 0.12, 1.4]} scale={0.42}>
          <MotorModel speedKey="s2" label="M2  7.5 KW  CONVEYOR" />
        </group>
      </Part>
      <Plc position={[4.4, 0.12, -1.6]} inputs={["Start_PB", "Stop_PB", "Reset_PB", "SS_Ready", "SS_TOR", "SS_Fault", "F2_Remote", "F2_Isol"]} outputs={["SS_Run", "K2_Run", "MPR_Reset", "Run_Lamp", "Fault_Lamp", "Warn_Lamp"]} model="CPU 1215 · PN · MODBUS" />
      <Station position={[-3.4, 0, 3.15]} w={3.6} d={1.5}>
        {station && (
          <>
            <PilotLamp tag="Run_Lamp" position={[0.6, 0, -0.42]} color="#39d27f" label="RUN" />
            <PilotLamp tag="Warn_Lamp" position={[1.05, 0, -0.42]} color="#ffb020" label="WARN" />
            <PilotLamp tag="Fault_Lamp" position={[1.5, 0, -0.42]} color="#ff4f4f" label="FAULT" />
          </>
        )}
      </Station>
      <PushButton part="start" position={[-4.4, 0, 3.2]} color={K.green} label="START" />
      <PushButton part="stop" position={[-3.7, 0, 3.2]} color={K.red} label="STOP" />
      <PushButton part="reset" position={[-3.0, 0, 3.2]} color="#2457a6" label="RESET" />
    </RigRoot>
  );
}
