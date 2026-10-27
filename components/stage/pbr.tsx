"use client";

import { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";

export const GLOW = "#1f9d6b";

export type V3 = [number, number, number];

const textures = new Map<string, THREE.Texture>();

function canvasTexture(key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat: [number, number] = [1, 1]) {
  const hit = textures.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  textures.set(key, t);
  return t;
}

let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

/** Fine grain kept near white, so roughness * map stays close to the preset value. */
export function grainTexture() {
  return canvasTexture("grain", 256, 256, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 215 + rand() * 40;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [3, 3]);
}

/** Long streaks along one axis, read as brushed metal. */
export function brushedTexture() {
  return canvasTexture("brushed", 512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const y = rand() * h;
      const v = 190 + rand() * 65;
      ctx.strokeStyle = `rgba(${v},${v},${v},${0.25 + rand() * 0.5})`;
      ctx.lineWidth = 0.5 + rand() * 1.2;
      ctx.beginPath();
      const x = rand() * w;
      ctx.moveTo(x - 200, y);
      ctx.lineTo(x + 200 + rand() * 200, y);
      ctx.stroke();
    }
  }, [1, 2]);
}

export type MatKind = "paint" | "plastic" | "plasticGloss" | "brushed" | "zinc" | "steel" | "brass" | "copper" | "rubber" | "lens" | "print";

const PRESETS: Record<MatKind, { metalness: number; roughness: number; clearcoat?: number; clearcoatRoughness?: number; map?: "grain" | "brushed"; bump?: number; anisotropy?: number }> = {
  paint: { metalness: 0, roughness: 0.62, map: "grain", bump: 0.6 },
  plastic: { metalness: 0, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.45, map: "grain", bump: 0.3 },
  plasticGloss: { metalness: 0, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 },
  brushed: { metalness: 0.75, roughness: 0.55, map: "brushed", bump: 0.4 },
  zinc: { metalness: 0.85, roughness: 0.38, map: "grain", bump: 0.3 },
  steel: { metalness: 1, roughness: 0.3 },
  brass: { metalness: 1, roughness: 0.3, map: "grain" },
  copper: { metalness: 1, roughness: 0.32, map: "grain" },
  rubber: { metalness: 0, roughness: 0.84, map: "grain", bump: 0.2 },
  lens: { metalness: 0, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 },
  print: { metalness: 0, roughness: 0.6 },
};

const GlowCtx = createContext(0);
export const GlowScope = GlowCtx.Provider;
export const GlowCtxValue = GlowCtx;

export function Mat({
  kind,
  color,
  emissive,
  emissiveIntensity = 0,
  map,
  transparent,
}: {
  kind: MatKind;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  map?: THREE.Texture;
  transparent?: boolean;
}) {
  const glow = useContext(GlowCtx);
  const p = PRESETS[kind];
  const tex = p.map === "brushed" ? brushedTexture() : p.map === "grain" ? grainTexture() : null;
  const lit = emissiveIntensity > 0;
  const e = lit ? emissive ?? color : glow > 0 ? GLOW : "#000000";
  const ei = lit ? emissiveIntensity : glow * 0.45;
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={p.metalness}
      roughness={p.roughness}
      clearcoat={p.clearcoat ?? 0}
      clearcoatRoughness={p.clearcoatRoughness ?? 0}
      roughnessMap={tex}
      bumpMap={p.bump ? tex : null}
      bumpScale={p.bump ? p.bump * 0.004 : 0}
      anisotropy={p.anisotropy ?? 0}
      emissive={e}
      emissiveIntensity={ei}
      toneMapped={ei < 1}
      map={map ?? null}
      transparent={transparent ?? false}
      envMapIntensity={1}
    />
  );
}

type Placement = Pick<ThreeElements["group"], "position" | "rotation" | "scale">;
type Events = Pick<ThreeElements["mesh"], "onPointerDown" | "onClick">;
type Surface = { kind?: MatKind; color: string; emissive?: string; emissiveIntensity?: number };

