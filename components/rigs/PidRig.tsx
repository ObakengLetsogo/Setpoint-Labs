"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSim } from "@/store/sim";
import { Decal, RBox, RCyl } from "@/components/stage/pbr";
import { K, Part, Selector } from "./kit";
import { TankRig } from "./ProcessRigs";

const W = 640;
const H = 400;
const TREND = 240;
const STEEL = "#c9ced4";
const PIPE_Y = 4.55;

type Sample = { sp: number; pv: number; cv: number };

/** The loop faceplate: SP, PV and CV as numbers and as a 60 s trend, the way a tuner watches a loop. */
function useFaceplate() {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);
  const draw = useRef({ canvas, texture });
  useEffect(() => {
    draw.current = { canvas, texture };
  }, [canvas, texture]);
  const trend = useRef<Sample[]>([]);
  const last = useRef(0);
  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - last.current < 0.25) return;
    last.current = now;
    const { physical, memory } = useSim.getState();
    const s: Sample = { sp: Number(physical.sp ?? 0), pv: Number(physical.level ?? 0) * 100, cv: Number(memory.Valve_CV ?? 0) };
    trend.current.push(s);
    if (trend.current.length > TREND) trend.current.shift();
    const auto = Boolean(memory.Run_Lamp);
    const g = draw.current.canvas.getContext("2d")!;
    g.fillStyle = "#eef1f4";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#1b2430";
    g.fillRect(0, 0, W, 44);
    g.fillStyle = "#ffffff";
    g.font = "700 22px Inter, Arial, sans-serif";
    g.fillText("LIC1 · TANK LEVEL", 18, 30);
    g.fillStyle = auto ? "#45d483" : "#f5a524";
    g.font = "700 16px ui-monospace, Menlo, monospace";
    g.fillText(auto ? "AUTO" : "MAN", W - 70, 29);
    const tile = (x: number, label: string, v: number, color: string) => {
      g.fillStyle = "#ffffff";
      g.fillRect(x, 58, 190, 64);
      g.fillStyle = color;
      g.fillRect(x, 58, 6, 64);
      g.fillStyle = "#5b6068";
      g.font = "600 14px Inter, Arial, sans-serif";
      g.fillText(label, x + 16, 78);
      g.fillStyle = "#1b2430";
      g.font = "800 28px Inter, Arial, sans-serif";
      g.fillText(`${v.toFixed(1)} %`, x + 16, 111);
    };
    tile(20, "SP  setpoint", s.sp, "#1b2430");
    tile(225, "PV  level", s.pv, "#3d8fd6");
    tile(430, "CV  valve", s.cv, "#f26b1d");
    const top = 140;
    const h = 240;
    g.fillStyle = "#ffffff";
    g.fillRect(20, top, 600, h);
    g.strokeStyle = "#d4d8dc";
    g.lineWidth = 1;
    for (const f of [0.25, 0.5, 0.75]) {
      g.beginPath();
      g.moveTo(20, top + h * (1 - f));
      g.lineTo(620, top + h * (1 - f));
      g.stroke();
    }
    const line = (key: keyof Sample, color: string, dash: number[] = []) => {
      g.strokeStyle = color;
      g.lineWidth = 3;
      g.setLineDash(dash);
      g.beginPath();
      trend.current.forEach((v, i) => {
        const x = 20 + (i / (TREND - 1)) * 600;
        const y = top + h * (1 - Math.max(0, Math.min(100, v[key])) / 100);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.stroke();
      g.setLineDash([]);
    };
    line("sp", "#1b2430", [10, 8]);
    line("cv", "#f26b1d");
    line("pv", "#3d8fd6");
    g.fillStyle = "#5b6068";
    g.font = "600 13px Inter, Arial, sans-serif";
    g.fillText("TREND · 60 S   SP dashed · PV blue · CV orange", 30, top + 18);
    draw.current.texture.needsUpdate = true;
  });
  return texture;
}

function Faceplate() {
  const texture = useFaceplate();
  return (
    <Part id="faceplate">
      <group position={[4.3, 0, -1.6]} rotation={[0, -0.45, 0]}>
        <RBox size={[0.3, 1.8, 0.3]} position={[0, 0.9, -0.2]} radius={0.05} kind="paint" color={K.paint} />
        <group position={[0, 2.65, 0]} rotation={[-0.1, 0, 0]}>
          <RBox size={[2.3, 1.62, 0.16]} radius={0.06} kind="plastic" color={K.housingDark} />
          <mesh position={[0, 0.04, 0.085]}>
            <planeGeometry args={[2.08, 1.3]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </Part>
  );
}

/** Dial gauge whose needle follows a 0..1 physical value. */
function Gauge({ valueKey, max = 1, label, position }: { valueKey: string; max?: number; label: string; position: [number, number, number] }) {
  const needle = useRef<THREE.Group>(null);
  useFrame(() => {
    const v = Math.max(0, Math.min(1, Number(useSim.getState().physical[valueKey] ?? 0) / max));
    if (needle.current) needle.current.rotation.z = Math.PI * 0.75 - v * Math.PI * 1.5;
  });
  return (
    <group position={position}>
      <RCyl r={0.26} h={0.08} rotation={[Math.PI / 2, 0, 0]} kind="steel" color={STEEL} fillet={0.02} />
      <mesh position={[0, 0, 0.045]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color="#f7f8f9" />
      </mesh>
      <group ref={needle} position={[0, 0, 0.055]}>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.02, 0.18, 0.01]} />
          <meshStandardMaterial color="#d23c3c" />
        </mesh>
      </group>
      <Decal text={label} position={[0, -0.36, 0]} width={0.5} height={0.1} color="#4d535b" weight={700} rotation={[0, 0, 0]} />
    </group>
  );
}

export function PidRig({ only }: { only?: string[] | null }) {
  return (
    <>
      <TankRig only={only} />
      {/* positioner on the control valve, showing its travel */}
      <group position={[-1.4, PIPE_Y + 0.75, 0.2]}>
        <RBox size={[0.42, 0.34, 0.3]} radius={0.05} kind="paint" color="#2457a6" />
        <Gauge valueKey="valve" label="FV1" position={[0, 0.55, 0.12]} />
      </group>
      <Part id="ft">
        <group position={[-3.0, PIPE_Y, 0.2]}>
          <RCyl r={0.2} h={0.5} rotation={[0, 0, Math.PI / 2]} kind="paint" color="#3e5f86" fillet={0.03} />
          <RBox size={[0.34, 0.3, 0.3]} position={[0, 0.36, 0]} radius={0.05} kind="paint" color="#3e5f86" />
          <Decal text="FT1" position={[0, 0.52, 0]} width={0.26} height={0.12} color="#e9edf2" weight={800} />
        </group>
      </Part>
      <Part id="supply">
        <Gauge valueKey="supply" max={1.5} label="SUPPLY" position={[-4.6, 3.3, 0.35]} />
      </Part>
      <Selector part="auto" position={[-2.9, 0, 3.2]} label="HAND AUTO" />
      <Faceplate />
    </>
  );
}
