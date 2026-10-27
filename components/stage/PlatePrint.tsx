"use client";

import { useMemo } from "react";
import * as THREE from "three";

const W = 12.4;
const D = 8.4;
const K = 160;

type Zone = { x0: number; z0: number; x1: number; z1: number; label: string };

const ZONES: Zone[] = [
  { x0: -5.95, z0: -4.1, x1: 1.75, z1: 1.8, label: "A · CONTROL PANEL" },
  { x0: -5.35, z0: 2.0, x1: -1.25, z1: 3.95, label: "B · OPERATOR" },
  { x0: 2.15, z0: -0.25, x1: 6.1, z1: 2.95, label: "C · LOAD · 400 V 3~" },
];

const TAGS: { x: number; z: number; text: string }[] = [
  { x: -5.62, z: 1.15, text: "X1" },
  { x: -4.3, z: 4.02, text: "S1" },
  { x: -3.4, z: 4.02, text: "S2" },
  { x: -2.25, z: 4.02, text: "S0" },
  { x: 3.9, z: 2.62, text: "M1" },
];

function draw(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W * K;
  c.height = D * K;
  const g = c.getContext("2d")!;
  const px = (x: number) => (x + W / 2) * K;
  const pz = (z: number) => (z + D / 2) * K;

  g.fillStyle = "#b3b8bd";
  g.fillRect(0, 0, c.width, c.height);

  g.fillStyle = "#a5aab0";
  for (let x = -W / 2 + 0.3; x < W / 2 - 0.2; x += 0.25) {
    for (let z = -D / 2 + 0.3; z < D / 2 - 0.2; z += 0.25) {
      g.beginPath();
      g.arc(px(x), pz(z), 2.1, 0, Math.PI * 2);
      g.fill();
    }
  }

  g.strokeStyle = "#cfd3d7";
  g.lineWidth = 3;
  g.strokeRect(px(-W / 2 + 0.18), pz(-D / 2 + 0.18), (W - 0.36) * K, (D - 0.36) * K);

  g.font = `600 ${0.15 * K}px ui-monospace, Menlo, monospace`;
  g.fillStyle = "#dfe2e5";
  g.textAlign = "center";
  g.textBaseline = "top";
  for (let x = -6; x <= 6; x += 0.5) {
    const major = Number.isInteger(x);
    g.beginPath();
    g.moveTo(px(x), pz(D / 2 - 0.18));
    g.lineTo(px(x), pz(D / 2 - 0.18 - (major ? 0.22 : 0.12)));
    g.stroke();
    if (major && Math.abs(x) < 6) g.fillText(String((x + 6) * 50), px(x), pz(D / 2 - 0.62));
  }

  g.setLineDash([0.12 * K, 0.08 * K]);
  g.lineWidth = 3;
  g.strokeStyle = "#d3d6da";
  g.textAlign = "left";
  g.textBaseline = "bottom";
  g.font = `700 ${0.13 * K}px ui-monospace, Menlo, monospace`;
  for (const z of ZONES) {
    g.strokeRect(px(z.x0), pz(z.z0), (z.x1 - z.x0) * K, (z.z1 - z.z0) * K);
    g.fillStyle = "#e4e7ea";
    g.fillText(z.label, px(z.x0) + 0.06 * K, pz(z.z0) - 0.06 * K);
  }
  g.setLineDash([]);

  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const t of TAGS) {
    g.font = `700 ${0.17 * K}px ui-monospace, Menlo, monospace`;
    const w = g.measureText(t.text).width + 0.14 * K;
    g.fillStyle = "#1b2430";
    g.beginPath();
    g.roundRect(px(t.x) - w / 2, pz(t.z) - 0.13 * K, w, 0.26 * K, 0.05 * K);
    g.fill();
    g.fillStyle = "#f8f3e8";
    g.fillText(t.text, px(t.x), pz(t.z) + 0.01 * K);
  }

  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = "#f26b1d";
  g.fillRect(px(3.85), pz(3.3), 0.05 * K, 0.36 * K);
  g.fillStyle = "#f4f5f6";
  g.font = `800 ${0.18 * K}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  g.fillText("SETPOINT LABS", px(3.97), pz(3.5));
  g.fillStyle = "#dfe2e5";
  g.font = `600 ${0.13 * K}px ui-monospace, Menlo, monospace`;
  g.font = `600 ${0.09 * K}px ui-monospace, Menlo, monospace`;
  g.fillText("TRAINER 01 · DOL STARTER", px(3.97), pz(3.64));

  return c;
}

export function PlatePrint() {
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(draw());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  return (
    <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[W, D]} />
      <meshStandardMaterial map={texture} roughness={0.7} metalness={0} />
    </mesh>
  );
}
