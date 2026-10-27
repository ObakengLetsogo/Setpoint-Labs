"use client";

import { useRig, useSim } from "@/store/sim";
import { IconCrosshair } from "@/components/ui/icons";

export function ComponentsSheetContent({ onDone }: { onDone: () => void }) {
  const focusPart = useSim((s) => s.focusPart);
  const selected = useSim((s) => s.selected);
  const rig = useRig();
  return (
    <ul className="divide-y divide-border">
      {rig.parts.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => {
              focusPart(p.id);
              onDone();
            }}
            className={`group flex w-full items-center justify-between gap-3 py-3 text-left ${selected === p.id ? "text-accent" : ""}`}
          >
            <span>
              <span className="block font-serif text-[22px] leading-none text-ink">{p.name}</span>
              <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-ink">{p.kicker}</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink transition group-hover:border-ink/40">
              <IconCrosshair size={12} /> Locate
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
