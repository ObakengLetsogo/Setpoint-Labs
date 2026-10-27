"use client";

import { create, type StateCreator } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { LadderError, collectTags, parseProgram, type Program } from "@/engine/ladder";
import { scan, type Memory, type RungTrace } from "@/engine/scan";
import { StError, parseST, runST, stTags, type StLineTrace, type StProgram } from "@/engine/st";
import { ladderToST } from "@/engine/translate";
import { rigFor } from "@/rigs";
import type { Control, FaultState, PhysicalState, RigDef, RigOptions, Vec3 } from "@/rigs/types";
import type { RigId } from "@/data/curriculum";
import { catalog, metaOf } from "@/data/catalog";
import { revive, type LessonBundle, type WireBundle } from "@/data/bundle";
import { isSandbox, sandboxRig, starterProgram } from "@/data/sandbox";

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

/** Lesson content the server has sent, by lesson id. Content is never bundled with the app. */
const bundleCache = new Map<string, LessonBundle>();
export const bundleOf = (id: string) => bundleCache.get(id);

export type ContentStatus = "loading" | "signin" | "upgrade" | "error";

export interface Account {
  user: { name: string; email: string; verified: boolean; role: string; platform: string } | null;
  paid: boolean;
  until: string | null;
  inGrace: boolean;
}

/** The lesson's ladder program translated to structured text, the starting point for the ST view. */
export function defaultST(lessonId: string) {
  if (isSandbox(lessonId)) return starterProgram(rigFor(sandboxRig(lessonId)));
  const lesson = bundleCache.get(lessonId);
  if (!lesson) return "";
  if (lesson.st) return lesson.st.join("\n");
  try {
    return ladderToST(parseProgram(lesson.code.join("\n")), "Structured text, translated from the ladder program.");
  } catch {
    return "";
  }
}

function compileST(source: string): { stProgram: StProgram | null; stError: StError | null } {
  try {
    return { stProgram: parseST(source), stError: null };
  } catch (e) {
    if (e instanceof StError) return { stProgram: null, stError: e };
    throw e;
  }
}

export type CodeLang = "ladder" | "st";
const first = catalog[0];
const rigOf = (lessonId: string) => rigFor(sandboxRig(lessonId) ?? metaOf(lessonId)?.rig);

interface SimState {
  lessonId: string;
  /** Why the current lesson's content is not shown yet, if it is not. */
  contentStatus: Record<string, ContentStatus>;
  /** Bumped when lesson content arrives, so views re-read bundleOf(). */
  contentVersion: number;
  loadContent: (id: string) => Promise<void>;
  /** The signed in user and their access, or null until /api/me has answered. */
  account: Account | null;
  loadAccount: () => Promise<void>;
  sources: Record<string, string>;
  program: Program | null;
  error: LadderError | null;
  /** Which language runs on the PLC: ladder or structured text. */
  codeLang: CodeLang;
  stSources: Record<string, string>;
  stProgram: StProgram | null;
  stError: StError | null;
  /** Which ST lines ran on the last scan, and with what result. */
  stLines: Record<number, StLineTrace>;

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
  /** Best quiz score per lesson, out of the number of questions. */
  quizScores: Record<string, number>;
  setQuizScore: (lessonId: string, score: number) => void;
  settings: Settings;
  language: string;

  setLesson: (id: string) => void;
  setSource: (text: string) => void;
  setCodeLang: (lang: CodeLang) => void;
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
    const { program, memory, faults, scanCount, codeLang, stProgram } = get();
    if (codeLang === "ladder" ? !program : !stProgram) return;
    const inputs = inputsNow();
    const watched = rig().tags.filter((t) => !t.analog).map((t) => t.tag);
    const tagAddress = (tag: string) => rig().tags.find((t) => t.tag === tag)?.address;
    let result: { memory: Memory; trace: RungTrace[] };
    let codeTags: string[];
    if (codeLang === "st") {
      const r = runST(stProgram!, { ...memory, ...inputs }, dtMs);
      result = { memory: r.memory, trace: [] };
      codeTags = stTags(stProgram!);
      set({ stLines: r.lines });
    } else {
      result = scan(program!, { ...memory, ...inputs }, dtMs);
      codeTags = collectTags(program!);
    }

    const changes: string[] = [];
    for (const tag of new Set([...watched, ...codeTags])) {
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
    const check = bundleCache.get(lessonId)?.checkpoint;
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
    const { program, memory, codeLang, stProgram } = get();
    if (codeLang === "st") {
      if (!stProgram) return set({ stLines: {} });
      set({ stLines: runST(stProgram, { ...memory, ...inputsNow() }, 0).lines });
      return;
    }
    if (!program) return set({ trace: [] });
    const inputs = inputsNow();
    // Preview power flow without writing outputs, so a stopped PLC still shows which contacts would pass.
    const preview = scan(program, { ...memory, ...inputs }, 0);
    set({ trace: preview.trace });
  };

