"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useInputs, useRig, useSim } from "@/store/sim";
import { Decal, Dome, GlowScope, RBox, RCyl, Screw, ScrewRow, type V3 } from "@/components/stage/pbr";

/** Shared palette so every rig reads as one product family. */
export const K = {
  housing: "#e6e8ea",
  housingDark: "#33383e",
  cover: "#4a5058",
  enclosure: "#d9dcdf",
  zinc: "#c4cad0",
  alu: "#b4bbc2",
  aluDark: "#9ea6ae",
  paint: "#4a5058",
  print: "#f2f0ea",
  orange: "#f26b1d",
  green: "#22a061",
  red: "#d23c3c",
  yellow: "#f0bf22",
  blue: "#2457a6",
  water: "#3d8fd6",
  black: "#23272c",
  grey: "#8a9098",
  frame: "#5b636c",
  belt: "#2b2f34",
};

/* ------------------------------------------------------------ framework */

export const OnlyCtx = createContext<string[] | null>(null);
export const useShown = (piece: string) => {
  const only = useContext(OnlyCtx);
  return !only || only.includes(piece);
};

/** Live physical value of the current rig. */
export const usePhys = (key: string) => useSim((s) => s.physical[key]);
export const usePhysNum = (key: string) => Number(useSim((s) => s.physical[key]) ?? 0);
export const useBit = (tag: string) => useSim((s) => Boolean(s.memory[tag]));

function useExplodeY(offset: number) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const { exploded, settings } = useSim.getState();
    const target = exploded ? offset : 0;
    g.position.y = settings.reduceMotion ? target : THREE.MathUtils.damp(g.position.y, target, 5, dt);
  });
  return ref;
}

/** A selectable part: hover glow, click to select, lifts when the rig is exploded. */
export function Part({ id, children }: { id: string; children: ReactNode }) {
  const part = useRig().parts.find((p) => p.id === id);
  const ref = useExplodeY(part?.explode ?? 1);
  const glow = useSim((s) => s.hovered === id || s.selected === id);
  const shown = useShown(id);
  if (!shown) return null;
  const { select, hover } = useSim.getState();
  return (
    <group
      ref={ref}
      name={`part-${id}`}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(id);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        hover(id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hover(null);
        document.body.style.cursor = "";
      }}
    >
      <GlowScope value={glow ? 1 : 0}>{children}</GlowScope>
    </group>
  );
}

export function Explode({ offset, children }: { offset: number; children: ReactNode }) {
  const ref = useExplodeY(offset);
  return <group ref={ref}>{children}</group>;
}

