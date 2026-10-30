import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lessons } from "@/data/lessons";
import { RIGS } from "./index";

describe("rig annotations", () => {
  it("use icons that have an image", () => {
    for (const r of Object.values(RIGS)) for (const a of r?.annotations ?? []) expect(existsSync(`public/parts/${a.icon}.png`), `${r!.id}: ${a.icon}`).toBe(true);
  });
  it("point at lessons that exist, by id", () => {
    const ids = new Set(lessons.map((l) => l.id));
    for (const r of Object.values(RIGS)) for (const a of r?.annotations ?? []) for (const id of a.labs) expect(ids.has(id), `${r!.id}: ${id}`).toBe(true);
  });
});
