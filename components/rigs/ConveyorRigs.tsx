"use client";

import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Cable, Decal, RBox, RCyl, type V3 } from "@/components/stage/pbr";
import { useSim } from "@/store/sim";
import { BELT, KIND, SENSORS, SLOTS, type Variant } from "@/rigs/conveyors";
import { BasePlate, BeaconModel, EStopButton, K, Part, PilotLamp, Plc, PushButton, RigRoot, Station, useShown } from "./kit";

const TOP = BELT.y + 0.06;
const NEAR_Z = BELT.z - BELT.width / 2;
const FAR_Z = BELT.z + BELT.width / 2;
const LEN = BELT.to - BELT.from;

function beltTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 32;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2b2f34";
  g.fillRect(0, 0, 256, 32);
  g.strokeStyle = "#3b4047";
  g.lineWidth = 6;
  for (let x = -32; x < 256 + 32; x += 32) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 16, 16);
    g.lineTo(x, 32);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(LEN / 1.2, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Belt() {
  const [tex] = useState(() => (typeof document === "undefined" ? null : beltTexture()));
  const surface = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const map = (surface.current?.material as THREE.MeshStandardMaterial | undefined)?.map;
    if (map) map.offset.x = -(Number(useSim.getState().physical.beltPos) / 1.2) % 1;
  });
  const legs = [-4.2, 0, 4.2];
  return (
    <group>
      {[NEAR_Z - 0.06, FAR_Z + 0.06].map((z) => (
        <RBox key={z} size={[LEN + 0.3, 0.32, 0.12]} position={[(BELT.from + BELT.to) / 2, BELT.y - 0.08, z]} radius={0.03} kind="brushed" color={K.alu} />
      ))}
      <mesh ref={surface} position={[(BELT.from + BELT.to) / 2, BELT.y + 0.035, BELT.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[LEN, BELT.width]} />
        <meshStandardMaterial map={tex} color="#ffffff" roughness={0.85} />
      </mesh>
      <RBox size={[LEN, 0.06, BELT.width]} position={[(BELT.from + BELT.to) / 2, BELT.y, BELT.z]} radius={0.02} kind="rubber" color={K.belt} />
      {[BELT.from, BELT.to].map((x) => (
        <group key={x} position={[x, BELT.y - 0.03, BELT.z]} rotation={[Math.PI / 2, 0, 0]}>
          <RCyl r={0.13} h={BELT.width + 0.1} kind="steel" color="#c9ced4" segments={24} fillet={0.02} />
        </group>
      ))}
      {legs.flatMap((x) =>
        [NEAR_Z + 0.05, FAR_Z - 0.05].map((z) => <RBox key={`${x}${z}`} size={[0.14, BELT.y - 0.2, 0.14]} position={[x, (BELT.y - 0.2) / 2, z]} radius={0.025} kind="brushed" color={K.aluDark} />),
      )}
      {legs.map((x) => (
        <RBox key={`x${x}`} size={[0.1, 0.1, BELT.width]} position={[x, 0.45, BELT.z]} radius={0.02} kind="brushed" color={K.aluDark} />
      ))}
    </group>
  );
}

function Drive() {
  const shaft = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (shaft.current) shaft.current.rotation.z -= Number(useSim.getState().physical.beltSpeed) * dt * 8;
  });
  return (
    <Part id="motor">
      <group position={[BELT.to, BELT.y - 0.03, NEAR_Z - 0.55]}>
        <RBox size={[0.6, 0.6, 0.55]} position={[0, -0.05, 0.05]} radius={0.06} kind="paint" color="#3e5f86" />
        <group rotation={[Math.PI / 2, 0, 0]}>
          <RCyl r={0.26} h={0.85} position={[0, -0.6, -0.05]} kind="paint" color="#3e5f86" segments={32} fillet={0.04} />
        </group>
        <group ref={shaft} position={[0, 0, 0.42]}>
          <RBox size={[0.08, 0.3, 0.06]} kind="steel" color="#aeb6bd" radius={0.01} />
        </group>
        <Decal text="M1  0.37 kW" position={[0, 0.26, 0.05]} width={0.5} height={0.1} color="#e9edf2" weight={700} />
      </group>
    </Part>
  );
}

