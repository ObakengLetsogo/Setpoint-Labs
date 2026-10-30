"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useRig, useSim } from "@/store/sim";
import { RigScene } from "@/components/rigs/RigScene";
import { markerScreen } from "./annotationBus";
import { RigSound } from "./RigSound";

const HOME_TARGET = new THREE.Vector3(-0.1, 0.7, 0.2);
const HOME_THETA = 0.62;
const HOME_PHI = 0.98;
const VFOV = 24;
const IDLE_MS = 5000;

/** "page" leaves room for the side cards on wide screens; "full" fills the canvas, used by /record. */
export type Framing = "page" | "full";

function homeDistance(w: number, h: number, framing: Framing = "page") {
  const aspect = w / h;
  const v = THREE.MathUtils.degToRad(VFOV) / 2;
  const hz = Math.atan(Math.tan(v) * aspect);
  const r = aspect < 1.2 ? 7.6 : 6.6;
  const widthShare = framing === "full" ? 0.86 : w > 900 ? 0.6 : 0.92;
  return Math.max(r / Math.tan(hz) / widthShare, (r * 0.78) / Math.tan(v));
}

interface Goal {
  target: THREE.Vector3;
  theta: number;
  phi: number;
  dist: number;
}

const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();

function CameraRig({ framing }: { framing: Framing }) {
  const rig = useRig();
  const homeTarget = useMemo(() => (rig.view?.target ? new THREE.Vector3(...rig.view.target) : HOME_TARGET.clone()), [rig]);
  const scale = rig.view?.scale ?? 1;
  const controls = useRef<OrbitControlsImpl>(null);
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);
  const goal = useRef<Goal | null>(null);
  const lastInteract = useRef(0);
  const version = useSim((s) => s.cameraVersion);
  const rotationSteps = useSim((s) => s.rotationSteps);
  const prevSteps = useRef(rotationSteps);
  const pressing = useSim((s) => s.pressing);

  const current = () => {
    const { camera } = get();
    const c = controls.current!;
    offset.copy(camera.position).sub(c.target);
    spherical.setFromVector3(offset);
    return { target: c.target.clone(), theta: spherical.theta, phi: spherical.phi, dist: spherical.radius };
  };

  useEffect(() => {
    const { camera } = get();
    const d = homeDistance(size.width, size.height, framing) * scale;
    camera.position.copy(homeTarget).add(new THREE.Vector3().setFromSphericalCoords(d, HOME_PHI, HOME_THETA));
    controls.current?.target.copy(homeTarget);
    controls.current?.update();
    lastInteract.current = performance.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastHome = useRef(homeDistance(size.width, size.height, framing) * scale);
  useEffect(() => {
    if (!controls.current) return;
    const home = homeDistance(size.width, size.height, framing) * scale;
    const c = current();
    goal.current = { ...c, dist: c.dist * (home / lastHome.current) };
    lastHome.current = home;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  useEffect(() => {
    const cmd = useSim.getState().cameraCommand;
    if (!cmd || !controls.current) return;
    const c = current();
    const home = homeDistance(size.width, size.height, framing) * scale;
    lastInteract.current = performance.now();
    if (cmd.type === "zoom") goal.current = { ...c, dist: THREE.MathUtils.clamp(c.dist / cmd.factor, home * 0.35, home * 1.8) };
    if (cmd.type === "focus") goal.current = { target: new THREE.Vector3(...cmd.target), theta: c.theta, phi: Math.min(c.phi, 1.0), dist: home * 0.42 };
    if (cmd.type === "reset") goal.current = { target: homeTarget.clone(), theta: HOME_THETA, phi: HOME_PHI, dist: home };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const lastRig = useRef(rig.id);
  useEffect(() => {
    if (lastRig.current === rig.id || !controls.current) return;
    lastRig.current = rig.id;
    goal.current = { target: homeTarget.clone(), theta: HOME_THETA, phi: HOME_PHI, dist: homeDistance(size.width, size.height, framing) * scale };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig.id]);

  useEffect(() => {
    if (rotationSteps === prevSteps.current || !controls.current) return;
    const dir = rotationSteps - prevSteps.current;
    prevSteps.current = rotationSteps;
    const c = current();
    lastInteract.current = performance.now();
    const base = goal.current ?? c;
    goal.current = { ...base, theta: base.theta + (dir * Math.PI) / 4 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotationSteps]);

  useEffect(() => {
    if (controls.current) controls.current.enabled = !pressing;
  }, [pressing]);

  useFrame(({ camera, clock }, dt) => {
    const c = controls.current;
    if (!c) return;
    const { settings, selected } = useSim.getState();
    const g = goal.current;
    if (g) {
      const k = settings.reduceMotion ? 1 : 1 - Math.exp(-dt * 5);
      const now = current();
      c.target.lerp(g.target, k);
      const theta = now.theta + (g.theta - now.theta) * k;
      const phi = now.phi + (g.phi - now.phi) * k;
      const dist = now.dist + (g.dist - now.dist) * k;
      camera.position.copy(c.target).add(offset.setFromSphericalCoords(dist, phi, theta));
      c.update();
      if (c.target.distanceToSquared(g.target) < 1e-5 && Math.abs(g.theta - theta) < 1e-3 && Math.abs(g.dist - dist) < 0.01) goal.current = null;
      return;
    }
    const idle = performance.now() - lastInteract.current > IDLE_MS;
    if (idle && !selected && !settings.reduceMotion) {
      const now = current();
      const want = HOME_THETA + Math.sin(clock.elapsedTime * 0.22) * 0.2;
      const theta = THREE.MathUtils.damp(now.theta, want, 0.6, dt);
      camera.position.copy(c.target).add(offset.setFromSphericalCoords(now.dist, now.phi, theta));
      c.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      zoomSpeed={0.7}
      minPolarAngle={0.3}
      maxPolarAngle={1.32}
      minDistance={7}
      maxDistance={80}
      onStart={() => {
        goal.current = null;
        lastInteract.current = performance.now();
      }}
      onEnd={() => {
        lastInteract.current = performance.now();
      }}
    />
  );
}

const tmp = new THREE.Vector3();
const box = new THREE.Box3();

function MarkerTracker() {
  const rigId = useSim((s) => s.rigId);
  const annotations = useRig().annotations;
  const cache = useRef<{ rig: string; anchors: Record<number, THREE.Vector3> }>({ rig: "", anchors: {} });
  useFrame(({ camera, scene, size }) => {
    if (cache.current.rig !== rigId) cache.current = { rig: rigId, anchors: {} };
    const local = { current: cache.current.anchors };
    for (const a of annotations) {
      const obj = scene.getObjectByName(`part-${a.part}`);
      if (!obj) continue;
      let anchor = local.current[a.n];
      if (!anchor) {
        obj.updateWorldMatrix(true, true);
        box.setFromObject(obj, true);
        if (box.isEmpty()) continue;
        const c = box.getCenter(new THREE.Vector3());
        anchor = obj.worldToLocal(new THREE.Vector3(c.x, box.max.y + 0.06, c.z));
        local.current[a.n] = anchor;
      }
      tmp.copy(anchor);
      obj.localToWorld(tmp);
      tmp.project(camera);
      const p = (markerScreen[a.n] ??= { x: 0, y: 0, visible: false });
      p.x = ((tmp.x + 1) / 2) * size.width;
      p.y = ((1 - tmp.y) / 2) * size.height;
      p.visible = tmp.z < 1 && Math.abs(tmp.x) < 1.02 && Math.abs(tmp.y) < 1.02;
    }
  });
  return null;
}

function CurrentRig() {
  const rigId = useSim((s) => s.rigId);
  return <RigScene key={rigId} id={rigId} />;
}

function SimDriver() {
  const scanMs = useSim((s) => s.scanMs);
  useEffect(() => {
    const id = setInterval(() => useSim.getState().tick(), scanMs);
    return () => clearInterval(id);
  }, [scanMs]);
  return null;
}

function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#eceeef"]} />
      <Lightformer form="rect" intensity={1.1} position={[0, 9, 1]} rotation-x={Math.PI / 2} scale={[16, 12, 1]} />
      <Lightformer form="rect" intensity={0.8} position={[-10, 4, 6]} rotation-y={Math.PI / 2.6} scale={[10, 5, 1]} />
      <Lightformer form="rect" intensity={0.35} position={[10, 3, -6]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
      <Lightformer form="rect" intensity={0.12} position={[0, 2, 12]} scale={[14, 3, 1]} />
      <Lightformer form="ring" intensity={0.3} position={[6, 6, 8]} scale={3} />
    </Environment>
  );
}

function fxMode() {
  if (typeof window === "undefined") return "all";
  return new URLSearchParams(window.location.search).get("fx") ?? "all";
}

function Effects({ fx }: { fx: string }) {
  const narrow = useThree((s) => s.size.width < 700);
  if (fx === "none") return null;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {fx === "noao" || narrow ? <></> : <N8AO halfRes={false} aoRadius={0.75} intensity={1.8} distanceFalloff={0.5} quality="medium" color="#1c2026" />}
      <Bloom mipmapBlur luminanceThreshold={3.5} luminanceSmoothing={0.1} intensity={0.5} radius={0.45} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}

declare global {
  interface Window {
    /** Set by /record: render exactly one frame at t seconds. */
    __recordAdvance?: (t: number) => void;
  }
}

/** Lesson videos step the scene one frame at a time so every captured frame is rendered exactly once. */
function ManualDriver() {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    window.__recordAdvance = (t) => advance(t, true);
    return () => {
      delete window.__recordAdvance;
    };
  }, [advance]);
  return null;
}

export default function Scene({ framing = "page", manual = false }: { framing?: Framing; manual?: boolean }) {
  const fx = fxMode();
  return (
    <>
    <RigSound />
    <Canvas
      frameloop={manual ? "never" : "always"}
      // Full sharpness on wide screens; phones stop at 1.5 to stay smooth.
      dpr={[1, typeof window !== "undefined" && window.innerWidth < 700 ? 1.5 : 2]}
      camera={{ fov: VFOV, near: 0.5, far: 300, position: [16, 14, 20] }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 0.72;
      }}
      onPointerMissed={() => useSim.getState().select(null)}
      className="!touch-none"
    >
      <SimDriver />
      {manual && <ManualDriver />}
      <CameraRig framing={framing} />
      <MarkerTracker />
      <Studio />
      <ambientLight intensity={0.08} />
      <directionalLight position={[-6, 11, 7]} intensity={0.85} color="#fffaf2" />
      <directionalLight position={[8, 4, -6]} intensity={0.18} color="#e8f0ff" />
      <CurrentRig />
      <ContactShadows position={[0, -0.25, 0]} scale={[17, 13]} blur={2.4} opacity={0.32} far={3} resolution={1024} color="#2a2f36" />
      <Effects fx={fx} />
    </Canvas>
    </>
  );
}
