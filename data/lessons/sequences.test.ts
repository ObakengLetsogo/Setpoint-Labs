import { describe, expect, it } from "vitest";
import { bench, tap } from "./testBench";

describe("sequence lessons", () => {
  it("traffic serves the waiting side road and returns to main green", () => {
    const b = bench("m-traffic");
    let sawBothGreen = false;
    for (let i = 0; i < 600; i++) {
      const m = b.run(100);
      if (m.Main_Green && m.Side_Green) sawBothGreen = true;
    }
    expect(sawBothGreen).toBe(false);
    expect(b.done()).toBe(true);
    expect(Number(b.phys().crossings)).toBeGreaterThan(0);
  });

  it("traffic gives the pedestrian a walk phase", () => {
    const b = bench("m-traffic");
    tap(b, "pedPressed");
    let walked = false;
    for (let i = 0; i < 300; i++) if (b.run(100).Walk) walked = true;
    expect(walked).toBe(true);
  });

  it("lift answers a call to floor 3 without moving with the doors open", () => {
    const b = bench("m-lift");
    b.run(300);
    tap(b, "call3");
    b.run(8000);
    expect(b.done()).toBe(true);
    expect(Number(b.phys().unsafeMoves)).toBe(0);
    tap(b, "call1");
    b.run(15000);
    expect(Number(b.phys().carY)).toBeLessThan(0.05);
    expect(Number(b.phys().unsafeMoves)).toBe(0);
  });

  it("vsd ramps to the scaled reference with a 20 % floor", () => {
    const b = bench("p-vsd");
    tap(b, "startPressed");
    b.run(5000);
    expect(b.done()).toBe(true);
    expect(Number(b.phys().hz)).toBeCloseTo(30, 0);
    b.run(100, { pot: 0.05 });
    b.run(4000);
    expect(Number(b.phys().hz)).toBeCloseTo(10, 0);
  });

  it("vsd faults reset automatically and lock out on the third trip", () => {
    const b = bench("p-vsd-faults");
    tap(b, "startPressed");
    b.run(3000);
    b.run(2000, {}, { jam: true });
    expect(b.mem().Drive_Run).toBe(false);
    b.run(100, {}, { jam: false });
    b.run(6000);
    tap(b, "startPressed");
    b.run(2000);
    expect(b.done()).toBe(true);
    for (let i = 0; i < 2; i++) {
      b.run(2000, {}, { jam: true });
      b.run(6000, {}, { jam: false });
      tap(b, "startPressed");
      b.run(2000);
    }
    b.run(2000, {}, { jam: true });
    expect(b.mem().Lockout).toBe(true);
  });
});