/** Root for a rig scene: gentle float, optional turntable, and releasing held buttons when the pointer lifts. */
export function RigRoot({ only, children }: { only?: string[] | null; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const rig = useRig();

  useEffect(() => {
    const release = () => {
      const { physical, press } = useSim.getState();
      for (const c of rig.controls) if (c.kind === "hold" && physical[c.key]) press(c.part, false);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [rig]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const { settings } = useSim.getState();
    if (settings.turntable && !settings.reduceMotion) spin.current += dt * 0.18;
    g.rotation.y = spin.current;
    g.position.y = settings.reduceMotion || only ? 0 : Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
  });

  return (
    <OnlyCtx.Provider value={only ?? null}>
      <group ref={group}>{children}</group>
    </OnlyCtx.Provider>
  );
}

/* ------------------------------------------------------------ hardware */

export function Led({ on, color = "#3ee08a", position }: { on: boolean; color?: string; position: V3 }) {
  return <RBox size={[0.13, 0.05, 0.09]} radius={0.02} position={position} kind="lens" color={on ? color : "#59616b"} emissive={color} emissiveIntensity={on ? 12 : 0} />;
}

/** Galvanised base plate with corner screws. */
export function BasePlate({ w, d, x = 0, z = 0 }: { w: number; d: number; x?: number; z?: number }) {
  if (!useShown("plate")) return null;
  return (
    <group position={[x, 0, z]}>
      <RBox size={[w, 0.24, d]} position={[0, -0.12, 0]} radius={0.1} kind="zinc" color="#b9bec3" />
      {[-w / 2 + 0.35, w / 2 - 0.35].flatMap((sx) => [-d / 2 + 0.35, d / 2 - 0.35].map((sz) => <Screw key={`${sx}${sz}`} position={[sx, 0.015, sz]} r={0.12} kind="zinc" />))}
    </group>
  );
}

export function DinRail({ x, z, length }: { x: number; z: number; length: number }) {
  return (
    <group position={[x, 0, z]}>
      <RBox size={[length, 0.06, 0.5]} position={[0, 0.03, 0]} radius={0.012} kind="zinc" color={K.zinc} />
      <RBox size={[length, 0.12, 0.08]} position={[0, 0.1, -0.21]} radius={0.012} kind="zinc" color={K.zinc} />
      <RBox size={[length, 0.12, 0.08]} position={[0, 0.1, 0.21]} radius={0.012} kind="zinc" color={K.zinc} />
    </group>
  );
}

function TerminalCover({ width, z, count, y }: { width: number; z: number; count: number; y: number }) {
  return (
    <group position={[0, 0, z]}>
      <RBox size={[width, 0.1, 0.36]} position={[0, y, 0]} radius={0.03} kind="plastic" color={K.cover} />
      <ScrewRow from={-width / 2 + 0.13} to={width / 2 - 0.13} y={y + 0.065} z={0} count={count} r={0.045} kind="brass" />
    </group>
  );
}

/**
 * Compact PLC with its I/O status LEDs on the front panel, shown as one part "plc".
 * inputs and outputs are tag names in address order.
 */
export function Plc({ position, inputs, outputs, model = "CPU 1214 DC/DC/DC" }: { position: V3; inputs: string[]; outputs: string[]; model?: string }) {
  const running = useSim((s) => s.running);
  const hasError = useSim((s) => s.error !== null);
  const memory = useSim((s) => s.memory);
  const live = useInputs();
  const rows = Math.max(inputs.length, outputs.length);
  const depth = Math.max(2.0, 0.6 + rows * 0.17 + 0.4);
  return (
    <Part id="plc">
      <group position={position}>
        <RBox size={[2.4, 1.38, depth]} position={[0, 0.69, 0]} radius={0.07} color={K.housing} />
        <TerminalCover width={2.3} z={-depth / 2 + 0.24} count={11} y={1.43} />
        <TerminalCover width={2.3} z={depth / 2 - 0.24} count={11} y={1.43} />
        <RBox size={[1.2, 0.04, depth - 1.0]} position={[-0.5, 1.395, 0]} radius={0.02} kind="plastic" color={K.housingDark} />
        <RBox size={[0.07, 0.03, depth - 1.1]} position={[-1.05, 1.42, 0]} radius={0.01} kind="plastic" color={K.orange} />
        <Decal text="SETPOINT" position={[-0.45, 1.42, -depth / 2 + 0.75]} width={0.9} height={0.16} color="#f3f1ec" family='"Arial Narrow", Arial, sans-serif' weight={800} letterSpacing={0.08} />
        <Decal text={`PLC1  ${model}`} position={[-0.45, 1.42, -depth / 2 + 0.93]} width={0.95} height={0.08} color="#97a1ad" weight={600} />
        <RBox size={[0.68, 0.025, 0.24]} position={[-0.5, 1.42, -depth / 2 + 1.2]} radius={0.01} kind="lens" color="#141a20" />
        <Decal text={running ? "RUN" : "STOP"} position={[-0.5, 1.436, -depth / 2 + 1.2]} width={0.4} height={0.13} color={running ? "#45d483" : "#f5a524"} family="ui-monospace, Menlo, monospace" />
        <Led on={running} position={[-0.75, 1.415, depth / 2 - 0.75]} />
        <Led on={!running} color="#ffb020" position={[-0.5, 1.415, depth / 2 - 0.75]} />
        <Led on={hasError} color="#ff4d4d" position={[-0.25, 1.415, depth / 2 - 0.75]} />
        <RBox size={[0.86, 0.04, depth - 1.0]} position={[0.62, 1.395, 0]} radius={0.02} kind="plastic" color={K.housingDark} />
        <Decal text="DI    DQ" position={[0.62, 1.42, -depth / 2 + 0.6]} width={0.6} height={0.09} color="#97a1ad" weight={700} />
        {inputs.map((t, i) => (
          <Led key={t} on={Boolean(live[t])} position={[0.42, 1.415, -depth / 2 + 0.78 + i * 0.17]} />
        ))}
        {outputs.map((t, i) => (
          <Led key={t} on={Boolean(memory[t])} color="#4da3ff" position={[0.82, 1.415, -depth / 2 + 0.78 + i * 0.17]} />
        ))}
      </group>
    </Part>
  );
}

/** Operator station enclosure; put buttons and lamps on its top face (y = 1.1). */
export function Station({ position, w, d, children }: { position: V3; w: number; d: number; children?: ReactNode }) {
  const shown = useShown("station");
  return (
    <group position={position}>
      {shown && (
        <>
          <RBox size={[w, 1.08, d]} position={[0, 0.54, 0]} radius={0.14} kind="paint" color={K.enclosure} />
          <RBox size={[w - 0.16, 0.02, d - 0.16]} position={[0, 1.085, 0]} radius={0.01} kind="plastic" color="#e8eaec" />
          {[-w / 2 + 0.2, w / 2 - 0.2].flatMap((x) => [-d / 2 + 0.17, d / 2 - 0.17].map((z) => <Screw key={`${x}${z}`} position={[x, 1.1, z]} r={0.05} />))}
        </>
      )}
      {children}
    </group>
  );
}

/** Momentary pushbutton bound to the hold control of `part`. */
export function PushButton({ part, position, color, label }: { part: string; position: V3; color: string; label: string }) {
  const rig = useRig();
  const control = rig.controls.find((c) => c.kind === "hold" && c.part === part);
  const key = control && control.kind === "hold" ? control.key : "";
  const pressed = useSim((s) => Boolean(s.physical[key]));
  const cap = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (cap.current) cap.current.position.y = THREE.MathUtils.damp(cap.current.position.y, pressed ? -0.09 : 0, 25, dt);
  });
  const down = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useSim.getState().press(part, true);
    useSim.getState().select(part);
  };
  return (
    <Part id={part}>
      <group position={position}>
        <RCyl r={0.33} h={0.09} position={[0, 1.13, 0]} kind="steel" color="#d9dde1" fillet={0.035} />
        <group ref={cap}>
          <RCyl r={0.25} h={0.2} position={[0, 1.27, 0]} kind="plastic" color={color} fillet={0.06} onPointerDown={down} />
        </group>
        <RBox size={[0.6, 0.02, 0.17]} position={[0, 1.1, 0.5]} radius={0.008} kind="plastic" color="#2b3036" />
        <Decal text={label} position={[0, 1.112, 0.5]} width={0.48} height={0.11} color="#f2f4f6" letterSpacing={0.06} />
      </group>
    </Part>
  );
}

