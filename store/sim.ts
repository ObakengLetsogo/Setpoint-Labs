"use client";

import { create, type StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { LadderError, collectTags, parseProgram, type Program } from "@/engine/ladder";
import { scan, type Memory, type RungTrace } from "@/engine/scan";
import { rigFor } from "@/rigs";
import type { Control, FaultState, PhysicalState, RigDef, RigOptions, Vec3 } from "@/rigs/types";
import type { RigId } from "@/data/curriculum";
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

// How far each lesson has got through its checkpoint steps this session.
const checkpointStep: Record<string, number> = {};


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
const rigOf = (lessonId: string) => rigFor(lessons.find((l) => l.id === lessonId)?.rig);

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
  /** The rig the current lesson runs on. */
  rigId: RigId;
  physical: PhysicalState;
  faults: FaultState;
  log: LogLine[];

  selected: string | null;
  /** Rung number (1 based) called out in the ladder view, used by lesson videos. */
  highlightRung: number | null;
  /** Wiring options of the current lesson. */
  rigOptions: RigOptions;
  hovered: string | null;
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
  /** Press or release the hold button on a part, e.g. press("start", true). */
  press: (part: string, down: boolean) => void;
  setPhysical: (patch: PhysicalState) => void;
  /** Run a popover control: toggles flip, actions apply their patch, sliders take a value. */
  act: (control: Control, value?: number | boolean) => void;
  setFault: (key: string, value: boolean) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  toggleExplode: () => void;
  rotate: (dir: 1 | -1) => void;
  zoomBy: (factor: number) => void;
  focusPart: (id: string) => void;
  setHighlightRung: (n: number | null) => void;
  resetView: () => void;
  setSetting: (key: keyof Settings, value: boolean) => void;
  resetSettings: () => void;
  setLanguage: (code: string) => void;
  clearLog: () => void;
}

let logId = 0;

