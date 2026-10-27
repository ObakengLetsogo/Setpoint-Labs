import type { TerminalKind, Wiring } from "@/rigs/types";

export type ChipTone = "used" | "safe" | "avoid" | "power" | "ground";

export function toneFor(id: string, used: Set<string>, wiring: Wiring): ChipTone {
  const t = wiring.terminals.find((p) => p.id === id);
  const kind: TerminalKind | undefined = t?.kind;
  if (kind === "power") return "power";
  if (kind === "ground") return "ground";
  if (wiring.avoid?.includes(id)) return "avoid";
  return used.has(id) ? "used" : "safe";
}

const CHIP: Record<ChipTone, string> = {
  used: "bg-[#d9591a] text-white",
  safe: "bg-[#e8f4ee] text-[#17744f] ring-1 ring-inset ring-[#bfe2d0]",
  avoid: "bg-white text-[#c23434] ring-1 ring-inset ring-[#efb9b9]",
  power: "bg-[#c9372c] text-white",
  ground: "bg-ink text-white",
};

const DOT: Record<ChipTone, string> = {
  used: "bg-[#d9591a]",
  safe: "bg-[#5fbf92]",
  avoid: "bg-[#e05252]",
  power: "bg-[#c9372c]",
  ground: "bg-ink",
};

export function TerminalChip({ id, tone, label }: { id: string; tone: ChipTone; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-[5px] px-1.5 py-[2px] font-mono text-[10.5px] font-bold leading-none tracking-[0.02em] ${CHIP[tone]}`}>
      {label ?? id}
    </span>
  );
}

export function Legend({ className = "" }: { className?: string }) {
  const items: [ChipTone, string][] = [
    ["used", "used in this lesson"],
    ["safe", "safe spare"],
    ["avoid", "avoid"],
    ["power", "power"],
    ["ground", "0 V"],
  ];
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1.5 font-mono text-[10px] text-[#5b6068] ${className}`}>
      {items.map(([tone, label]) => (
        <span key={tone} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${DOT[tone]}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

export function usedTerminals(wires: number[], wiring: Wiring) {
  return new Set(wiring.wires.filter((w) => wires.includes(w.n)).map((w) => w.plc));
}

export const TERMINAL_FILL: Record<ChipTone, string> = {
  used: "#d9591a",
  safe: "#5fbf92",
  avoid: "#e05252",
  power: "#c9372c",
  ground: "#9aa3ad",
};

export { DOT as TERMINAL_DOT };