function Item({ n, variant }: { n: number; variant: Variant }) {
  const ref = useRef<THREE.Group>(null);
  const on = useSim((s) => Boolean(s.physical[`i${n}on`]));
  const k = useSim((s) => Number(s.physical[`i${n}k`] ?? 0));
  useFrame(() => {
    if (ref.current) ref.current.position.x = Number(useSim.getState().physical[`i${n}x`] ?? 0);
  });
  if (!on) return null;
  let body: React.ReactNode;
  if (variant === "bottling") {
    const fill = Math.min(1, k);
    body = (
      <group>
        <RCyl r={0.2} h={0.75} position={[0, 0.375, 0]} kind="lens" color="#d9ecf5" segments={24} fillet={0.06} />
        <RCyl r={0.08} h={0.22} position={[0, 0.86, 0]} kind="lens" color="#d9ecf5" segments={16} fillet={0.02} />
        {fill > 0.02 && <RCyl r={0.17} h={0.68 * fill} position={[0, 0.04 + (0.68 * fill) / 2, 0]} kind="plastic" color={k > 1.04 ? "#7cb6e6" : "#3d8fd6"} segments={24} fillet={0.01} />}
        {fill >= 0.9 && <RCyl r={0.085} h={0.06} position={[0, 0.98, 0]} kind="plastic" color={K.red} segments={16} fillet={0.01} />}
      </group>
    );
  } else if (k === KIND.metal) {
    body = (
      <group>
        <RCyl r={0.26} h={0.52} position={[0, 0.26, 0]} kind="steel" color="#c7cdd3" segments={32} fillet={0.04} />
        <RCyl r={0.262} h={0.24} position={[0, 0.26, 0]} kind="print" color="#2457a6" segments={32} fillet={0.005} />
      </group>
    );
  } else if (k === KIND.tall) {
    body = <RBox size={[0.55, 0.95, 0.5]} position={[0, 0.475, 0]} radius={0.03} kind="print" color="#c9a77c" />;
  } else {
    body = (
      <group>
        <RBox size={[0.7, 0.5, 0.6]} position={[0, 0.25, 0]} radius={0.03} kind="print" color="#c9a77c" />
        <RBox size={[0.72, 0.02, 0.12]} position={[0, 0.5, 0]} radius={0.005} kind="plastic" color="#d9c7a3" />
      </group>
    );
  }
  return (
    <group ref={ref} position={[0, TOP, BELT.z]}>
      {body}
    </group>
  );
}

/** Retro-reflective photo-eyes read the rig directly, so they show live even while the PLC is stopped. */
function useSensed(fn: (p: Record<string, number | boolean>) => boolean) {
  return useSim((s) => fn(s.physical));
}

function nearItem(p: Record<string, number | boolean>, x: number, r: number) {
  for (let n = 0; n < SLOTS; n++) if (p[`i${n}on`] && Math.abs(Number(p[`i${n}x`]) - x) < r) return true;
  return false;
}

function LiveEye({ id, x }: { id: string; x: number }) {
  const blocked = useSensed((p) => nearItem(p, x, id === "peDivert" ? 0.25 : id === "peFiller" ? 0.15 : 0.35));
  return (
    <Part id={id}>
      <group position={[x, 0, 0]}>
        <RBox size={[0.08, 0.6, 0.08]} position={[0, BELT.y + 0.1, NEAR_Z - 0.2]} radius={0.02} kind="brushed" color={K.aluDark} />
        <RBox size={[0.24, 0.3, 0.22]} position={[0, BELT.y + 0.42, NEAR_Z - 0.2]} radius={0.04} kind="plastic" color="#3a3f45" />
        <RBox size={[0.08, 0.04, 0.03]} position={[0.06, BELT.y + 0.58, NEAR_Z - 0.2]} radius={0.01} kind="lens" color={blocked ? "#ffb020" : "#3ee08a"} emissive={blocked ? "#ffb020" : "#3ee08a"} emissiveIntensity={6} />
        <RBox size={[0.08, 0.6, 0.08]} position={[0, BELT.y + 0.1, FAR_Z + 0.2]} radius={0.02} kind="brushed" color={K.aluDark} />
        <RBox size={[0.2, 0.2, 0.04]} position={[0, BELT.y + 0.42, FAR_Z + 0.16]} radius={0.02} kind="plastic" color="#c23434" />
        <mesh position={[0, BELT.y + 0.42, BELT.z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, BELT.width + 0.4, 8]} />
          <meshBasicMaterial color="#ff4d4d" transparent opacity={blocked ? 0.12 : 0.55} />
        </mesh>
      </group>
    </Part>
  );
}

function Infeed() {
  return (
    <Part id="infeed">
      <group position={[BELT.from - 0.05, 0, BELT.z]}>
        <RBox size={[0.9, 0.06, BELT.width + 0.1]} position={[0.15, TOP + 1.05, 0]} radius={0.02} kind="brushed" color={K.alu} />
        {[-0.68, 0.68].map((z) => (
          <RBox key={z} size={[0.9, 1.1, 0.06]} position={[0.15, TOP + 0.5, z]} radius={0.02} kind="lens" color="#dfe9f0" />
        ))}
        <RBox size={[0.08, TOP + 1.1, 0.08]} position={[-0.25, (TOP + 1.1) / 2, -0.72]} radius={0.02} kind="brushed" color={K.aluDark} />
        <RBox size={[0.08, TOP + 1.1, 0.08]} position={[-0.25, (TOP + 1.1) / 2, 0.72]} radius={0.02} kind="brushed" color={K.aluDark} />
      </group>
    </Part>
  );
}