/** Rotary selector switch bound to a toggle control. */
export function Selector({ part, position, label }: { part: string; position: V3; label: string }) {
  const rig = useRig();
  const control = rig.controls.find((c) => c.kind === "toggle" && c.part === part);
  const key = control && control.kind === "toggle" ? control.key : "";
  const on = useSim((s) => Boolean(s.physical[key]));
  return (
    <Part id={part}>
      <group
        position={position}
        onPointerDown={(e) => {
          e.stopPropagation();
          useSim.getState().select(part);
          if (control) useSim.getState().act(control);
        }}
      >
        <RCyl r={0.33} h={0.09} position={[0, 1.13, 0]} kind="steel" color="#d9dde1" fillet={0.035} />
        <RCyl r={0.24} h={0.12} position={[0, 1.22, 0]} kind="plastic" color="#2b3036" fillet={0.04} />
        <group position={[0, 1.3, 0]} rotation={[0, on ? -Math.PI / 4 : Math.PI / 4, 0]}>
          <RBox size={[0.4, 0.12, 0.1]} radius={0.04} kind="plastic" color="#3a3f45" />
          <RBox size={[0.12, 0.02, 0.03]} position={[0.12, 0.065, 0]} radius={0.008} kind="plastic" color="#f2f4f6" />
        </group>
        <RBox size={[0.6, 0.02, 0.17]} position={[0, 1.1, 0.5]} radius={0.008} kind="plastic" color="#2b3036" />
        <Decal text={label} position={[0, 1.112, 0.5]} width={0.48} height={0.11} color="#f2f4f6" letterSpacing={0.06} />
      </group>
    </Part>
  );
}

