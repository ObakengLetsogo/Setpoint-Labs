"use client";

import { useEffect, useState } from "react";

export function ProgressCard({
  trackName,
  completed,
  total,
}: {
  trackName: string;
  completed: number;
  total: number;
}) {
  const [now, setNow] = useState<Date | null>(() => (typeof window === "undefined" ? null : new Date()));

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round((completed / total) * 100);

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-border bg-surface p-4 shadow-card sm:mx-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-ink">
            Current track
          </p>
          <p className="font-display text-xl font-bold uppercase text-ink">{trackName}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-ink">
            Progress
          </p>
          <p className="font-mono text-lg font-semibold text-ink">
            {completed}/{total}
          </p>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-right font-mono text-xs text-muted-ink" suppressHydrationWarning>
        {now
          ? now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
            " · " +
            now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : " "}
      </p>
    </div>
  );
}
