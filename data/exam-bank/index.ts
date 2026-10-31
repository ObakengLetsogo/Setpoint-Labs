import type { Level } from "@/config/plans";
import type { QuizQuestion } from "../quizzes/types";
import { BANK_F } from "./foundation";
import { BANK_P_A } from "./professional-a";
import { BANK_P_B } from "./professional-b";

/** Exam questions for each level, grouped by topic. A level without a bank falls back to its lesson quizzes. */
export const EXAM_BANKS: Partial<Record<Level, Record<string, QuizQuestion[]>>> = { F: BANK_F, P: { ...BANK_P_A, ...BANK_P_B } };

/** Ref for a bank question: "bank:<level>:<topic>:<index>". */
export const bankRef = (level: Level, topic: string, i: number) => `bank:${level}:${topic}:${i}`;

export function bankQuestion(ref: string) {
  const [, level, topic, i] = ref.split(":");
  return EXAM_BANKS[level as Level]?.[topic]?.[Number(i)];
}

/** How many questions each topic gives a paper of `size`, as even as possible (largest remainder). */
export function topicShares(topics: Record<string, number>, size: number) {
  const names = Object.keys(topics);
  const each = size / names.length;
  const shares = Object.fromEntries(names.map((n) => [n, Math.min(topics[n], Math.floor(each))]));
  let left = size - Object.values(shares).reduce((a, b) => a + b, 0);
  for (const n of names) {
    if (left <= 0) break;
    if (shares[n] < topics[n]) {
      shares[n]++;
      left--;
    }
  }
  return shares;
}
