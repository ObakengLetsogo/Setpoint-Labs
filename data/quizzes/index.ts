import { QUIZ_FOUNDATIONS } from "./foundations";
import { QUIZ_MACHINES } from "./machines";
import type { QuizQuestion } from "./types";

export const QUIZZES: Record<string, QuizQuestion[]> = { ...QUIZ_FOUNDATIONS, ...QUIZ_MACHINES };

export function quizFor(lessonId: string): QuizQuestion[] {
  return QUIZZES[lessonId] ?? [];
}
