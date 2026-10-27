"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Bounds, Environment, Lightformer } from "@react-three/drei";
import { useEffect } from "react";
import { MotorStarterRig } from "@/components/stage/MotorStarterRig";
import { INITIAL_PHYSICAL } from "@/rigs/motorStarter";
import { useSim } from "@/store/sim";
import type { RenderSpec, RenderState } from "./labRenders";

const STATES: Record<RenderState, () => void> = {
  idle: () => useSim.setState({ running: false, memory: {}, physical: INITIAL_PHYSICAL }),
  run: () =>
    useSim.setState({
      running: true,
      memory: { Motor_Run: true, Run_Lamp: true, Run_Seal: true },
      physical: { ...INITIAL_PHYSICAL, motorSpeed: 1, current: 0.6, heat: 0.3 },
    }),
  fault: () =>
    useSim.setState({ running: true, memory: { Fault_Lamp: true }, physical: { ...INITIAL_PHYSICAL, overloadTripped: true, heat: 1 } }),
  estop: () => useSim.setState({ running: true, memory: {}, physical: { ...INITIAL_PHYSICAL, estopPressed: true } }),
};

export default function PartScene({ spec }: { spec: RenderSpec }) {
  const { az = 0.67, el = 0.49, state = "idle" } = spec;
  useEffect(() => STATES[state](), [state]);
  const r = 20;
  const position: [number, number, number] = [r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az)];
  return (
    <Canvas
      dpr={2}
      camera={{ fov: 22, position }}
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
        <MotorStarterRig only={spec.only} />
      </Bounds>
    </Canvas>
  );
}
