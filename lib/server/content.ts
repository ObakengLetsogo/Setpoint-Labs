import "server-only";
import { lessons } from "@/data/lessons";
import { TEACH } from "@/data/teach";
import { quizFor } from "@/data/quizzes";
import type { WireBundle } from "@/data/bundle";

/** A lesson ready to send as JSON. The caller checks access first. */
export function wireBundle(id: string): WireBundle | null {
  const l = lessons.find((x) => x.id === id);
  const teach = TEACH[id];
  if (!l || l.locked || !teach) return null;
  return {
    id,
    difficulty: l.difficulty,
    summary: l.summary,
    code: l.code,
    st: l.st,
    stOnly: l.stOnly,
    rigOptions: l.rigOptions,
    checkpoint: l.checkpoint ? { steps: l.checkpoint.steps.map((f) => f.toString()), message: l.checkpoint.message } : undefined,
    teach,
    quiz: quizFor(id),
  };
}