/** Pilot lamp that follows an output tag. */
export function PilotLamp({ tag, position, color, label }: { tag: string; position: V3; color: string; label: string }) {
  const on = useBit(tag);
  return (
    <group position={position}>
      <RCyl r={0.25} h={0.08} position={[0, 1.13, 0]} kind="steel" color="#d9dde1" fillet={0.03} />
      <RCyl r={0.19} h={0.08} position={[0, 1.2, 0]} kind="lens" color={on ? color : "#c9d3cd"} emissive={color} emissiveIntensity={on ? 12 : 0} fillet={0.02} />
      <Dome r={0.19} squash={0.45} position={[0, 1.24, 0]} kind="lens" color={on ? color : "#d7dfda"} emissive={color} emissiveIntensity={on ? 12 : 0} />
      <Decal text={label} position={[0, 1.105, 0.4]} width={0.5} height={0.09} color="#5f646b" weight={700} />
    </group>
  );
}

/**
 * TEFC induction motor along +X, shaft at +X. speedKey is a 0..1 physical value that spins the coupling.
 * Origin is the centre of the foot plate on the floor.
 */
export function MotorModel({ speedKey, scale = 1, label = "3~ MOTOR  TEFC  IE3" }: { speedKey: string; scale?: number; label?: string }) {
  const coupling = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (coupling.current) coupling.current.rotation.x -= Number(useSim.getState().physical[speedKey] ?? 0) * dt * 14;
  });
  const ribs = Array.from({ length: 18 }, (_, i) => (i / 18) * Math.PI * 2);
  const y = 1.42;
  return (
    <group scale={scale}>
      <RBox size={[2.6, 0.12, 1.9]} position={[-0.1, 0.06, 0]} radius={0.04} kind="zinc" color="#b9c0c7" />
      {[-0.85, 0.85].map((x) => (
        <RBox key={x} size={[0.46, 0.4, 1.6]} position={[x, 0.32, 0]} radius={0.05} kind="brushed" color={K.aluDark} />
      ))}
      <group position={[0, y, 0]}>
        <group rotation={[0, 0, Math.PI / 2]}>
          <RCyl r={0.92} h={2.3} kind="brushed" color={K.alu} segments={48} fillet={0.03} />
        </group>
        {ribs.map((a) => (
          <group key={a} rotation={[a, 0, 0]}>
            <RBox size={[2.18, 0.14, 0.045]} position={[0, 0.96, 0]} radius={0.018} kind="brushed" color={K.alu} />
          </group>
        ))}
        <group rotation={[0, 0, Math.PI / 2]}>
          <RCyl r={0.98} h={0.22} position={[0, -1.24, 0]} kind="brushed" color={K.aluDark} segments={48} fillet={0.05} />
          <RCyl r={0.98} h={0.2} position={[0, 1.24, 0]} kind="brushed" color={K.aluDark} segments={48} fillet={0.05} />
        </group>
        <group position={[-1.68, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <RCyl r={1.0} h={0.72} kind="paint" color={K.paint} segments={48} fillet={0.08} />
        </group>
        <group ref={coupling} position={[1.42, 0, 0]}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <RCyl r={0.11} h={0.62} position={[0, -0.22, 0]} kind="steel" color="#d5dade" segments={24} fillet={0.02} />
            <RCyl r={0.3} h={0.28} position={[0, -0.6, 0]} kind="steel" color="#aeb6bd" segments={32} fillet={0.04} />
            <RCyl r={0.3} h={0.06} position={[0, -0.76, 0]} kind="plastic" color={K.orange} segments={32} fillet={0.015} />
          </group>
          <RBox size={[0.3, 0.05, 0.06]} position={[0.18, 0.11, 0]} radius={0.01} kind="steel" color="#9aa2aa" />
        </group>
      </group>
      <RBox size={[0.9, 0.46, 0.84]} position={[-0.15, 2.6, 0]} radius={0.06} kind="brushed" color={K.alu} />
      <RBox size={[0.98, 0.07, 0.92]} position={[-0.15, 2.86, 0]} radius={0.03} kind="brushed" color={K.aluDark} />
      <group position={[0.15, y + 0.68, 0.7]} rotation={[0.8, 0, 0]}>
        <RBox size={[1.0, 0.02, 0.5]} radius={0.008} kind="zinc" color="#d9dde1" />
        <Decal text={label} position={[0, 0.012, 0]} width={0.92} height={0.16} color="#3a4047" weight={700} />
      </group>
    </group>
  );
}

/**
 * Three pole contactor on a DIN rail footprint, with an indicator flag that moves when it closes.
 * Origin is the bottom centre; it stands 1.4 tall.
 */
export function ContactorBody({ closed, label }: { closed: boolean; label: string }) {
  const flag = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (flag.current) flag.current.position.z = THREE.MathUtils.damp(flag.current.position.z, closed ? 0.06 : -0.06, 16, dt);
  });
  return (
    <group>
      <RBox size={[1.0, 0.95, 1.72]} position={[0, 0.475, 0]} radius={0.06} color="#dfe2e5" />
      <RBox size={[0.84, 0.3, 1.02]} position={[0, 1.08, 0]} radius={0.07} kind="plastic" color="#eceef0" />
      {[-0.22, 0, 0.22].map((dx) => (
        <group key={dx}>
          <RBox size={[0.17, 0.03, 0.17]} position={[dx, 0.95, -0.68]} radius={0.012} kind="plastic" color="#2a2e33" />
          <Screw position={[dx, 0.965, -0.68]} r={0.05} kind="brass" />
          <RBox size={[0.17, 0.03, 0.17]} position={[dx, 0.95, 0.66]} radius={0.012} kind="plastic" color="#2a2e33" />
          <Screw position={[dx, 0.965, 0.66]} r={0.05} kind="brass" />
        </group>
      ))}
      {[-0.42, 0.42].map((dx) => (
        <RBox key={dx} size={[0.13, 0.02, 0.05]} position={[dx, 0.965, -0.82]} radius={0.006} kind="plastic" color={K.blue} />
      ))}
      <RBox size={[0.34, 0.03, 0.2]} position={[0, 1.24, -0.24]} radius={0.02} kind="plastic" color="#2a2e33" />
      <group ref={flag}>
        <RBox size={[0.24, 0.02, 0.08]} position={[0, 1.255, -0.24]} radius={0.01} kind="plastic" color={closed ? "#2fbf77" : "#e9ebee"} />
      </group>
      <RBox size={[0.34, 0.012, 0.2]} position={[0, 1.268, -0.24]} radius={0.01} kind="lens" color="#dfe9f0" />
      <Decal text={label} position={[0, 1.232, 0.3]} width={0.3} height={0.12} />
    </group>
  );
}