export function RBox({
  size,
  radius = 0.05,
  kind = "plastic",
  color,
  emissive,
  emissiveIntensity,
  onPointerDown,
  onClick,
  ...place
}: Placement & Events & Surface & { size: V3; radius?: number }) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(radius, Math.min(...size) / 2.05)}
      smoothness={4}
      bevelSegments={4}
      creaseAngle={0.5}
      onPointerDown={onPointerDown}
      onClick={onClick}
      {...place}
    >
      <Mat kind={kind} color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </RoundedBox>
  );
}

const latheCache = new Map<string, THREE.LatheGeometry>();

/** A cylinder turned on a lathe with filleted rims, so edges catch light like machined parts. */
function roundedCylinder(r: number, h: number, fillet: number, top = true, bottom = true, segments = 48) {
  const key = `${r}|${h}|${fillet}|${top}|${bottom}|${segments}`;
  const hit = latheCache.get(key);
  if (hit) return hit;
  const f = Math.min(fillet, r * 0.5, h * 0.5);
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -h / 2)];
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + ((a1 - a0) * i) / 6;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * f, cy + Math.sin(a) * f));
    }
  };
  if (bottom && f > 0) arc(r - f, -h / 2 + f, -Math.PI / 2, 0);
  else pts.push(new THREE.Vector2(r, -h / 2));
  if (top && f > 0) arc(r - f, h / 2 - f, 0, Math.PI / 2);
  else pts.push(new THREE.Vector2(r, h / 2));
  pts.push(new THREE.Vector2(0, h / 2));
  const g = new THREE.LatheGeometry(pts, segments);
  latheCache.set(key, g);
  return g;
}

export function RCyl({
  r,
  h,
  fillet = 0.02,
  segments = 48,
  kind = "plastic",
  color,
  emissive,
  emissiveIntensity,
  onPointerDown,
  onClick,
  ...place
}: Placement & Events & Surface & { r: number; h: number; fillet?: number; segments?: number }) {
  const geometry = useMemo(() => roundedCylinder(r, h, fillet, true, true, segments), [r, h, fillet, segments]);
  return (
    <mesh geometry={geometry} onPointerDown={onPointerDown} onClick={onClick} {...place}>
      <Mat kind={kind} color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}

/** A domed cap, for mushroom heads and lamp lenses. */
export function Dome({ r, squash = 0.5, kind = "plasticGloss", color, emissive, emissiveIntensity, ...place }: Placement & Surface & { r: number; squash?: number }) {
  return (
    <mesh {...place} scale={[1, squash, 1]}>
      <sphereGeometry args={[r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <Mat kind={kind} color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}

export function Screw({ position, r = 0.05, kind = "zinc", rotation = 0.5 }: { position: V3; r?: number; kind?: MatKind; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <RCyl r={r} h={r * 0.55} fillet={r * 0.25} kind={kind} color={kind === "brass" ? "#c9a55e" : "#c6ccd2"} segments={24} />
      <mesh position={[0, r * 0.28, 0]}>
        <boxGeometry args={[r * 1.5, r * 0.2, r * 0.22]} />
        <meshStandardMaterial color="#4a4f55" roughness={0.6} metalness={0.5} />
      </mesh>
    </group>
  );
}

export function ScrewRow({ from, to, y, z, count, r = 0.05, kind = "zinc" }: { from: number; to: number; y: number; z: number; count: number; r?: number; kind?: MatKind }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = count === 1 ? from : from + ((to - from) * i) / (count - 1);
        return <Screw key={i} position={[x, y, z]} r={r} kind={kind} rotation={0.3 + i * 0.7} />;
      })}
    </>
  );
}

const labelCache = new Map<string, THREE.CanvasTexture>();

