"use client";

import { create } from "zustand";
import { LadderError, collectTags, parseProgram, type Program } from "@/engine/ladder";
import { scan, type Memory, type RungTrace } from "@/engine/scan";
import {
  INITIAL_PHYSICAL,
  NO_FAULTS,
  TAGS,
  partById,
  readInputs,
  stepPhysics,
  tagAddress,
  type Faults,
  type PartId,
  type Physical,
  type Vec3,
} from "@/rigs/motorStarter";
import { lessons } from "@/data/lessons";

export interface LogLine {
  id: number;
  t: number;
  text: string;
  kind: "info" | "change" | "fault" | "error" | "success";
}

export interface Settings {
  calloutLabels: boolean;
  floorGrid: boolean;
  turntable: boolean;
  sound: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  calloutLabels: true,
  floorGrid: true,
  turntable: false,
  sound: false,
  reduceMotion: false,
};

export type CameraCommand =
  | { type: "zoom"; factor: number }
  | { type: "focus"; target: Vec3; zoom: number }
  | { type: "reset" };
const MAX_LOG = 300;

// Auto marking checks what the rig did, not how the program was written.
const CHECKPOINTS: Record<string, { test: (m: Memory, inputs: Memory) => boolean; message: string }> = {
  "foundations-1": { test: (m) => Boolean(m.Motor_Run), message: "motor ran from the Start button" },
  "foundations-2": {
    test: (m, i) => Boolean(m.Motor_Run) && !i.Start_PB,
    message: "motor kept running after Start was released",
  },
  "foundations-3": {
    test: (m, i) => !i.Overload_OK && !m.Motor_Run && Boolean(m.Fault_Lamp),
    message: "overload trip stopped the motor and lit the fault lamp",
  },
};
const WATCHED = new Set(TAGS.map((t) => t.tag));

function compile(source: string): { program: Program | null; error: LadderError | null } {
  try {
    return { program: parseProgram(source), error: null };
  } catch (e) {
    if (e instanceof LadderError) return { program: null, error: e };
    throw e;
  }
}

const initialSources = Object.fromEntries(lessons.map((l) => [l.id, l.code.join("\n")]));
const first = lessons[0];

interface SimState {
  lessonId: string;
  sources: Record<string, string>;
  program: Program | null;
  error: LadderError | null;

  running: boolean;
  scanMs: number;
  scanCount: number;
  runStartedAt: number;
  memory: Memory;
  trace: RungTrace[];
  physical: Physical;
  faults: Faults;
  log: LogLine[];

  selected: PartId | null;
  hovered: PartId | null;
  exploded: boolean;
  rotationSteps: number;
  cameraCommand: CameraCommand | null;
  cameraVersion: number;
  pressing: boolean;
  completed: Record<string, boolean>;
  ranLessons: Record<string, boolean>;
  settings: Settings;
  language: string;

  setLesson: (id: string) => void;
  setSource: (text: string) => void;
  resetSource: () => void;
  toggleRun: () => void;
  setRunning: (running: boolean) => void;
  stepScan: () => void;
  setScanMs: (ms: number) => void;
  tick: () => void;
  press: (button: "start" | "stop", down: boolean) => void;
  toggleEstop: () => void;
  tripOverload: () => void;
  resetOverload: () => void;
  setFault: (key: keyof Faults, value: boolean) => void;
  select: (id: PartId | null) => void;
  hover: (id: PartId | null) => void;
  toggleExplode: () => void;
  rotate: (dir: 1 | -1) => void;
  zoomBy: (factor: number) => void;
  focusPart: (id: PartId) => void;
  resetView: () => void;
  setSetting: (key: keyof Settings, value: boolean) => void;
  resetSettings: () => void;
  setLanguage: (code: string) => void;
  clearLog: () => void;
}

let logId = 0;