/** Small amber beacon on a short column; lit while `tag` is on. */
export function BeaconModel({ tag, color = "#ff9f1a" }: { tag: string; color?: string }) {
  const on = useBit(tag);
  return (
    <group>
      <RCyl r={0.3} h={0.1} position={[0, 0.05, 0]} kind="paint" color="#3a3f45" fillet={0.03} />
      <RCyl r={0.13} h={0.7} position={[0, 0.45, 0]} kind="brushed" color={K.aluDark} fillet={0.02} />
      <RCyl r={0.24} h={0.22} position={[0, 0.91, 0]} kind="plastic" color="#2b3036" fillet={0.04} />
      <RCyl r={0.22} h={0.5} position={[0, 1.27, 0]} kind="lens" color={on ? color : "#e2c58f"} emissive={color} emissiveIntensity={on ? 12 : 0} fillet={0.03} />
      <Dome r={0.22} squash={0.55} position={[0, 1.52, 0]} kind="plastic" color="#2b3036" />
    </group>
  );
}

/** Three pole breaker; handles drop when `tripped`. Origin bottom centre. */
export function BreakerBody({ tripped, label = "Q1  C10" }: { tripped: boolean; label?: string }) {
  return (
    <group>
      <RBox size={[1.08, 1.3, 1.8]} position={[0, 0.65, 0]} radius={0.06} color={K.housing} />
      <RBox size={[1.0, 0.04, 0.62]} position={[0, 1.31, 0.02]} radius={0.015} color="#d4d8dc" />
      {[-0.33, 0, 0.33].map((dx) => (
        <group key={dx}>
          <RBox size={[0.24, 0.17, 0.34]} position={[dx, 1.39, -0.05]} radius={0.04} kind="plastic" color={K.housingDark} />
          <RBox size={[0.18, 0.02, 0.08]} position={[dx, 1.48, tripped ? 0.04 : -0.14]} radius={0.008} kind="plastic" color={tripped ? K.red : K.green} />
        </group>
      ))}
      <Decal text={label} position={[-0.18, 1.335, 0.42]} width={0.56} height={0.15} />
      <ScrewRow from={-0.33} to={0.33} y={1.31} z={-0.74} count={3} kind="zinc" />
      <ScrewRow from={-0.33} to={0.33} y={1.31} z={0.74} count={3} kind="zinc" />
    </group>
  );
}

