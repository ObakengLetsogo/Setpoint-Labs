"use client";

import type { ReactNode } from "react";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full border transition-colors ${
        checked ? "border-accent bg-accent" : "border-border bg-[#ebe7de]"
      }`}
    >
      <span
        className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(27,36,48,0.25)] transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-[#f1ede4] p-[3px]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full font-medium transition-all ${size === "sm" ? "px-2.5 py-[3px] text-[11px]" : "px-3.5 py-1 text-[12px]"} ${
              active ? "bg-ink text-white shadow-[0_1px_2px_rgba(27,36,48,0.3)]" : "text-muted-ink hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  active = false,
  tone = "default",
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  tone?: "default" | "run" | "stop";
  className?: string;
}) {
  const tones = {
    default: active
      ? "border-ink bg-ink text-white"
      : "border-border bg-surface text-ink hover:border-ink/30 hover:bg-white",
    run: "border-ink bg-ink text-white hover:bg-[#283444]",
    stop: "border-fault bg-fault text-white hover:brightness-110",
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-mono text-[10.5px] uppercase tracking-[0.28em] text-muted-ink ${className}`}>{children}</p>;
}
