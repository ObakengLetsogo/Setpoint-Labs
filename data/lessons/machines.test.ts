import { describe, expect, it } from "vitest";
import { bench, tap } from "./testBench";

describe("machines lessons", () => {
  it("star-delta changes over without a short", () => {
    const b = bench("m-star-delta");
    tap(b, "startPressed");
    expect(b.mem().K2_Star).toBe(true);
    b.run(5500);
    expect(b.mem().K3_Delta).toBe(true);
    expect(b.phys().mcbTripped).toBe(false);
    expect(b.phys().motorSpeed as number).toBeGreaterThan(0.9);
    expect(b.done()).toBe(true);
  });

  it("star current is lower than a direct delta start", () => {
    const b = bench("m-star-delta");
    tap(b, "startPressed");
    const star = Number(b.phys().current);
    expect(star).toBeLessThan(30);
  });

  it("interlock catches a welded star contactor", () => {
    const b = bench("m-interlock");
    b.run(100, {}, { k2Welded: true });
    tap(b, "startPressed");
    b.run(8000);
    expect(b.mem().Weld_Fault).toBe(true);
    expect(b.mem().K3_Delta).toBe(false);
    expect(b.phys().mcbTripped).toBe(false);
    expect(b.done()).toBe(true);
  });

  it("interlock lesson still runs normally without a weld", () => {
    const b = bench("m-interlock");
    tap(b, "startPressed");
    b.run(6000);
    expect(b.mem().K3_Delta).toBe(true);
    expect(b.phys().mcbTripped).toBe(false);
  });

  it("reversing locks out the other direction and waits for zero speed", () => {
    const b = bench("m-reversing");
    tap(b, "fwdPressed");
    b.run(2000);
    expect(b.mem().KF_Fwd).toBe(true);
    tap(b, "revPressed");
    expect(b.mem().KR_Rev).toBe(false);
    tap(b, "stopPressed");
    tap(b, "revPressed");
    expect(b.mem().KR_Rev).toBe(false);
    b.run(6000);
    tap(b, "revPressed");
    expect(b.mem().KR_Rev).toBe(true);
    expect(b.phys().mcbTripped).toBe(false);
    expect(b.done()).toBe(true);
  });
});

describe("conveyor lessons", () => {
  it("conveyor runs, stops when empty and latches a jam", () => {
    const b = bench("m-conveyor");
    tap(b, "startPressed");
    b.run(6000);
    expect(b.mem().Belt_Run).toBe(true);
    b.run(100, { feed: false });
    b.run(20000);
    expect(b.mem().Belt_Run).toBe(false);
    expect(b.mem().Auto).toBe(true);
    b.run(100, { feed: true }, { jam: true });
    b.run(20000);
    expect(b.mem().Jam).toBe(true);
    expect(b.done()).toBe(true);
  });

  it("sorting pushes metal and nothing else", () => {
    const b = bench("m-sorting");
    tap(b, "startPressed");
    b.run(40000);
    expect(Number(b.phys().sortedMetal)).toBeGreaterThanOrEqual(3);
    expect(Number(b.phys().missorted)).toBe(0);
    expect(b.done()).toBe(true);
  });

  it("bottling fills without spilling and counts a case", () => {
    const b = bench("m-bottling");
    tap(b, "startPressed");
    b.run(60000);
    expect(Number(b.phys().spilled)).toBe(0);
    expect(b.mem()["Case.DN"]).toBe(true);
    expect(b.done()).toBe(true);
  });
});