  return {
    lessonId: first.id,
    contentStatus: {},
    contentVersion: 0,
    account: null,
    loadAccount: async () => {
      try {
        const res = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
        if (res.ok) set({ account: (await res.json()) as Account });
      } catch {
        // Offline: keep whatever we knew.
      }
    },
    sources: {},
    program: null,
    error: null,
    codeLang: "ladder",
    stSources: {},
    stProgram: null,
    stError: null,
    stLines: {},

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
    rigOptions: {},
    hovered: null,
    exploded: false,
    rotationSteps: 0,
    cameraCommand: null,
    cameraVersion: 0,
    pressing: false,
    completed: {},
    ranLessons: {},
    quizScores: {},
    setQuizScore: (lessonId, score) => set({ quizScores: { ...get().quizScores, [lessonId]: Math.max(score, get().quizScores[lessonId] ?? 0) } }),
    settings: DEFAULT_SETTINGS,
    language: "EN",

    loadContent: async (id) => {
      if (bundleCache.has(id) || isSandbox(id) || get().contentStatus[id] === "loading") return;
      set({ contentStatus: { ...get().contentStatus, [id]: "loading" } });
      let status: ContentStatus | null = "error";
      try {
        const res = await fetch(`/api/lessons/${encodeURIComponent(id)}`, { credentials: "same-origin" });
        if (res.ok) {
          bundleCache.set(id, revive((await res.json()) as WireBundle));
          status = null;
        } else if (res.status === 401) status = "signin";
        else if (res.status === 402) status = "upgrade";
      } catch {
        status = "error";
      }
      const next = { ...get().contentStatus };
      if (status) next[id] = status;
      else delete next[id];
      set({ contentStatus: next, contentVersion: get().contentVersion + 1 });
      // Apply the program if the learner is still on this lesson.
      if (!status && get().lessonId === id) get().setLesson(id);
    },

    setLesson: (id) => {
      const { sources, running, stSources } = get();
      if (running) get().setRunning(false);
      const lesson = bundleCache.get(id);
      if (!lesson && !isSandbox(id)) void get().loadContent(id);
      const rigOptions = (lesson?.rigOptions ?? {}) as RigOptions;
      const nextRig = rigOf(id);
      const rigChanged = nextRig.id !== get().rigId;
      const source = sources[id] ?? (isSandbox(id) ? starterProgram(nextRig) : lesson ? lesson.code.join("\n") : "");
      set({
        lessonId: id,
        rigOptions,
        // Lessons written in structured text open in it; the next lesson goes back to ladder.
        ...(lesson?.st ? { codeLang: "st" as const } : bundleCache.get(get().lessonId)?.st && get().lessonId !== id ? { codeLang: "ladder" as const } : {}),
        // Keep a loading lesson's slot empty, so its program is filled in when it arrives.
        sources: sources[id] === undefined && (lesson || isSandbox(id)) ? { ...sources, [id]: source } : sources,
        ...compile(source),
        ...compileST(stSources[id] ?? defaultST(id)),
        ...(lesson || isSandbox(id) || sources[id] !== undefined ? {} : { program: null, error: null, stProgram: null, stError: null }),
        stLines: {},
        memory: {},
        scanCount: 0,
        selected: null,
        ...(rigChanged ? { rigId: nextRig.id, physical: nextRig.initial, faults: {}, exploded: false } : {}),
      });
      evaluateIdle();
    },

    setSource: (text) => {
      const { lessonId, sources, stSources, codeLang } = get();
      if (codeLang === "st") set({ stSources: { ...stSources, [lessonId]: text }, ...compileST(text) });
      else set({ sources: { ...sources, [lessonId]: text }, ...compile(text) });
      const err = codeLang === "st" ? get().stError : get().error;
      if (err && get().running) {
        get().setRunning(false);
        pushLog(err.message, "error");
      }
      if (!get().running) evaluateIdle();
    },

    setCodeLang: (lang) => {
      if (lang === get().codeLang) return;
      if (get().running) get().setRunning(false);
      set({ codeLang: lang, memory: {}, scanCount: 0, trace: [], stLines: {} });
      pushLog(`language · ${lang === "st" ? "structured text" : "ladder"} loaded`);
      evaluateIdle();
    },

    resetSource: () => {
      const { lessonId, codeLang } = get();
      const lesson = bundleCache.get(lessonId);
      if (codeLang === "st") get().setSource(defaultST(lessonId));
      else if (isSandbox(lessonId)) get().setSource(starterProgram(rigFor(get().rigId)));
      else if (lesson) get().setSource(lesson.code.join("\n"));
    },

    toggleRun: () => get().setRunning(!get().running),

    setRunning: (running) => {
      const { error, program, codeLang, stProgram, stError } = get();
      if (running) {
        const ok = codeLang === "st" ? stProgram : program;
        const err = codeLang === "st" ? stError : error;
        if (!ok) {
          if (err) pushLog(err.message, "error");
          return;
        }
        set({ running: true, memory: {}, scanCount: 0, runStartedAt: Date.now(), log: [], ranLessons: { ...get().ranLessons, [get().lessonId]: true } });
        pushLog(
          codeLang === "st"
            ? `PLC to RUN · structured text, ${stProgram!.lines.length} statements`
            : `PLC to RUN · ${program!.rungs.length} rung${program!.rungs.length === 1 ? "" : "s"} loaded`,
        );
      } else {
        const outputsOff = Object.fromEntries(rig().tags.filter((t) => t.kind === "output").map((t) => [t.tag, false]));
        set({ running: false, memory: { ...get().memory, ...outputsOff } });
        pushLog("PLC to STOP · outputs off");
        evaluateIdle();
      }
    },

    stepScan: () => {
      const { program, running, runStartedAt, codeLang, stProgram } = get();
      if (codeLang === "st" ? !stProgram : !program) return;
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
      stSources: s.stSources,
      codeLang: s.codeLang,
      completed: s.completed,
      ranLessons: s.ranLessons,
      quizScores: s.quizScores,
      settings: s.settings,
      language: s.language,
    }),
    merge: (saved, current) => {
      const p = (saved ?? {}) as Partial<SimState>;
      return {
        ...current,
        ...p,
        lessonId: p.lessonId && (catalog.some((l) => l.id === p.lessonId) || sandboxRig(p.lessonId)) ? p.lessonId : current.lessonId,
        sources: { ...current.sources, ...p.sources },
        stSources: { ...current.stSources, ...p.stSources },
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
