"use client";

import { useEffect } from "react";
import { useSim } from "@/store/sim";
import { useRecord, type RecordLabel } from "@/store/record";


export interface SetpointLabsApi {
  load: (lessonId: string) => void;
  setSpeed: (scanMs: number) => void;
  play: () => void;
  pause: () => void;
  step: () => void;
  setInput: (tag: string, value: boolean) => void;
  select: (part: string | null) => void;
  /** Zoom to a part; glow false skips the selection tint, which reads too strong on large parts in video. */
  focus: (part: string, glow?: boolean) => void;
  resetView: () => void;
  rotate: (dir: 1 | -1) => void;
  zoom: (factor: number) => void;
  press: (part: string, down: boolean) => void;
  setFault: (fault: string, on: boolean) => void;
  setPhysical: (patch: Record<string, number | boolean>) => void;
  highlightRung: (n: number | null) => void;
  showLabel: (label: RecordLabel | null) => void;
  setCodeLang: (lang: "ladder" | "st") => void;
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
        // Motor starter shortcuts used by tests and lesson videos.
        if (tag === "Start_PB") s().press("start", value);
        else if (tag === "Stop_PB") s().press("stop", value);
        else if (tag === "Aux_PB") s().press("aux", value);
        else if (tag === "EStop_OK") s().setPhysical({ estopPressed: !value });
        else if (tag === "Overload_OK") s().setPhysical(value ? { overloadTripped: false, heat: 0.5 } : { overloadTripped: true, heat: 1 });
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
      setPhysical: (patch) => s().setPhysical(patch),
      highlightRung: (n) => s().setHighlightRung(n),
      showLabel: (label) => useRecord.getState().showLabel(label),
      setCodeLang: (lang) => s().setCodeLang(lang),
      explode: (on) => on !== s().exploded && s().toggleExplode(),
      setReduceMotion: (on) => s().setSetting("reduceMotion", on),
      getState: () => {
        const st = s();
        return { lessonId: st.lessonId, running: st.running, scanCount: st.scanCount, memory: st.memory, motorSpeed: Number(st.physical.motorSpeed ?? 0), ready: Boolean(document.querySelector("canvas")) };
      },
    };
    return () => {
      delete window.setpointLabs;
    };
  }, []);
  return null;
}
