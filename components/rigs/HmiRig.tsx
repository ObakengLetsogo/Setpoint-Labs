"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useSim } from "@/store/sim";
import { Decal, RBox } from "@/components/stage/pbr";
import { K, Part } from "./kit";
import { TankRig } from "./ProcessRigs";

const W = 640;
const H = 400;
const TREND = 120;

/**
 * The touch panel's picture, drawn on a canvas from the live tags: valve state, level bar, alarm
 * banner and a level trend. It is redrawn a few times a second, like a real HMI's refresh.
 */
function useScreen() {
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
  const trend = useRef<number[]>([]);
  const last = useRef(0);
  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - last.current < 0.25) return;
    last.current = now;
    const { physical, memory, running } = useSim.getState();
    const level = Math.max(0, Math.min(1, Number(physical.level ?? 0)));
    trend.current.push(level);
    if (trend.current.length > TREND) trend.current.shift();
    const g = draw.current.canvas.getContext("2d")!;
    g.fillStyle = "#eef1f4";
    g.fillRect(0, 0, W, H);
    // title bar
    g.fillStyle = "#1b2430";
    g.fillRect(0, 0, W, 44);
    g.fillStyle = "#ffffff";
    g.font = "700 22px Inter, Arial, sans-serif";
    g.fillText("TANK T1 · OVERVIEW", 18, 30);
    g.font = "600 16px ui-monospace, Menlo, monospace";
    g.fillStyle = running ? "#45d483" : "#f5a524";
    g.fillText(running ? "PLC RUN" : "PLC STOP", W - 110, 29);
    // tank and level bar
    g.strokeStyle = "#5b6068";
    g.lineWidth = 3;
    g.strokeRect(30, 70, 120, 240);
    g.fillStyle = "#3d8fd6";
    g.fillRect(32, 70 + 240 * (1 - level) + 1, 116, 240 * level - 2);
    g.fillStyle = "#1b2430";
    g.font = "700 28px Inter, Arial, sans-serif";
    g.fillText(`${Math.round(level * 100)} %`, 40, 345);
    // valve and auto status
    const valve = Boolean(memory.Inlet_Valve);
    const auto = Boolean(memory.Run_Lamp);
    const tile = (x: number, y: number, label: string, on: boolean, onText: string, offText: string, color: string) => {
      g.fillStyle = on ? color : "#c9cdd2";
      g.fillRect(x, y, 200, 56);
      g.fillStyle = on ? "#ffffff" : "#33383e";
      g.font = "600 14px Inter, Arial, sans-serif";
      g.fillText(label, x + 12, y + 20);
      g.font = "800 20px Inter, Arial, sans-serif";
      g.fillText(on ? onText : offText, x + 12, y + 45);
    };
    tile(180, 70, "INLET VALVE Y1", valve, "OPEN", "CLOSED", "#2457a6");
    tile(400, 70, "MODE", auto, "AUTO", "STOPPED", "#22a061");
    // trend
    g.fillStyle = "#ffffff";
    g.fillRect(180, 140, 420, 170);
    g.strokeStyle = "#d4d8dc";
    g.lineWidth = 1;
    for (const f of [0.25, 0.5, 0.75]) {
      g.beginPath();
      g.moveTo(180, 140 + 170 * (1 - f));
      g.lineTo(600, 140 + 170 * (1 - f));
      g.stroke();
    }
    g.strokeStyle = "#3d8fd6";
    g.lineWidth = 3;
    g.beginPath();
    trend.current.forEach((v, i) => {
      const x = 180 + (i / (TREND - 1)) * 420;
      const y = 140 + 170 * (1 - v);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.stroke();
    g.fillStyle = "#5b6068";
    g.font = "600 13px Inter, Arial, sans-serif";
    g.fillText("LEVEL TREND · 30 S", 188, 158);
    // alarm banner
    const alarm = Boolean(memory.Alarm_Lamp);
    const acked = Boolean(memory.Alarm_Acked);
    const flash = alarm && !acked && Math.floor(now * 2) % 2 === 0;
    g.fillStyle = alarm ? (acked ? "#f5a524" : flash ? "#d23c3c" : "#7a1f1f") : "#dfe3e7";
    g.fillRect(0, H - 56, W, 56);
    g.fillStyle = alarm ? "#ffffff" : "#5b6068";
    g.font = "700 18px Inter, Arial, sans-serif";
    g.fillText(alarm ? (acked ? "HIGH LEVEL T1 · ACKNOWLEDGED" : "HIGH LEVEL T1 · PRESS ACK") : "NO ACTIVE ALARMS", 18, H - 22);
    draw.current.texture.needsUpdate = true;
  });
  return texture;
}

function ScreenButton({ part, x, color, label }: { part: string; x: number; color: string; label: string }) {
  const pressed = useSim((s) => Boolean(s.physical[part]));
  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useSim.getState().press(part, true);
    useSim.getState().select(part);
  };
  return (
    <Part id={part}>
      <group position={[x, 0, pressed ? -0.02 : 0]}>
        <RBox size={[0.6, 0.26, 0.06]} radius={0.03} kind="plastic" color={color} onPointerDown={down} />
        <Decal text={label} position={[0, 0, 0.035]} width={0.5} height={0.14} color="#ffffff" weight={800} rotation={[0, 0, 0]} />
      </group>
    </Part>
  );
}

function HmiPanel() {
  const texture = useScreen();
  return (
    <group position={[4.2, 0, -1.8]} rotation={[0, -0.35, 0]}>
      <RBox size={[0.3, 1.6, 0.3]} position={[0, 0.8, -0.2]} radius={0.05} kind="paint" color={K.paint} />
      <Part id="hmi">
        <group position={[0, 2.5, 0]} rotation={[-0.12, 0, 0]}>
          <RBox size={[2.3, 1.62, 0.16]} radius={0.06} kind="plastic" color={K.housingDark} />
          <mesh position={[0, 0.06, 0.085]}>
            <planeGeometry args={[2.08, 1.3]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
          <Decal text="HMI1" position={[-0.92, -0.72, 0.085]} width={0.3} height={0.07} color="#97a1ad" weight={700} rotation={[0, 0, 0]} />
        </group>
      </Part>
      <group position={[0, 1.55, 0.1]} rotation={[-0.12, 0, 0]}>
        <ScreenButton part="hmiStart" x={-0.7} color={K.green} label="START" />
        <ScreenButton part="hmiStop" x={0} color={K.red} label="STOP" />
        <ScreenButton part="hmiAck" x={0.7} color="#d99a14" label="ACK" />
      </group>
    </group>
  );
}

export function HmiRig({ only }: { only?: string[] | null }) {
  return (
    <>
      <TankRig only={only} />
      <HmiPanel />
    </>
  );
}
