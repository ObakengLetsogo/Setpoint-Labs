import { describe, expect, it } from "vitest";
import { lessons } from "@/data/lessons";
import { QUIZZES, quizFor } from ".";

describe("quizzes", () => {
  it("every open lesson has ten valid questions", () => {
    for (const l of lessons.filter((x) => !x.locked)) {
      const qs = QUIZZES[l.id];
      expect(qs, l.id).toBeDefined();
      expect(qs.length, l.id).toBe(10);
      for (const q of qs) {
        expect(q.answer, `${l.id}: ${q.q}`).toBeGreaterThanOrEqual(0);
        expect(q.answer, `${l.id}: ${q.q}`).toBeLessThan(q.options.length);
        expect(new Set(q.options).size, `${l.id}: ${q.q}`).toBe(q.options.length);
      }
    }
  });

  it("mixes the options so the right answer is not always first", () => {
    const all = lessons.filter((x) => !x.locked).flatMap((l) => quizFor(l.id));
    const first = all.filter((q) => q.answer === 0).length / all.length;
    expect(first).toBeLessThan(0.4);
    for (const l of lessons.filter((x) => !x.locked))
      quizFor(l.id).forEach((q, i) => expect(q.options[q.answer], l.id).toBe(QUIZZES[l.id][i].options[QUIZZES[l.id][i].answer]));
  });

  it("has no quizzes for unknown lessons and no em dashes", () => {
    const ids = new Set(lessons.map((l) => l.id));
    for (const [id, qs] of Object.entries(QUIZZES)) {
      expect(ids.has(id), id).toBe(true);
      expect(JSON.stringify(qs)).not.toMatch(/—/);
    }
  });
});