/** Pad printed text: a lit decal, so it sits in the material instead of floating over it. */
export function Decal({
  text,
  position,
  width,
  height,
  color = "#1b2430",
  background,
  weight = 700,
  family = "Inter, Arial, sans-serif",
  align = "center",
  rotation,
  rotationZ = 0,
  letterSpacing = 0,
}: {
  text: string;
  position: V3;
  width: number;
  height: number;
  color?: string;
  background?: string;
  weight?: number;
  family?: string;
  align?: CanvasTextAlign;
  rotation?: V3;
  rotationZ?: number;
  letterSpacing?: number;
}) {
  const texture = useMemo(() => {
    const key = [text, width, height, color, background, weight, family, align, letterSpacing].join("|");
    const hit = labelCache.get(key);
    if (hit) return hit;
    const px = 320;
    const c = document.createElement("canvas");
    c.width = Math.max(8, Math.round(px * (width / height)));
    c.height = px;
    const ctx = c.getContext("2d")!;
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.fillStyle = color;
    const lines = text.split("\n");
    const size = Math.floor((px * 0.74) / lines.length);
    ctx.font = `${weight} ${size}px ${family}`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${letterSpacing * size}px`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    const x = align === "left" ? c.width * 0.03 : align === "right" ? c.width * 0.97 : c.width / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, (px / lines.length) * (i + 0.53), c.width * 0.96));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    labelCache.set(key, t);
    return t;
  }, [text, width, height, color, background, weight, family, align, letterSpacing]);

  return (
    <mesh position={position} rotation={rotation ?? [-Math.PI / 2, 0, rotationZ]} raycast={() => null}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} transparent roughness={0.55} metalness={0} polygonOffset polygonOffsetFactor={-4} depthWrite={false} />
    </mesh>
  );
}

const UP = new THREE.Vector3(0, 1, 0);

function Ferrule({ at, dir, radius, collar }: { at: THREE.Vector3; dir: THREE.Vector3; radius: number; collar: string }) {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(UP, dir), [dir]);
  const sleeve = at.clone().addScaledVector(dir, -0.05);
  const pin = at.clone().addScaledVector(dir, 0.03);
  return (
    <group>
      <mesh position={sleeve} quaternion={q}>
        <cylinderGeometry args={[radius * 1.45, radius * 1.15, 0.12, 14]} />
        <Mat kind="plastic" color={collar} />
      </mesh>
      <mesh position={pin} quaternion={q}>
        <cylinderGeometry args={[radius * 0.62, radius * 0.62, 0.08, 10]} />
        <Mat kind="zinc" color="#d6dadf" />
      </mesh>
    </group>
  );
}

/**
 * A flexible core. Ends marked as terminated get a ferrule seated into the terminal;
 * ends that disappear into a duct slot are left bare because they are hidden.
 */
export function Cable({
  points,
  color,
  radius = 0.04,
  glow = 0,
  ferrules = [false, false],
  collar = "#f2f2f0",
  kind = "rubber",
}: {
  points: V3[];
  color: string;
  radius?: number;
  glow?: number;
  ferrules?: [boolean, boolean];
  collar?: string;
  kind?: MatKind;
}) {
  const key = JSON.stringify(points);
  const curve = useMemo(() => {
    const pts = (JSON.parse(key) as V3[]).map((p) => new THREE.Vector3(...p));
    return new THREE.CatmullRomCurve3(pts, false, "centripetal");
  }, [key]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 96, radius, 12, false), [curve, radius]);
  const ends = useMemo(
    () => [
      { at: curve.getPoint(0), dir: curve.getTangent(0).negate() },
      { at: curve.getPoint(1), dir: curve.getTangent(1) },
    ],
    [curve],
  );
  return (
    <group>
      <mesh geometry={geometry}>
        <Mat kind={kind} color={color} emissive={color} emissiveIntensity={glow} />
      </mesh>
      {ends.map((e, i) => (ferrules[i] ? <Ferrule key={i} at={e.at} dir={e.dir} radius={radius} collar={collar} /> : null))}
    </group>
  );
}
