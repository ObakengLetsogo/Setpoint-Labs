"use client";

import { useEffect, useState } from "react";
import { LogoMark, Wordmark } from "@/components/Logo";

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 1400;
    const id = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(id);
        setTimeout(onDone, 150);
      }
    }, 30);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
      <LogoMark className="h-16 w-16" animate />
      <Wordmark className="text-2xl" />
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-ink">
        Tuning the lessons
      </p>
    </div>
  );
}