function MetalSensor() {
  const seen = useSensed((p) => {
    for (let n = 0; n < SLOTS; n++) if (p[`i${n}on`] && Number(p[`i${n}k`]) === KIND.metal && Math.abs(Number(p[`i${n}x`]) - SENSORS.metal) < 0.3) return true;
    return false;
  });
  return (
    <Part id="metal">
      <group position={[SENSORS.metal, 0, 0]}>
        <RBox size={[0.08, 1.2, 0.08]} position={[0, BELT.y + 0.4, NEAR_Z - 0.25]} radius={0.02} kind="brushed" color={K.aluDark} />
        <RBox size={[0.08, 0.08, 0.9]} position={[0, BELT.y + 1.0, BELT.z - 0.45]} radius={0.02} kind="brushed" color={K.aluDark} />
        <RCyl r={0.12} h={0.4} position={[0, BELT.y + 0.85, BELT.z]} kind="steel" color="#c7cdd3" fillet={0.02} />
        <RCyl r={0.12} h={0.06} position={[0, BELT.y + 0.64, BELT.z]} kind="plastic" color="#f2a23a" fillet={0.01} />
        <RCyl r={0.04} h={0.04} position={[0.1, BELT.y + 1.06, BELT.z]} kind="lens" color={seen ? "#ffb020" : "#59616b"} emissive="#ffb020" emissiveIntensity={seen ? 8 : 0} />
      </group>
    </Part>
  );
}

function Pusher() {
  const rod = useRef<THREE.Group>(null);
  useFrame(() => {
    if (rod.current) rod.current.position.z = NEAR_Z - 0.3 + Number(useSim.getState().physical.pusher) * 1.25;
  });
  return (
    <Part id="pusher">
      <group position={[SENSORS.divert, 0, 0]}>
        <RBox size={[0.5, 0.5, 1.2]} position={[0, BELT.y + 0.2, NEAR_Z - 1.05]} radius={0.06} kind="brushed" color={K.alu} />
        <RBox size={[0.3, BELT.y, 0.3]} position={[0, BELT.y / 2 - 0.05, NEAR_Z - 1.05]} radius={0.04} kind="brushed" color={K.aluDark} />
        <group ref={rod}>
          <RBox size={[0.06, 0.06, 0.9]} position={[0, BELT.y + 0.3, -0.45]} radius={0.02} kind="steel" color="#d5dade" />
          <RBox size={[0.7, 0.45, 0.06]} position={[0, BELT.y + 0.3, 0]} radius={0.02} kind="plastic" color={K.orange} />
        </group>
      </group>
      <group position={[SENSORS.divert, 0, FAR_Z + 0.85]}>
        <RBox size={[1.3, 0.9, 1.2]} position={[0, 0.45, 0]} radius={0.06} kind="paint" color="#4a6f9e" />
        <RBox size={[1.1, 0.04, 1.0]} position={[0, 0.9, 0]} radius={0.01} kind="plastic" color="#2b3036" />
        <Decal text="METAL" position={[0, 0.93, 0.3]} width={0.6} height={0.14} color="#e9edf2" weight={800} />
      </group>
    </Part>
  );
}

function Filler() {
  const open = useSim((s) => s.running && Boolean(s.memory.Fill_Valve));
  return (
    <Part id="filler">
      <group position={[SENSORS.filler, 0, 0]}>
        <RBox size={[0.24, 3.3, 0.24]} position={[0, 1.65, NEAR_Z - 0.6]} radius={0.04} kind="brushed" color={K.aluDark} />
        <RBox size={[0.3, 0.3, 1.5]} position={[0, 3.2, BELT.z - 0.55]} radius={0.05} kind="brushed" color={K.alu} />
        <RCyl r={0.45} h={0.8} position={[0, 3.75, NEAR_Z - 0.6]} kind="steel" color="#d1d6db" fillet={0.08} />
        <RCyl r={0.06} h={0.5} position={[0, 2.85, BELT.z]} kind="steel" color="#c7cdd3" fillet={0.01} />
        {open && (
          <mesh position={[0, TOP + 1.4, BELT.z]}>
            <cylinderGeometry args={[0.025, 0.025, 1.6, 8]} />
            <meshStandardMaterial color="#3d8fd6" transparent opacity={0.75} />
          </mesh>
        )}
      </group>
    </Part>
  );
}

