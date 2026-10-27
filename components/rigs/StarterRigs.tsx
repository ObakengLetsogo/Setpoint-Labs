"use client";

import { Cable, RBox, type V3 } from "@/components/stage/pbr";
import { useSim } from "@/store/sim";
import { BasePlate, BreakerBody, ContactorBody, DinRail, EStopButton, Explode, K, MotorModel, OverloadBody, Part, PilotLamp, Plc, PushButton, RigRoot, Station, useShown } from "./kit";

const RAIL_Z = -2.2;

function Contactor({ id, x, tag, label }: { id: string; x: number; tag: string; label: string }) {
  const closed = useSim((s) => s.running && Boolean(s.memory[tag]) && !s.physical.mcbTripped && !s.physical.overloadTripped && !s.physical.estopPressed);
  const welded = useSim((s) => id === "k2" && Boolean(s.faults.k2Welded));
  return (
    <Part id={id}>
      <group position={[x, 0.12, RAIL_Z]}>
        <ContactorBody closed={closed || welded} label={label} />
      </group>
    </Part>
  );
}

function Breaker({ x }: { x: number }) {
  const tripped = useSim((s) => Boolean(s.physical.mcbTripped));
  return (
    <Part id="mcb">
      <group position={[x, 0.12, RAIL_Z]}>
        <BreakerBody tripped={tripped} label="Q1  D32" />
      </group>
    </Part>
  );
}

function Overload({ x }: { x: number }) {
  const tripped = useSim((s) => Boolean(s.physical.overloadTripped));
  const heat = useSim((s) => Number(s.physical.heat));
  return (
    <Part id="overload">
      <group position={[x, 0.12, -0.9]}>
        <OverloadBody tripped={tripped} heat={heat} />
      </group>
    </Part>
  );
}

function Motor() {
  return (
    <Part id="motor">
      <group position={[3.3, 0, 2.15]}>
        <MotorModel speedKey="motorSpeed" label="3~ MOTOR  7.5 kW  400 V Δ" />
      </group>
    </Part>
  );
}

/** Power cores from a contactor's load side to the motor terminal box. */
function PowerRun({ fromX, colors, live, offset = 0 }: { fromX: number; colors: string[]; live: boolean; offset?: number }) {
  if (!useShown("wiring")) return null;
  return (
    <>
      {colors.map((c, i) => {
        const x = fromX - 0.22 + i * 0.22;
        const start: V3 = [x, 1.08, RAIL_Z + 0.66];
        return (
          <Cable
            key={`${fromX}${i}`}
            color={c}
            radius={0.045}
            glow={live ? 0.12 : 0}
            ferrules={[true, false]}
            points={[start, [x, 1.2, RAIL_Z + 0.95], [x, 0.4, -0.2 + offset], [2.0 + i * 0.12, 0.3, 1.0 + offset], [2.6 + i * 0.1, 0.5, 2.05 + offset * 0.2], [3.1 + i * 0.05, 2.45, 2.15 + offset * 0.2]]}
          />
        );
      })}
    </>
  );
}

function ControlRun({ count }: { count: number }) {
  if (!useShown("wiring")) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Cable
          key={i}
          color={i % 3 === 0 ? "#2f6fd6" : i % 3 === 1 ? "#d23c3c" : "#22a061"}
          radius={0.035}
          ferrules={[true, false]}
          points={[
            [-4.5 + i * 0.2, 1.5, RAIL_Z + 1.0],
            [-4.5 + i * 0.2, 0.9, RAIL_Z + 1.4],
            [-4.4 + i * 0.12, 0.35, 1.2],
            [-4.0 + i * 0.1, 0.6, 2.15],
          ]}
        />
      ))}
    </>
  );
}

function Bench({ children }: { children: React.ReactNode }) {
  const plate = useShown("plate");
  return (
    <>
      <BasePlate w={12.6} d={8.6} />
      <Explode offset={1.1}>{plate && <DinRail x={-1.0} z={RAIL_Z} length={9.4} />}</Explode>
      {children}
      <Motor />
    </>
  );
}

