import { describe, expect, it } from "vitest";
import { bench, tap } from "./testBench";

describe("wiring lessons", () => {
  it("schematics: seal holds after Start is released", () => {
    const b = bench("w-schematics");
    tap(b, "startPressed");
    expect(b.done()).toBe(true);
  });

  it("power and control: starting current lights the beacon, a jam trips the overload", () => {
    const b = bench("w-power-control");
    tap(b, "startPressed");
    b.run(3000);
    expect(b.mem().Beacon).toBe(false);
    b.run(8000, {}, { jam: true });
    expect(b.done()).toBe(true);
  });

  it("terminals: normally closed stop starts and stops", () => {
    const b = bench("w-terminals");
    b.run(300);
    tap(b, "startPressed");
    tap(b, "stopPressed");
    expect(b.done()).toBe(true);
  });

  it("multimeter: broken wire blocks the start, the repair restores it", () => {
    const b = bench("w-multimeter");
    b.run(300, {}, { brokenStop: true });
    tap(b, "startPressed");
    expect(b.mem().Motor_Run).toBe(false);
    b.run(300, {}, { brokenStop: false });
    tap(b, "startPressed");
    expect(b.done()).toBe(true);
  });

  it("loop check: every loop proved and a two hand bump", () => {
    const b = bench("w-loop-check");
    tap(b, "startPressed");
    tap(b, "stopPressed");
    tap(b, "auxPressed");
    b.run(300, { startPressed: true, auxPressed: true });
    b.run(300, { startPressed: false, auxPressed: false });
    expect(b.done()).toBe(true);
    expect(b.mem().Motor_Run).toBe(false);
  });

  it("commissioning: warning first, E-stop stops, no automatic restart", () => {
    const b = bench("w-commissioning");
    tap(b, "startPressed");
    expect(b.mem().Motor_Run).toBe(false);
    b.run(3500);
    expect(b.mem().Motor_Run).toBe(true);
    b.run(500, { estopPressed: true });
    b.run(1000, { estopPressed: false });
    expect(b.mem().Motor_Run).toBe(false);
    tap(b, "startPressed");
    b.run(3500);
    expect(b.done()).toBe(true);
  });
});

describe("advanced lessons", () => {
  it("structured text lesson's ladder lights the lamp after 3 s", () => {
    const b = bench("a-structured-text");
    tap(b, "startPressed");
    b.run(3500);
    expect(b.done()).toBe(true);
  });

  it("function blocks: three starts light the service beacon, AUX resets", () => {
    const b = bench("a-function-blocks");
    for (let i = 0; i < 3; i++) {
      tap(b, "startPressed");
      b.run(500);
      tap(b, "stopPressed");
    }
    expect(b.mem().Beacon).toBe(true);
    tap(b, "auxPressed");
    expect(b.done()).toBe(true);
  });

  it("comms: heartbeat climbs and a lost drive latches a comms fault", () => {
    const b = bench("a-comms");
    tap(b, "startPressed");
    b.run(6000);
    expect(b.done()).toBe(true);
    b.run(10000, {}, { mainsLoss: true });
    expect(b.mem().Comms_Fault).toBe(true);
    expect(b.mem().Drive_Run).toBe(false);
  });

  it("hmi: state goes to filling, then a low level alarm", () => {
    const b = bench("a-hmi");
    tap(b, "startPressed");
    b.run(2000, { level: 0.2 });
    expect(b.mem().State).toBe(2);
    tap(b, "stopPressed");
    b.run(60000, { demand: 1 });
    expect(b.done()).toBe(true);
  });

  it("fault finding: stuck start and a stall are both caught", () => {
    const b = bench("a-fault-finding");
    b.run(6000, {}, { stuckStart: true });
    expect(b.mem().Start_Stuck).toBe(true);
    b.run(300, {}, { stuckStart: false });
    tap(b, "auxPressed");
    tap(b, "startPressed");
    b.run(2000);
    expect(b.mem().Motor_Run).toBe(true);
    b.run(2500, {}, { jam: true });
    expect(b.done()).toBe(true);
    expect(b.phys().overloadTripped).toBe(false);
  });

  it("documentation: logs run seconds and starts", () => {
    const b = bench("a-documentation");
    tap(b, "startPressed");
    b.run(6000);
    tap(b, "stopPressed");
    tap(b, "startPressed");
    expect(b.done()).toBe(true);
  });
});