/** Thermal overload relay. Origin bottom centre. */
export function OverloadBody({ tripped, heat }: { tripped: boolean; heat: number }) {
  const w = 0.6 * Math.max(0.04, heat);
  return (
    <group>
      <RBox size={[0.92, 0.88, 1.1]} position={[0, 0.44, 0]} radius={0.06} kind="plastic" color="#3d434a" />
      <RBox size={[0.82, 0.03, 0.42]} position={[0, 0.885, -0.18]} radius={0.01} kind="plastic" color="#2b3036" />
      <RCyl r={0.12} h={0.09} position={[-0.24, 0.92, -0.2]} kind="plastic" color={K.blue} fillet={0.03} />
      <RCyl r={0.14} h={0.06} position={[0.1, 0.91, -0.2]} kind="plastic" color="#efede7" fillet={0.02} />
      <RBox
        size={[0.1, 0.02, 0.1]}
        position={[0.33, 0.91, -0.2]}
        radius={0.008}
        kind="plastic"
        color={tripped ? "#ff7a2a" : K.green}
        emissive={tripped ? "#ff7a2a" : K.green}
        emissiveIntensity={tripped ? 6 : 0}
      />
      <RBox size={[w, 0.012, 0.04]} position={[-0.3 + w / 2, 0.892, -0.02]} radius={0.004} kind="plastic" color={heat > 0.7 ? "#ff5a3a" : "#f2a23a"} />
      <Decal text="F2" position={[-0.32, 0.884, 0.08]} width={0.14} height={0.1} color="#e9ecef" />
    </group>
  );
}

/** Latching E-stop on a yellow collar, bound to the toggle control of part "estop". */
export function EStopButton({ position }: { position: V3 }) {
  const rig = useRig();
  const control = rig.controls.find((c) => c.kind === "toggle" && c.part === "estop");
  const key = control && control.kind === "toggle" ? control.key : "estopPressed";
  const pressed = useSim((s) => Boolean(s.physical[key]));
  const head = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (head.current) head.current.position.y = THREE.MathUtils.damp(head.current.position.y, pressed ? -0.11 : 0, 20, dt);
  });
  return (
    <Part id="estop">
      <group
        position={position}
        onPointerDown={(e) => {
          e.stopPropagation();
          useSim.getState().select("estop");
          if (control) useSim.getState().act(control);
        }}
      >
        <RCyl r={0.6} h={0.06} position={[0, 1.12, 0]} kind="plastic" color={K.yellow} fillet={0.02} />
        <Decal text="EMERGENCY STOP" position={[0, 1.152, 0.44]} width={0.66} height={0.09} letterSpacing={0.04} />
        <group ref={head}>
          <RCyl r={0.2} h={0.24} position={[0, 1.27, 0]} kind="plastic" color="#2b3036" fillet={0.03} />
          <RCyl r={0.43} h={0.08} position={[0, 1.42, 0]} kind="plastic" color="#b52f2f" fillet={0.035} />
          <Dome r={0.43} squash={0.4} position={[0, 1.455, 0]} kind="plasticGloss" color="#e04141" />
        </group>
      </group>
    </Part>
  );
}
