import { describe, expect, it } from "vitest";
import { bench, tap } from "./testBench";

describe("new foundation lessons pass their own checkpoints", () => {
  it("why machines need controllers", () => {
    const b = bench("f-why");
    tap(b, "startPressed");
    tap(b, "stopPressed");
    expect(b.done()).toBe(true);
  });

  it("inside the PLC", () => {
    const b = bench("f-inside");
    tap(b, "startPressed");
    tap(b, "stopPressed");
    tap(b, "auxPressed");
    expect(b.done()).toBe(true);
  });

  it("bits, bytes and words", () => {
    const b = bench("f-bits");
    for (let i = 0; i < 4; i++) tap(b, "auxPressed");
    expect(b.mem().Count).toBe(4);
    tap(b, "stopPressed");
    expect(b.done()).toBe(true);
  });

  it("data types", () => {
    const b = bench("f-types");
    tap(b, "startPressed");
    b.run(4000);
    expect(b.done()).toBe(true);
  });

  it("tags and memory", () => {
    const b = bench("f-tags");
    tap(b, "startPressed");
    tap(b, "stopPressed");
    expect(b.done()).toBe(true);
  });

  it("buttons: an NC stop fails safe", () => {
    const b = bench("f-buttons");
    tap(b, "startPressed");
    tap(b, "stopPressed");
    b.run(500, { startPressed: true }, { brokenStop: true });
    expect(b.mem().Motor_Run).toBe(false);
    expect(b.done()).toBe(true);
  });

  it("sensors count cartons", () => {
    const b = bench("f-sensors");
    tap(b, "startPressed");
    b.run(60000);
    expect(b.done()).toBe(true);
  });

  it("relays and contactors: proof of run", () => {
    const b = bench("f-relays");
    tap(b, "startPressed");
    b.run(2000);
    expect(b.mem().Run_Lamp).toBe(true);
    expect(b.mem().Fault_Lamp).toBeFalsy();
    tap(b, "stopPressed");
    expect(b.done()).toBe(true);
  });

  it("isolation locks out until reset", () => {
    const b = bench("w-isolation");
    tap(b, "startPressed");
    b.run(300, { estopPressed: true });
    b.run(300, { estopPressed: false });
    expect(b.mem().Motor_Run).toBe(false);
    tap(b, "startPressed");
    expect(b.mem().Motor_Run).toBe(false);
    tap(b, "auxPressed");
    expect(b.done()).toBe(true);
  });

  it("protection trips on a jam, not on the start surge", () => {
    const b = bench("w-protection");
    tap(b, "startPressed");
    b.run(4000);
    expect(b.mem().Overcurrent).toBeFalsy();
    b.run(4000, {}, { jam: true });
    expect(b.mem().Overcurrent).toBe(true);
    b.run(500, {}, { jam: false });
    tap(b, "auxPressed");
    expect(b.done()).toBe(true);
  });

  it("cables: a broken stop wire is found", () => {
    const b = bench("w-cables");
    tap(b, "startPressed");
    b.run(4000, {}, { brokenStop: true });
    expect(b.done()).toBe(true);
  });

  it("wiring I/O loop test", () => {
    const b = bench("w-wiring-io");
    tap(b, "startPressed");
    tap(b, "stopPressed");
    tap(b, "auxPressed");
    b.run(300, { startPressed: true, auxPressed: true });
    expect(b.done()).toBe(true);
  });

  it("projects: a live start counter", () => {
    const b = bench("w-projects");
    tap(b, "startPressed");
    tap(b, "stopPressed");
    tap(b, "startPressed");
    expect(b.done()).toBe(true);
  });

  it("backups: version 2 runs", () => {
    const b = bench("w-backups");
    b.run(300, { startPressed: true });
    expect(b.done()).toBe(true);
  });
});

describe("pneumatics and HMI lessons", () => {
  it("one cylinder out and home", () => {
    const b = bench("f-pneu-air");
    tap(b, "startPressed");
    b.run(1500);
    expect(b.mem().Run_Lamp).toBe(true);
    tap(b, "stopPressed");
    b.run(1500);
    expect(b.done()).toBe(true);
  });

  it("a full A+ B+ B- A- cycle", () => {
    const b = bench("f-pneu-seq");
    tap(b, "startPressed");
    b.run(6000);
    expect(b.phys().cycles).toBe(1);
    expect(b.mem().Step).toBe(0);
    expect(b.done()).toBe(true);
  });

  it("the sequence waits on a missing sensor", () => {
    const b = bench("f-pneu-seq");
    b.run(300, { startPressed: true }, { reedA: true });
    b.run(5000, { startPressed: false });
    expect(b.mem().Step).toBe(1);
  });

  it("screen start and stop", () => {
    const b = bench("f-hmi-what");
    tap(b, "hmiStart");
    expect(b.mem().Run_Lamp).toBe(true);
    tap(b, "hmiStop");
    expect(b.done()).toBe(true);
  });

  it("status for the screen", () => {
    const b = bench("f-hmi-screen");
    tap(b, "hmiStart");
    b.run(40000);
    expect(b.done()).toBe(true);
  });

  it("alarm raise, acknowledge, clear", () => {
    const b = bench("f-hmi-alarms");
    tap(b, "hmiStart");
    b.run(30000, {}, { valveStuck: true });
    expect(b.mem().Alarm_Lamp).toBe(true);
    tap(b, "hmiAck");
    expect(b.mem().Alarm_Acked).toBe(true);
    b.run(100, {}, { valveStuck: false });
    tap(b, "hmiStop");
    b.run(60000, { demand: 1 });
    expect(b.mem().Alarm_Lamp).toBeFalsy();
    expect(b.done()).toBe(true);
  });
});
