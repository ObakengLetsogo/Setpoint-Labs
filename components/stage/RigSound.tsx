"use client";

import { useEffect } from "react";
import { contactorClosed, type Physical } from "@/rigs/motorStarter";
import { useSim } from "@/store/sim";

// Sound for the rigs, behind the Sound setting: a contactor clunk when the main contacts close or
// open, and a motor hum whose pitch and level follow the simulated motor speed. Generated with Web
// Audio, so there are no sound files to download.

let ctx: AudioContext | null = null;
let hum: { osc: OscillatorNode; gain: GainNode } | null = null;

function audio() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(lp).connect(gain).connect(ctx.destination);
  osc.start();
  hum = { osc, gain };
  return ctx;
}

function clunk(strength: number) {
  const ac = audio();
  if (!ac) return;
  const n = Math.floor(ac.sampleRate * 0.07);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 850;
  const g = ac.createGain();
  g.gain.value = 0.45 * strength;
  src.connect(f).connect(g).connect(ac.destination);
  src.start();
}

export function RigSound() {
  useEffect(() => {
    let closed = false;
    // Browsers only start audio after a click or key press.
    const unlock = () => {
      if (useSim.getState().settings.sound) void audio()?.resume();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    const unsub = useSim.subscribe((s) => {
      const on = s.settings.sound;
      const speed = Number((s.physical as Record<string, unknown>).motorSpeed ?? 0);
      if (hum && ctx) {
        const t = ctx.currentTime;
        hum.gain.gain.setTargetAtTime(on ? Math.min(1, speed) * 0.04 : 0, t, 0.08);
        hum.osc.frequency.setTargetAtTime(40 + Math.min(1, speed) * 60, t, 0.08);
      }
      const now = s.rigId === "motor-starter" && contactorClosed(s.memory, s.physical as unknown as Physical);
      if (now !== closed) {
        closed = now;
        if (on && ctx?.state === "running") clunk(now ? 1 : 0.6);
      }
    });
    return () => {
      unsub();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      hum?.gain.gain.setTargetAtTime(0, ctx?.currentTime ?? 0, 0.05);
    };
  }, []);
  return null;
}
