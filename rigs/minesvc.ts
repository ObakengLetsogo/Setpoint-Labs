import { pumps } from "./process";
import { lift } from "./sequences";
import { vsd } from "./vsd";
import type { RigDef } from "./types";

/*
 * Mine services, built on three core machines with the instruments and faults a mine adds:
 * an underground pump station (the duplex wet well, with delivery flow switches and pumps that can
 * lose their prime), a main ventilation fan (the fan drive, with airflow, vibration and methane),
 * and a skip winder (the lift, with slow-down switches, creep speed and an overwind switch).
 */

/* ------------------------------------------------------------ dewatering */

export const dewater: RigDef = {
  ...pumps,
  id: "dewater",
  name: "Underground pump station",
  headline: ["Mine", "dewatering"],
  tagline: "Duty and standby · Run-dry trips · Rising water",
  tags: [
    ...pumps.tags,
    { tag: "Flow1_OK", address: "I1.1", kind: "input", color: "#3d8fd6", connectsTo: "Pump 1 delivery flow switch, 1 when water is flowing" },
    { tag: "Flow2_OK", address: "I1.2", kind: "input", color: "#3d8fd6", connectsTo: "Pump 2 delivery flow switch, 1 when water is flowing" },
  ],
  annotations: pumps.annotations.map((a) => ({ ...a, labs: ["n-dewatering"] })),
  faults: [...pumps.faults, { key: "noPrime1", label: "Pump 1 lost its prime (air in the suction)", part: "p1" }],
  readInputs: (p, f, o) => ({
    ...pumps.readInputs(p, f, o),
    Flow1_OK: Number(p.p1Speed) > 0.8 && !f.noPrime1,
    Flow2_OK: Number(p.p2Speed) > 0.8,
  }),
  step: (p, f, m, dtMs) => {
    const next = pumps.step(p, f, m, dtMs);
    // A pump that has lost its prime turns but moves no water.
    if (f.noPrime1 && Number(p.level) > 0.02) next.level = Math.min(1, Number(next.level) + Number(next.p1Speed) * 0.12 * (dtMs / 1000));
    return next;
  },
};

/* ----------------------------------------------------------- ventilation */

