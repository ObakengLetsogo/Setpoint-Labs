"use client";

import { useEffect } from "react";
import { useSim } from "@/store/sim";
import type { PartId } from "@/rigs/motorStarter";

export interface SetpointLabsApi {
  load: (lessonId: string) => void;
  setSpeed: (scanMs: number) => void;
  play: () => void;
  pause: () => void;
  step: () => void;
  setInput: (tag: string, value: boolean) => void;
  select: (part: PartId | null) => void;
  explode: (on: boolean) => void;
  setReduceMotion: (on: boolean) => void;
  getState: () => {
    lessonId: string;
    running: boolean;
    scanCount: number;
    memory: Record<string, boolean | number>;
    motorSpeed: number;
  };
}

declare global {
  interface Window {
    setpointLabs?: SetpointLabsApi;
  }
}

export function AutomationApi() {
  useEffect(() => {
    const s = () => useSim.getState();
    window.setpointLabs = {
      load: (id) => s().setLesson(id),
      setSpeed: (ms) => s().setScanMs(ms),
      play: () => s().setRunning(true),
      pause: () => s().setRunning(false),
      step: () => s().stepScan(),
      setInput: (tag, value) => {
        if (tag === "Start_PB") s().press("start", value);
        else if (tag === "Stop_PB") s().press("stop", value);
        else if (tag === "EStop_OK" && value === s().physical.estopPressed) s().toggleEstop();
        else if (tag === "Overload_OK") (value ? s().resetOverload : s().tripOverload)();
      },
      select: (part) => s().select(part),
      explode: (on) => on !== s().exploded && s().toggleExplode(),
      setReduceMotion: (on) => s().setSetting("reduceMotion", on),
      getState: () => {
        const st = s();
        return { lessonId: st.lessonId, running: st.running, scanCount: st.scanCount, memory: st.memory, motorSpeed: st.physical.motorSpeed };
      },
    };
    return () => {
      delete window.setpointLabs;
    };
  }, []);
  return null;
}
