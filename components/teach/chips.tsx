import type { ReactNode } from "react";

export function CodeChip({ children }: { children: ReactNode }) {
  return <code className="rounded-[5px] bg-accent/[0.09] px-1.5 py-[1px] font-mono text-[0.86em] text-accent">{children}</code>;
}

export function withChips(text: string) {
  return text.split(/([A-Z]{3}\([^)]*\))/g).map((part, i) =>
    /^[A-Z]{3}\(/.test(part) ? <CodeChip key={i}>{part}</CodeChip> : <span key={i}>{part}</span>,
  );
}