const simStore: StateCreator<SimState> = (set, get) => {
  const pushLog = (text: string, kind: LogLine["kind"] = "info") => {
    const { log, runStartedAt } = get();
    const line: LogLine = { id: logId++, t: runStartedAt ? Date.now() - runStartedAt : 0, text, kind };
    set({ log: [...log.slice(-(MAX_LOG - 1)), line] });
  };

  const rig = (): RigDef => rigFor(get().rigId);
  const inputsNow = () => rig().readInputs(get().physical, get().faults, get().rigOptions);

  const executeScan = (dtMs: number) => {
    const { program, memory, faults, scanCount } = get();
    if (!program) return;
    const inputs = inputsNow();
    const watched = rig().tags.filter((t) => !t.analog).map((t) => t.tag);
    const tagAddress = (tag: string) => rig().tags.find((t) => t.tag === tag)?.address;
    const result = scan(program, { ...memory, ...inputs }, dtMs);

    const changes: string[] = [];
    for (const tag of new Set([...watched, ...collectTags(program)])) {
      if (typeof result.memory[tag] === "number" && !tag.includes(".")) continue;
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
    const check = lessons.find((l) => l.id === lessonId)?.checkpoint;
    if (check && !completed[lessonId]) {
      const step = checkpointStep[lessonId] ?? 0;
      if (check.steps[step]?.(result.memory, inputs, { ...faults })) {
        checkpointStep[lessonId] = step + 1;
        if (step + 1 >= check.steps.length) {
          set({ completed: { ...completed, [lessonId]: true } });
          pushLog(`checkpoint passed · ${check.message}`, "success");
        }
      }
    }
  };

  const evaluateIdle = () => {
    const { program, memory } = get();
    if (!program) return set({ trace: [] });
    const inputs = inputsNow();
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
    rigId: first.rig,
    physical: rigFor(first.rig).initial,
    faults: {},
    log: [],

    selected: null,
    highlightRung: null,
    rigOptions: first.rigOptions ?? {},
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
      const lesson = lessons.find((l) => l.id === id);
      const rigOptions = (lesson?.rigOptions ?? {}) as RigOptions;
      const nextRig = rigOf(id);
      const rigChanged = nextRig.id !== get().rigId;
      set({
        lessonId: id,
        rigOptions,
        ...compile(sources[id] ?? ""),
        memory: {},
        scanCount: 0,
        selected: null,
        ...(rigChanged ? { rigId: nextRig.id, physical: nextRig.initial, faults: {}, exploded: false } : {}),
      });
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
        const outputsOff = Object.fromEntries(rig().tags.filter((t) => t.kind === "output").map((t) => [t.tag, false]));
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
      set({ physical: rig().step(get().physical, get().faults, get().memory, get().scanMs) });
    },

    setScanMs: (ms) => set({ scanMs: ms }),

    tick: () => {
      const { running, scanMs } = get();
      if (running) executeScan(scanMs);
      const before = get().physical;
      const memory = get().running ? get().memory : {};
      const physical = rig().step(before, get().faults, memory, scanMs);
      set({ physical });
      rig().events?.(before, physical).forEach(([text, kind]) => pushLog(text, kind));
      if (!running) evaluateIdle();
    },

    press: (part, down) => {
      const control = rig().controls.find((c) => c.kind === "hold" && c.part === part);
      if (!control || control.kind !== "hold") return;
      set({ physical: { ...get().physical, [control.key]: down }, pressing: down });
      if (!get().running) evaluateIdle();
    },

    setPhysical: (patch) => {
      set({ physical: { ...get().physical, ...patch } });
      if (!get().running) evaluateIdle();
    },

    act: (control, value) => {
      const p = get().physical;
      if (control.kind === "toggle") {
        const on = typeof value === "boolean" ? value : !p[control.key];
        set({ physical: { ...p, [control.key]: on } });
        const text = on ? control.logOn : control.logOff;
        if (text) pushLog(text, on && control.logOn?.startsWith("safety") ? "fault" : "info");
      } else if (control.kind === "slider") {
        set({ physical: { ...p, [control.key]: Number(value ?? 0) } });
      } else if (control.kind === "action") {
        set({ physical: control.patch(p) });
        if (control.log) pushLog(control.log, control.danger ? "fault" : "info");
      }
      if (!get().running) evaluateIdle();
    },

    setFault: (key, value) => {
      set({ faults: { ...get().faults, [key]: value } });
      const label = rig().faults.find((f) => f.key === key)?.label.toLowerCase() ?? key;
      pushLog(`${value ? "fault injected" : "fault cleared"} · ${label}`, value ? "fault" : "info");
      if (!get().running) evaluateIdle();
    },

    select: (id) => set({ selected: id }),
    hover: (id) => set({ hovered: id }),
    toggleExplode: () => set({ exploded: !get().exploded }),
    rotate: (dir) => set({ rotationSteps: get().rotationSteps + dir }),

    zoomBy: (factor) => set({ cameraCommand: { type: "zoom", factor }, cameraVersion: get().cameraVersion + 1 }),

    focusPart: (id) => {
      const part = rig().parts.find((p) => p.id === id);
      if (!part) return;
      set({
        selected: id,
        cameraCommand: { type: "focus", target: part.anchor, zoom: 1.8 },
        cameraVersion: get().cameraVersion + 1,
      });
    },

    setHighlightRung: (n) => set({ highlightRung: n }),

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
};

export const useSim = create<SimState>()(
  persist(simStore, {
    name: "setpoint-labs",
    version: 1,
    storage: createJSONStorage(() => localStorage),
    // Rehydrated from the page on mount so server and first client render match; /record never rehydrates.
    skipHydration: true,
    partialize: (s) => ({
      lessonId: s.lessonId,
      sources: s.sources,
      completed: s.completed,
      ranLessons: s.ranLessons,
      settings: s.settings,
      language: s.language,
    }),
    merge: (saved, current) => {
      const p = (saved ?? {}) as Partial<SimState>;
      return {
        ...current,
        ...p,
        lessonId: lessons.some((l) => l.id === p.lessonId) ? p.lessonId! : current.lessonId,
        sources: { ...current.sources, ...p.sources },
        completed: { ...current.completed, ...p.completed },
        settings: { ...current.settings, ...p.settings },
      };
    },
    onRehydrateStorage: () => (state) => state?.setLesson(state.lessonId),
  }),
);

/** The rig the current lesson runs on. */
export const useRig = () => rigFor(useSim((s) => s.rigId));

/** Live input image of the rig, with the current lesson's wiring options applied. */
export const useInputs = () => {
  const rig = useRig();
  const physical = useSim((s) => s.physical);
  const faults = useSim((s) => s.faults);
  const options = useSim((s) => s.rigOptions);
  return rig.readInputs(physical, faults, options);
};