function Stopper() {
  const gate = useRef<THREE.Group>(null);
  useFrame(() => {
    if (gate.current) gate.current.position.y = TOP + Number(useSim.getState().physical.stopper) * 0.5 - 0.5;
  });
  return (
    <Part id="stopper">
      <group position={[SENSORS.filler + 0.3, 0, 0]}>
        <RBox size={[0.3, 0.4, 0.3]} position={[0, BELT.y - 0.45, NEAR_Z + 0.1]} radius={0.04} kind="brushed" color={K.alu} />
        <group ref={gate}>
          <RBox size={[0.06, 0.55, 0.9]} position={[0, 0.27, BELT.z]} radius={0.02} kind="plastic" color={K.orange} />
        </group>
      </group>
    </Part>
  );
}

function Wiring() {
  if (!useShown("wiring")) return null;
  const end: V3 = [-3.0, 1.2, -1.6];
  const runs: V3[] = [
    [SENSORS.entry, 0.6, NEAR_Z - 0.2],
    [SENSORS.exit, 0.6, NEAR_Z - 0.2],
    [BELT.to, 1.0, NEAR_Z - 0.55],
  ];
  return (
    <>
      {runs.map((p, i) => (
        <Cable key={i} color="#3a4047" radius={0.05} points={[p, [p[0], 0.1, NEAR_Z - 0.45], [p[0] * 0.6 - 1.2, 0.1, -1.0], [end[0] + i * 0.2, 0.15, -1.3], end]} />
      ))}
      <Cable color="#3a4047" radius={0.08} points={[[-3.6, 0.5, 2.35], [-3.6, 0.1, 1.9], [-3.2, 0.1, 0.0], [-3.1, 0.15, -1.3], [-3.2, 1.0, -1.65]]} />
    </>
  );
}

export function ConveyorRig({ only, variant = "conveyor" }: { only?: string[] | null; variant?: Variant }) {
  const io =
    variant === "sorting"
      ? { i: ["Start_PB", "Stop_PB", "EStop_OK", "PE_Entry", "PE_Exit", "Metal_Sensor", "PE_Divert", "Pusher_Home"], q: ["Belt_Run", "Run_Lamp", "Pusher_Out"] }
      : variant === "bottling"
        ? { i: ["Start_PB", "Stop_PB", "EStop_OK", "PE_Entry", "PE_Exit", "PE_Filler"], q: ["Belt_Run", "Run_Lamp", "Stopper_Down", "Fill_Valve", "Case_Full"] }
        : { i: ["Start_PB", "Stop_PB", "EStop_OK", "PE_Entry", "PE_Exit"], q: ["Belt_Run", "Run_Lamp", "Jam_Lamp"] };
  const conveyorShown = useShown("conveyor");
  const station = useShown("station");
  return (
    <RigRoot only={only}>
      <BasePlate w={12.6} d={8.6} />
      {conveyorShown && <Belt />}
      <Drive />
      <Infeed />
      {Array.from({ length: SLOTS }, (_, n) => (
        <Item key={n} n={n} variant={variant} />
      ))}
      <LiveEye id="peEntry" x={SENSORS.entry} />
      <LiveEye id="peExit" x={SENSORS.exit} />
      {variant === "sorting" && (
        <>
          <MetalSensor />
          <Pusher />
        </>
      )}
      {variant === "bottling" && (
        <>
          <Filler />
          <Stopper />
          <Part id="beacon">
            <group position={[4.2, 0, 2.6]}>
              <BeaconModel tag="Case_Full" />
            </group>
          </Part>
        </>
      )}
      <Plc position={[-3.6, 0.12, -2.6]} inputs={io.i} outputs={io.q} />
      <Station position={[-3.4, 0, 3.15]} w={3.6} d={1.5}>
        {station && <PilotLamp tag="Run_Lamp" position={[-1.0, 0, -0.42]} color="#39d27f" label="RUN" />}
        {station && variant === "conveyor" && <PilotLamp tag="Jam_Lamp" position={[-0.3, 0, -0.42]} color="#ff4f4f" label="JAM" />}
      </Station>
      <PushButton part="start" position={[-4.4, 0, 3.2]} color={K.green} label="START" />
      <PushButton part="stop" position={[-3.7, 0, 3.2]} color={K.red} label="STOP" />
      <EStopButton position={[-2.7, 0, 3.1]} />
      <Wiring />
    </RigRoot>
  );
}

export const SortingRig = ({ only }: { only?: string[] | null }) => <ConveyorRig only={only} variant="sorting" />;
export const BottlingRig = ({ only }: { only?: string[] | null }) => <ConveyorRig only={only} variant="bottling" />;

