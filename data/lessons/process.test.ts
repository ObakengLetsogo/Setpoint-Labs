import { describe, expect, it } from "vitest";
import { bench, tap } from "./testBench";

describe("process lessons", () => {
  it("tank fills between the floats", () => {
    const b = bench("p-tank-level");
    tap(b, "startPressed");
    b.run(40000);
    expect(b.done()).toBe(true);
    expect(Number(b.phys().overflowed)).toBe(0);
  });

  it("analog control holds the band even with the high float stuck", () => {
    const b = bench("p-analog");
    b.run(100, {}, { highFloatStuck: true });
    tap(b, "startPressed");
    b.run(60000);
    expect(b.done()).toBe(true);
    expect(Number(b.phys().level)).toBeLessThan(0.8);
    expect(Number(b.phys().overflowed)).toBe(0);
  });

  it("duplex pumps alternate the lead", () => {
    const b = bench("p-duplex");
    tap(b, "startPressed");
    b.run(90000);
    expect(b.done()).toBe(true);
    expect(Number(b.phys().p1Hours)).toBeGreaterThan(5);
    expect(Number(b.phys().p2Hours)).toBeGreaterThan(5);
  });

  it("duplex brings in the lag pump at high inflow", () => {
    const b = bench("p-duplex");
    tap(b, "startPressed");
    b.run(100, { inflow: 1 });
    let both = false;
    for (let i = 0; i < 300; i++) {
      const m = b.run(100);
      if (m.P1_Run && m.P2_Run) both = true;
    }
    expect(both).toBe(true);
    expect(Number(b.phys().overflowed)).toBe(0);
  });

  it("alarms change over to the standby pump and acknowledge", () => {
    const b = bench("p-alarms");
    tap(b, "startPressed");
    b.run(4000);
    b.run(100, {}, { p1Trip: true });
    b.run(8000);
    expect(b.mem().Horn).toBe(true);
    tap(b, "ackPressed");
    expect(b.mem().Horn).toBe(false);
    expect(b.done()).toBe(true);
  });

  it("mixer runs a whole batch", () => {
    const b = bench("m-mixer");
    tap(b, "startPressed");
    b.run(45000);
    expect(b.done()).toBe(true);
    expect(Number(b.phys().level)).toBeLessThan(0.02);
    expect(Number(b.phys().batches)).toBe(1);
  });
});
