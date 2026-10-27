import { QUIZ_FOUNDATIONS } from "./foundations";
import { QUIZ_MACHINES } from "./machines";
import { QUIZ_ADVANCED } from "./advanced";
import { QUIZ_PLATFORMS } from "./platforms";
import type { QuizQuestion } from "./types";

export const QUIZZES: Record<string, QuizQuestion[]> = { ...QUIZ_FOUNDATIONS, ...QUIZ_MACHINES, ...QUIZ_ADVANCED, ...QUIZ_PLATFORMS };

export function quizFor(lessonId: string): QuizQuestion[] {
  return QUIZZES[lessonId] ?? [];
}
