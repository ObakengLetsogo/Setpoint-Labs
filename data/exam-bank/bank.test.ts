import { describe, expect, it } from "vitest";
import { EXAM_BANKS, topicShares } from ".";
import { QUIZZES } from "../quizzes";

const SIZE = { F: 40, P: 50, E: 40 } as const;

describe("exam banks", () => {
  for (const [level, bank] of Object.entries(EXAM_BANKS)) {
    const all = Object.values(bank!).flat();
    it(`${level} holds at least five papers' worth`, () => {
      expect(all.length).toBeGreaterThanOrEqual(5 * SIZE[level as keyof typeof SIZE]);
    });
    it(`${level} questions are well formed and unique`, () => {
      const seen = new Set<string>();
      for (const q of all) {
        expect(q.options.length).toBe(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
        expect(seen.has(q.q)).toBe(false);
        seen.add(q.q);
      }
    });
    it(`${level} shares no question with the lesson quizzes`, () => {
      const quiz = new Set(Object.values(QUIZZES).flat().map((q) => q.q.toLowerCase()));
      expect(all.filter((q) => quiz.has(q.q.toLowerCase())).map((q) => q.q)).toEqual([]);
    });
    it(`${level} papers cover every topic`, () => {
      const shares = topicShares(Object.fromEntries(Object.entries(bank!).map(([t, qs]) => [t, qs.length])), SIZE[level as keyof typeof SIZE]);
      expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBe(SIZE[level as keyof typeof SIZE]);
      for (const n of Object.values(shares)) expect(n).toBeGreaterThanOrEqual(2);
    });
  }
});
