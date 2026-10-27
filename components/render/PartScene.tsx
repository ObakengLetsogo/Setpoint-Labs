"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Bounds, Environment, Lightformer } from "@react-three/drei";
import { MotorStarterRig, type RigPiece } from "@/components/stage/MotorStarterRig";

export const ICON_SETS: Record<string, RigPiece[]> = {
  pushbuttons: ["station", "start", "stop", "estop"],
  estop: ["estop"],
  plc: ["plc", "io"],
  contactor: ["contactor"],
  overload: ["overload"],
  motor: ["motor"],
  terminals: ["terminals"],
  breaker: ["mcb"],
};

export default function PartScene({ id }: { id: string }) {
  return (
    <Canvas
      dpr={2}
      camera={{ fov: 22, position: [11, 9.5, 14] }}
      gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, preserveDrawingBuffer: true }}
    >
      <Environment resolution={128} frames={1}>
        <color attach="background" args={["#eceeef"]} />
        <Lightformer form="rect" intensity={2.4} position={[0, 9, 1]} rotation-x={Math.PI / 2} scale={[16, 12, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-10, 4, 6]} rotation-y={Math.PI / 2.6} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={0.7} position={[10, 3, -6]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
      </Environment>
      <ambientLight intensity={0.2} />
      <directionalLight position={[-6, 11, 7]} intensity={1.2} />
      <Bounds fit clip margin={1.3}>
        <MotorStarterRig only={ICON_SETS[id] ?? ["contactor"]} />
      </Bounds>
    </Canvas>
  );
}
