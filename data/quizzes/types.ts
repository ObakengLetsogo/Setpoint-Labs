export interface QuizQuestion {
  q: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  /** Shown after answering, right or wrong. */
  why: string;
}
