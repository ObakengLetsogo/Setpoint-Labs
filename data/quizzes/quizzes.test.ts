import { describe, expect, it } from "vitest";
import { lessons } from "@/data/lessons";
import { QUIZZES } from ".";

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

  it("has no quizzes for unknown lessons and no em dashes", () => {
    const ids = new Set(lessons.map((l) => l.id));
    for (const [id, qs] of Object.entries(QUIZZES)) {
      expect(ids.has(id), id).toBe(true);
      expect(JSON.stringify(qs)).not.toMatch(/—/);
    }
  });
});