export const useSim = create<SimState>((set, get) => {
  const pushLog = (text: string, kind: LogLine["kind"] = "info") => {
    const { log, runStartedAt } = get();
    const line: LogLine = { id: logId++, t: runStartedAt ? Date.now() - runStartedAt : 0, text, kind };
    set({ log: [...log.slice(-(MAX_LOG - 1)), line] });
  };

  const executeScan = (dtMs: number) => {
    const { program, memory, physical, faults, scanCount } = get();
    if (!program) return;
    const inputs = readInputs(physical, faults);
    const result = scan(program, { ...memory, ...inputs }, dtMs);

    const changes: string[] = [];
    for (const tag of new Set([...WATCHED, ...collectTags(program)])) {
      const before = Boolean(memory[tag]);
      const after = Boolean(result.memory[tag]);
      if (before !== after) {
        const addr = tagAddress(tag);
        changes.push(`${addr ? addr.padEnd(5) + " " : ""}${tag} ${before ? 1 : 0} → ${after ? 1 : 0}`);
      }
    }
    set({ memory: result.memory, trace: result.trace, scanCount: scanCount + 1 });
    changes.forEach((c) => pushLog(`scan ${scanCount + 1} · ${c}`, "change"));

    const { lessonId, completed } = get();
    const check = CHECKPOINTS[lessonId];
    if (check && !completed[lessonId] && check.test(result.memory, inputs)) {
      set({ completed: { ...completed, [lessonId]: true } });
      pushLog(`checkpoint passed · ${check.message}`, "success");
    }
  };

  const evaluateIdle = () => {
    const { program, memory, physical, faults } = get();
    if (!program) return set({ trace: [] });
    const inputs = readInputs(physical, faults);
    // Preview power flow without writing outputs, so a stopped PLC still shows which contacts would pass.
    const preview = scan(program, { ...memory, ...inputs }, 0);
    set({ trace: preview.trace });
  };

  return {
    lessonId: first.id,
    sources: initialSources,
    ...compile(initialSources[first.id]),

    running: false,
    scanMs: 100,
    scanCount: 0,
    runStartedAt: 0,
    memory: {},
    trace: [],
    physical: INITIAL_PHYSICAL,
    faults: NO_FAULTS,
    log: [],

    selected: null,
    hovered: null,
    exploded: false,
    rotationSteps: 0,
    cameraCommand: null,
    cameraVersion: 0,
    pressing: false,
    completed: Object.fromEntries(lessons.map((l) => [l.id, l.completed])),
    ranLessons: {},
    settings: DEFAULT_SETTINGS,
    language: "EN",

    setLesson: (id) => {
      const { sources, running } = get();
      if (running) get().setRunning(false);
      set({ lessonId: id, ...compile(sources[id] ?? ""), memory: {}, scanCount: 0, selected: null });
      evaluateIdle();
    },

    setSource: (text) => {
      const { lessonId, sources } = get();
      set({ sources: { ...sources, [lessonId]: text }, ...compile(text) });
      if (get().error && get().running) {
        get().setRunning(false);
        pushLog(get().error!.message, "error");
      }
      if (!get().running) evaluateIdle();
    },

    resetSource: () => {
      const lesson = lessons.find((l) => l.id === get().lessonId);
      if (lesson) get().setSource(lesson.code.join("\n"));
    },

    toggleRun: () => get().setRunning(!get().running),

    setRunning: (running) => {
      const { error, program } = get();
      if (running) {
        if (!program) {
          if (error) pushLog(error.message, "error");
          return;
        }
        set({ running: true, memory: {}, scanCount: 0, runStartedAt: Date.now(), log: [], ranLessons: { ...get().ranLessons, [get().lessonId]: true } });
        pushLog(`PLC to RUN · ${program.rungs.length} rung${program.rungs.length === 1 ? "" : "s"} loaded`);
      } else {
        const outputsOff = Object.fromEntries(TAGS.filter((t) => t.kind === "output").map((t) => [t.tag, false]));
        set({ running: false, memory: { ...get().memory, ...outputsOff } });
        pushLog("PLC to STOP · outputs off");
        evaluateIdle();
      }
    },

    stepScan: () => {
      const { program, running, runStartedAt } = get();
      if (!program) return;
      if (running) get().setRunning(false);
      if (!runStartedAt) set({ runStartedAt: Date.now() });
      executeScan(get().scanMs);
      set({ physical: stepPhysics(get().physical, get().faults, get().memory, get().scanMs) });
    },

    setScanMs: (ms) => set({ scanMs: ms }),

    tick: () => {
      const { running, scanMs } = get();
      if (running) executeScan(scanMs);
      const before = get().physical;
      const memory = get().running ? get().memory : {};
      const physical = stepPhysics(before, get().faults, memory, scanMs);
      set({ physical });
      if (!before.overloadTripped && physical.overloadTripped) pushLog("fault · overload tripped on high current", "fault");
      if (!running) evaluateIdle();
    },

    press: (button, down) => {
      const key = button === "start" ? "startPressed" : "stopPressed";
      set({ physical: { ...get().physical, [key]: down }, pressing: down });
      if (!get().running) evaluateIdle();
    },

    toggleEstop: () => {
      const pressed = !get().physical.estopPressed;
      set({ physical: { ...get().physical, estopPressed: pressed } });
      pushLog(pressed ? "safety · e-stop pressed, coil circuit broken" : "safety · e-stop released", pressed ? "fault" : "info");
      if (!get().running) evaluateIdle();
    },

    tripOverload: () => {
      set({ physical: { ...get().physical, overloadTripped: true, heat: 1 } });
      pushLog("fault · overload tripped by hand", "fault");
    },

    resetOverload: () => {
      set({ physical: { ...get().physical, overloadTripped: false, heat: Math.min(get().physical.heat, 0.6) } });
      pushLog("overload reset");
    },

    setFault: (key, value) => {
      set({ faults: { ...get().faults, [key]: value } });
      const label = { stuckStart: "start button stuck closed", brokenStop: "stop wire broken", jam: "motor shaft jammed" }[key];
      pushLog(`${value ? "fault injected" : "fault cleared"} · ${label}`, value ? "fault" : "info");
      if (!get().running) evaluateIdle();
    },

    select: (id) => set({ selected: id }),
    hover: (id) => set({ hovered: id }),
    toggleExplode: () => set({ exploded: !get().exploded }),
    rotate: (dir) => set({ rotationSteps: get().rotationSteps + dir }),

    zoomBy: (factor) => set({ cameraCommand: { type: "zoom", factor }, cameraVersion: get().cameraVersion + 1 }),

    focusPart: (id) => {
      const part = partById(id);
      if (!part) return;
      set({
        selected: id,
        cameraCommand: { type: "focus", target: part.anchor, zoom: 1.8 },
        cameraVersion: get().cameraVersion + 1,
      });
    },

    resetView: () =>
      set({ cameraCommand: { type: "reset" }, cameraVersion: get().cameraVersion + 1, rotationSteps: 0, exploded: false }),

    setSetting: (key, value) => set({ settings: { ...get().settings, [key]: value } }),
    resetSettings: () => {
      set({ settings: DEFAULT_SETTINGS });
      get().resetView();
    },
    setLanguage: (code) => set({ language: code }),
    clearLog: () => set({ log: [] }),
  };
});