export const ventFan: RigDef = {
  ...vsd,
  id: "ventfan",
  name: "Main ventilation fan",
  headline: ["Mine", "ventilation"],
  tagline: "Airflow · Vibration · Methane · Section power",
  tags: [
    ...vsd.tags,
    { tag: "Airflow_Pa", address: "IW68", kind: "input", color: "#3d8fd6", connectsTo: "Fan pressure across the fan, Pa", analog: true },
    { tag: "Vib_x10", address: "IW70", kind: "input", color: "#6b4fa0", connectsTo: "Fan bearing vibration, mm/s × 10", analog: true },
    { tag: "CH4_x100", address: "IW72", kind: "input", color: "#d64545", connectsTo: "Methane in the return airway, % × 100", analog: true },
    { tag: "Section_Power", address: "Q0.4", kind: "output", color: "#2457a6", connectsTo: "Contactor feeding the underground section's power" },
  ],
  annotations: vsd.annotations.map((a) => ({ ...a, labs: ["n-ventilation"] })),
  initial: { ...vsd.initial, pot: 1, ch4: 0.3, gasMake: 0.4, vib: 0 },
  faults: [...vsd.faults, { key: "bearing", label: "Fan bearing failing", part: "fan" }],
  controls: [...vsd.controls, { kind: "slider", part: "fan", label: "Methane make", key: "gasMake", min: 0, max: 1, step: 0.1, unit: "" }],
  readInputs: (p, f, o) => {
    const air = Number(p.hzNorm ?? 0);
    return {
      ...vsd.readInputs(p, f, o),
      Airflow_Pa: Math.round(air * air * 1000),
      Vib_x10: Math.round(Number(p.vib) * 10),
      CH4_x100: Math.round(Number(p.ch4) * 100),
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    const next = vsd.step(p, f, m, dtMs);
    const air = Number(next.hzNorm ?? 0);
    // Methane builds up from the strata and is diluted by the airflow.
    const ch4 = Math.max(0, Number(p.ch4) + (Number(p.gasMake) * 0.1 - air * Number(p.ch4) * 0.5) * dt);
    const base = 2 * air;
    const vibTarget = f.bearing && air > 0.1 ? Math.min(12, Number(p.vib) + 0.4 * dt + 0.01) : base;
    const vib = f.bearing && air > 0.1 ? vibTarget : Number(p.vib) + (base - Number(p.vib)) * Math.min(1, dt);
    return { ...next, ch4, vib };
  },
  events: (b, a) => {
    const out = vsd.events ? vsd.events(b, a) : [];
    if (Number(b.ch4) < 1.4 && Number(a.ch4) >= 1.4) out.push(["DANGER · methane above 1.4 %", "fault"]);
    return out;
  },
  live: (part, p, m, running) => {
    if (part === "fan") return { text: `${Number(p.vib).toFixed(1)} mm/s · CH4 ${Number(p.ch4).toFixed(2)} %`, ring: Number(p.ch4) >= 1.4 ? "fault" : Number(p.vib) > 4.5 ? "warn" : null };
    return vsd.live(part, p, m, running);
  },
};

/* ---------------------------------------------------------------- winder */

export const WINDER = { fast: 0.6, creep: 0.12, accel: 0.5, brake: 3, slowUp: 1.5, slowDown: 0.5, overwind: 2.04 };

export const winder: RigDef = {
  ...lift,
  id: "hoist",
  name: "Skip winder",
  headline: ["Skip", "winder"],
  tagline: "Speed profile · Slow-down · Overwind",
  tags: [
    ...lift.tags.map((t) =>
      t.tag === "Call_1" ? { ...t, connectsTo: "Send the skip down to the loading box" } : t.tag === "Call_3" ? { ...t, connectsTo: "Send the skip up to the tip" } : t.tag === "Floor_1" ? { ...t, connectsTo: "Skip at the loading box" } : t.tag === "Floor_3" ? { ...t, connectsTo: "Skip at the tip" } : t,
    ),
    { tag: "Slow_Up", address: "I1.0", kind: "input", color: "#e0a526", connectsTo: "Slow-down switch below the tip" },
    { tag: "Slow_Down", address: "I1.1", kind: "input", color: "#e0a526", connectsTo: "Slow-down switch above the loading box" },
    { tag: "Overwind", address: "I1.2", kind: "input", color: "#d64545", connectsTo: "Overwind switch above the tip, also in the brake circuit" },
    { tag: "Hoist_Fast", address: "Q0.4", kind: "output", color: "#2457a6", connectsTo: "Winder drive: full speed when on, creep when off" },
  ],
  annotations: lift.annotations.map((a) => ({ ...a, labs: ["n-hoist"] })),
  initial: { ...lift.initial, v: 0, overwound: false },
  faults: [{ key: "slowFail", label: "Slow-down switch below the tip failed", part: "car" }],
  readInputs: (p, f, o) => {
    const y = Number(p.carY);
    return {
      ...lift.readInputs(p, f, o),
      Floor_3: Math.abs(y - 2) < 0.03,
      Slow_Up: f.slowFail ? false : y > WINDER.slowUp,
      Slow_Down: y < WINDER.slowDown,
      Overwind: y > WINDER.overwind || Boolean(p.overwound),
    };
  },
  step: (p, f, m, dtMs) => {
    const dt = dtMs / 1000;
    let y = Number(p.carY);
    let v = Number(p.v);
    let overwound = Boolean(p.overwound) || y > WINDER.overwind;
    const dir = m.Motor_Up && !m.Motor_Down ? 1 : m.Motor_Down && !m.Motor_Up ? -1 : 0;
    // The overwind switch is in the brake circuit: it drops the brakes whatever the PLC asks.
    // The only way out is backing down at creep speed, below the switch.
    const backingOut = overwound && dir === -1 && Math.abs(v) < 0.01 + WINDER.creep;
    const target = overwound && !backingOut ? 0 : dir * (m.Hoist_Fast && !overwound ? WINDER.fast : WINDER.creep);
    const a = overwound && !backingOut ? WINDER.brake : WINDER.accel;
    v = v < target ? Math.min(target, v + a * dt) : Math.max(target, v - a * dt);
    y = Math.max(-0.1, Math.min(2.3, y + v * dt));
    if (y <= 0 && v < 0) v = 0;
    if (overwound && y < 2) overwound = false;
    return { ...p, carY: y, v, overwound, door: 0, unsafeMoves: Number(p.unsafeMoves) };
  },
  events: (b, a) => (!b.overwound && a.overwound ? [["DANGER · overwind, brakes applied", "fault"]] : []),
  live: (part, p, m, running) => {
    if (part === "car") return { text: `${Number(p.carY).toFixed(2)} · ${Math.abs(Number(p.v)).toFixed(2)} /s`, ring: p.overwound ? "fault" : Math.abs(Number(p.v)) > 0.01 ? "run" : null };
    return lift.live(part, p, m, running);
  },
};

