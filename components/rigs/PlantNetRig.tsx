"use client";

import { useSim } from "@/store/sim";
import { Decal, RBox, RCyl } from "@/components/stage/pbr";
import { Led, Part, Selector } from "./kit";
import { TankRig } from "./ProcessRigs";

/** The reservoir from the header tank model, plus the network: remote I/O, fibre, SCADA and a vendor laptop. */
export function PlantNetRig({ only }: { only?: string[] | null }) {
  const linkDown = useSim((s) => Boolean(s.faults.linkDown));
  const stale = useSim((s) => Boolean(s.faults.staleOK));
  const rogue = useSim((s) => Boolean(s.faults.rogue));
  const session = useSim((s) => Boolean(s.memory.Remote_Lamp));
  const req = useSim((s) => Boolean(s.physical.remoteReq));
  const sp = useSim((s) => Number(s.memory.SCADA_SP ?? s.physical.scadaSp ?? 0));
  return (
    <>
      <TankRig only={only} />
      <Part id="rio">
        <group position={[2.6, 0.12, -1.8]}>
          <RBox size={[0.9, 1.6, 0.5]} position={[0, 0.8, 0]} radius={0.05} kind="paint" color="#d9dcdf" />
          <RBox size={[0.7, 0.3, 0.06]} position={[0, 1.1, 0.27]} radius={0.02} kind="plastic" color="#2b3036" />
          <Led on={!linkDown} color={stale ? "#ffb020" : "#3ee08a"} position={[-0.2, 1.1, 0.31]} />
          <Led on={linkDown} color="#ff4f4f" position={[0.2, 1.1, 0.31]} />
          <Decal text="RIO2" position={[0, 0.6, 0.26]} width={0.4} height={0.12} color="#3a4047" weight={800} rotation={[0, 0, 0]} />
        </group>
        {/* the fibre run back to the pump house */}
        <mesh position={[-0.6, 0.18, -2.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 6.4, 8]} />
          <meshStandardMaterial color={linkDown ? "#d23c3c" : "#e3b505"} />
        </mesh>
      </Part>
      <Part id="scada">
        <group position={[4.3, 0.12, -1.4]} rotation={[0, -0.3, 0]}>
          <RBox size={[0.2, 1.4, 0.2]} position={[0, 0.7, 0]} radius={0.04} kind="paint" color="#5a6470" />
          <RBox size={[1.6, 1.0, 0.1]} position={[0, 1.9, 0]} radius={0.04} kind="plastic" color="#1f2a24" />
          <Decal text={`SCADA  SP ${sp} %`} position={[0, 2.05, 0.06]} width={1.3} height={0.16} color={rogue || sp > 100 ? "#ff8a8a" : "#9df2b8"} weight={800} rotation={[0, 0, 0]} />
          <Decal text="OPC UA" position={[0, 1.75, 0.06]} width={0.6} height={0.12} color="#9df2b8" weight={700} rotation={[0, 0, 0]} />
        </group>
      </Part>
      <Part id="vendor">
        <group position={[4.4, 0.12, 1.8]}>
          <RBox size={[1.0, 0.05, 0.7]} position={[0, 0.03, 0]} radius={0.02} kind="plastic" color="#3a4047" />
          <group position={[0, 0.05, -0.33]} rotation={[-1.2, 0, 0]}>
            <RBox size={[1.0, 0.05, 0.65]} position={[0, 0, 0.32]} radius={0.02} kind="plastic" color="#3a4047" />
            <Decal text={session ? "SESSION OPEN" : req ? "REQUESTING" : "VPN"} position={[0, 0.03, 0.32]} width={0.8} height={0.12} color={session ? "#ffb020" : "#9aa2aa"} weight={800} rotation={[-Math.PI / 2, 0, 0]} />
          </group>
          <RCyl r={0.04} h={0.04} position={[0.4, 0.07, 0.25]} kind="plastic" color={session ? "#ffb020" : "#555"} />
        </group>
      </Part>
      <Selector part="key" position={[-3.0, 0, 3.2]} label="REMOTE KEY" />
    </>
  );
}
