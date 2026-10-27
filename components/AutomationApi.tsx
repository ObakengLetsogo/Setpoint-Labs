"use client";

import { useEffect } from "react";
import { useSim } from "@/store/sim";
import { useRecord, type RecordLabel } from "@/store/record";
import type { Faults, PartId } from "@/rigs/motorStarter";

export interface SetpointLabsApi {
  load: (lessonId: string) => void;
  setSpeed: (scanMs: number) => void;
  play: () => void;
  pause: () => void;
  step: () => void;
  setInput: (tag: string, value: boolean) => void;
  select: (part: PartId | null) => void;
  /** Zoom to a part; glow false skips the selection tint, which reads too strong on large parts in video. */
  focus: (part: PartId, glow?: boolean) => void;
  resetView: () => void;
  rotate: (dir: 1 | -1) => void;
  zoom: (factor: number) => void;
  press: (button: "start" | "stop", down: boolean) => void;
  setFault: (fault: keyof Faults, on: boolean) => void;
  highlightRung: (n: number | null) => void;
  showLabel: (label: RecordLabel | null) => void;
  explode: (on: boolean) => void;
  setReduceMotion: (on: boolean) => void;
  getState: () => {
    lessonId: string;
    running: boolean;
    scanCount: number;
    memory: Record<string, boolean | number>;
    motorSpeed: number;
    ready: boolean;
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
      focus: (part, glow = true) => {
        s().focusPart(part);
        if (!glow) s().select(null);
      },
      resetView: () => s().resetView(),
      rotate: (dir) => s().rotate(dir),
      zoom: (factor) => s().zoomBy(factor),
      press: (button, down) => s().press(button, down),
      setFault: (fault, on) => s().setFault(fault, on),
      highlightRung: (n) => s().setHighlightRung(n),
      showLabel: (label) => useRecord.getState().showLabel(label),
      explode: (on) => on !== s().exploded && s().toggleExplode(),
      setReduceMotion: (on) => s().setSetting("reduceMotion", on),
      getState: () => {
        const st = s();
        return { lessonId: st.lessonId, running: st.running, scanCount: st.scanCount, memory: st.memory, motorSpeed: st.physical.motorSpeed, ready: Boolean(document.querySelector("canvas")) };
      },
    };
    return () => {
      delete window.setpointLabs;
    };
  }, []);
  return null;
}
