// A lesson as the browser receives it. Checkpoint steps travel as function source and are rebuilt
// on arrival; each one only reads its arguments, which a test checks.

import type { Memory } from "@/engine/scan";
import type { RigOptions } from "@/rigs/types";
import type { QuizQuestion } from "./quizzes/types";
import type { LessonTeach } from "./teach";
import type { Difficulty } from "./types";
import type { LessonVideo } from "./videos";

export type CheckpointStep = (memory: Memory, inputs: Memory, faults: Record<string, boolean>) => boolean;

export interface LessonBundle {
  id: string;
  difficulty: Difficulty;
  summary: string;
  code: string[];
  st?: string[];
  rigOptions?: RigOptions;
  checkpoint?: { steps: CheckpointStep[]; message: string };
  teach: LessonTeach;
  quiz: QuizQuestion[];
  /** The video lecture, with short lived signed URLs, once one is uploaded and published. */
  video?: LessonVideo;
}

export type WireBundle = Omit<LessonBundle, "checkpoint"> & { checkpoint?: { steps: string[]; message: string } };

/** Turns checkpoint step source back into functions. */
export function revive(w: WireBundle): LessonBundle {
  const steps = w.checkpoint?.steps.map((src) => new Function(`"use strict"; return (${src});`)() as CheckpointStep);
  return { ...w, checkpoint: w.checkpoint ? { steps: steps!, message: w.checkpoint.message } : undefined };
}