export function StarDeltaRig({ only }: { only?: string[] | null }) {
  const run = useSim((s) => s.running);
  const k1 = useSim((s) => Boolean(s.memory.K1_Main));
  const k3 = useSim((s) => Boolean(s.memory.K3_Delta));
  const station = useShown("station");
  return (
    <RigRoot only={only}>
      <Bench>
        <Plc position={[-3.6, 0.12, RAIL_Z]} inputs={["Start_PB", "Stop_PB", "Overload_OK", "EStop_OK", "K2_Fb"]} outputs={["K1_Main", "K2_Star", "K3_Delta", "Run_Lamp"]} />
        <Breaker x={-1.5} />
        <Contactor id="k1" x={0.0} tag="K1_Main" label="K1" />
        <Contactor id="k2" x={1.3} tag="K2_Star" label="K2" />
        <Contactor id="k3" x={2.6} tag="K3_Delta" label="K3" />
        <Overload x={0.0} />
        <Station position={[-3.3, 0, 2.95]} w={3.6} d={1.6}>
          {station && <PilotLamp tag="Run_Lamp" position={[-1.0, 0, -0.45]} color="#39d27f" label="RUN" />}
        </Station>
        <PushButton part="start" position={[-4.3, 0, 3.0]} color={K.green} label="START" />
        <PushButton part="stop" position={[-3.5, 0, 3.0]} color={K.red} label="STOP" />
        <EStopButton position={[-2.4, 0, 2.9]} />
        <PowerRun fromX={0.0} colors={["#6b4425", K.black, K.grey]} live={run && k1} />
        <PowerRun fromX={2.6} colors={["#6b4425", K.black, K.grey]} live={run && k3} offset={0.35} />
        <ControlRun count={6} />
      </Bench>
    </RigRoot>
  );
}

export function ReversingRig({ only }: { only?: string[] | null }) {
  const run = useSim((s) => s.running);
  const f = useSim((s) => Boolean(s.memory.KF_Fwd));
  const r = useSim((s) => Boolean(s.memory.KR_Rev));
  const station = useShown("station");
  const interlock = useShown("kf");
  return (
    <RigRoot only={only}>
      <Bench>
        <Plc position={[-3.6, 0.12, RAIL_Z]} inputs={["Fwd_PB", "Rev_PB", "Stop_PB", "Overload_OK", "Zero_Speed"]} outputs={["KF_Fwd", "KR_Rev", "Fwd_Lamp", "Rev_Lamp"]} />
        <Breaker x={-1.5} />
        <Contactor id="kf" x={0.3} tag="KF_Fwd" label="KF" />
        <Contactor id="kr" x={1.6} tag="KR_Rev" label="KR" />
        {interlock && <RBox size={[0.3, 0.5, 0.9]} position={[0.95, 0.37, RAIL_Z]} radius={0.04} kind="plastic" color="#33383e" />}
        <Overload x={0.95} />
        <Station position={[-3.1, 0, 2.95]} w={4.2} d={1.6}>
          {station && (
            <>
              <PilotLamp tag="Fwd_Lamp" position={[-1.2, 0, -0.45]} color="#39d27f" label="FWD" />
              <PilotLamp tag="Rev_Lamp" position={[-0.5, 0, -0.45]} color="#4da3ff" label="REV" />
            </>
          )}
        </Station>
        <PushButton part="fwd" position={[-4.3, 0, 3.0]} color={K.green} label="FWD" />
        <PushButton part="rev" position={[-3.6, 0, 3.0]} color={K.blue} label="REV" />
        <PushButton part="stop" position={[-2.9, 0, 3.0]} color={K.red} label="STOP" />
        <EStopButton position={[-1.9, 0, 2.9]} />
        <PowerRun fromX={0.3} colors={["#6b4425", K.black, K.grey]} live={run && f} />
        <PowerRun fromX={1.6} colors={[K.grey, K.black, "#6b4425"]} live={run && r} offset={0.35} />
        <ControlRun count={6} />
      </Bench>
    </RigRoot>
  );
}
