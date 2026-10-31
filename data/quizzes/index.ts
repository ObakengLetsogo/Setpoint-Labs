import { QUIZ_FOUNDATIONS } from "./foundations";
import { QUIZ_MACHINES } from "./machines";
import { QUIZ_ADVANCED } from "./advanced";
import { QUIZ_PLATFORMS } from "./platforms";
import { QUIZ_FOUNDATION_NEW } from "./foundation-new";
import { QUIZ_PROFESSIONAL } from "./professional";
import { QUIZ_MINING } from "./mining";
import { QUIZ_EXPERT } from "./expert";
import type { QuizQuestion } from "./types";

export const QUIZZES: Record<string, QuizQuestion[]> = { ...QUIZ_FOUNDATIONS, ...QUIZ_MACHINES, ...QUIZ_ADVANCED, ...QUIZ_PLATFORMS, ...QUIZ_FOUNDATION_NEW, ...QUIZ_PROFESSIONAL, ...QUIZ_MINING, ...QUIZ_EXPERT };

/** A small fixed hash, so each question always shows its options in the same mixed order. */
function seed(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Options are written with the right answer anywhere, often first. Shown as written, learners
 * would learn to pick the first option, so each question's options are mixed in a fixed order.
 */
export function shuffled(q: QuizQuestion, key: string): QuizQuestion {
  let s = seed(key);
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}

export function quizFor(lessonId: string): QuizQuestion[] {
  return (QUIZZES[lessonId] ?? []).map((q, i) => shuffled(q, `${lessonId}:${i}`));
}
