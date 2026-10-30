import { describe, expect, it } from "vitest";
import { levelOfLesson, levelOfTrack } from "@/data/access";
import { EXAM_PRICES, PLANS, levelsOf, planById, priceFor, seatDiscount } from "@/config/plans";

describe("plans and prices", () => {
  it("has the agreed individual prices", () => {
    expect([planById("level-f")!.priceCents, planById("level-p")!.priceCents, planById("level-e")!.priceCents]).toEqual([250000, 350000, 450000]);
    expect(planById("bundle")!.priceCents).toBe(1390000);
    expect(planById("learner-month")!.priceCents).toBe(29900);
    expect(EXAM_PRICES).toEqual({ F: 120000, P: 180000, E: 350000 });
  });

  it("makes the bundle cheaper than buying every level and exam", () => {
    const parts = ["level-f", "level-p", "level-e"].reduce((a, id) => a + planById(id)!.priceCents, 0) + Object.values(EXAM_PRICES).reduce((a, b) => a + b, 0);
    expect(parts - planById("bundle")!.priceCents).toBe(310000);
  });

  it("applies the company volume discount and the minimum seats", () => {
    const corp = planById("corp-f")!;
    expect(seatDiscount(19)).toBe(0);
    expect(seatDiscount(20)).toBe(0.1);
    expect(seatDiscount(50)).toBe(0.15);
    expect(priceFor(corp, 2)).toBe(750000 * 5);
    expect(priceFor(corp, 50)).toBe(Math.round(750000 * 50 * 0.85));
    expect(priceFor(planById("college-f")!, 30)).toBe(200000 * 30);
  });

  it("maps plans and lessons to levels", () => {
    expect(levelsOf("level-p")).toEqual(["P"]);
    expect(levelsOf("retired-or-unknown")).toEqual(["F", "P", "E"]);
    expect(levelOfLesson("f-ton")).toBe("F");
    expect(levelOfLesson("w-multimeter")).toBe("F");
    expect(levelOfLesson("p-vsd")).toBe("P");
    expect(levelOfLesson("a-structured-text")).toBe("E");
    expect(levelOfTrack("advanced")).toBe("E");
  });

  it("only lists plans that can be bought or quoted", () => {
    expect(PLANS.filter((p) => p.listed).every((p) => p.levels.length > 0)).toBe(true);
    expect(PLANS.find((p) => p.id === "learner-year")!.listed).toBe(false);
  });
});
