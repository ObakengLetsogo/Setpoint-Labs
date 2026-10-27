import { describe, expect, it } from "vitest";
import { lessons } from "./lessons";
import { catalog } from "./catalog";
import { WRITTEN } from "./written";
import { revive } from "./bundle";
import { wireBundle } from "@/lib/server/content";

const rng = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

describe("lesson bundles", () => {
  it("data/written.ts is up to date", () => {
    expect([...WRITTEN].sort()).toEqual(lessons.filter((l) => !l.locked).map((l) => l.id).sort());
  });

  it("the catalogue matches the lessons", () => {
    expect(catalog.map((c) => c.id)).toEqual(lessons.map((l) => l.id));
  });

  it("revived checkpoint steps behave exactly like the originals", () => {
    const r = rng(3);
    for (const l of lessons.filter((x) => !x.locked && x.checkpoint)) {
      const wire = JSON.parse(JSON.stringify(wireBundle(l.id)));
      const back = revive(wire);
      const tags = new Set<string>();
      // Collect every tag name the step source mentions, then try random values for them.
      for (const s of wire.checkpoint.steps as string[]) for (const m of s.matchAll(/[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Z]+)?/g)) tags.add(m[0]);
      for (let k = 0; k < 200; k++) {
        const mem: Record<string, boolean | number> = {};
        const inp: Record<string, boolean | number> = {};
        const f: Record<string, boolean> = {};
        for (const t of tags) {
          mem[t] = r() < 0.5 ? r() < 0.5 : Math.floor(r() * 6);
          inp[t] = r() < 0.5;
          f[t] = r() < 0.5;
        }
        l.checkpoint!.steps.forEach((step, i) => expect(back.checkpoint!.steps[i](mem, inp, f), `${l.id} step ${i}`).toBe(step(mem, inp, f)));
      }
    }
  });
});
