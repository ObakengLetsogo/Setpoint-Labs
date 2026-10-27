"use client";

import { useState } from "react";
import type { CalloutLabel } from "@/data/types";

const ROTATE_STEP = 45;

export function Stage({
  lessonTitle,
  callouts,
  showCallouts,
  showGrid,
  reduceMotion,
}: {
  lessonTitle: string;
  callouts: CalloutLabel[];
  showCallouts: boolean;
  showGrid: boolean;
  reduceMotion: boolean;
}) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  const transition = reduceMotion ? "none" : "transform 300ms ease-out";

  return (
    <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-card sm:mx-6">
      <div
        className="relative flex h-64 items-center justify-center sm:h-80"
        style={{
          backgroundImage: showGrid
            ? "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)"
            : undefined,
          backgroundSize: "28px 28px",
          backgroundPosition: "center",
        }}
      >
        {/* Rig placeholder, swapped for the real React Three Fiber scene in Phase 2 */}
        <button
          type="button"
          aria-label={`${lessonTitle} rig, click to inspect`}
          className="group relative"
          style={{ transform: `rotate(${rotation}deg) scale(${zoom})`, transition }}
        >
          <svg viewBox="0 0 160 120" className="h-36 w-48 drop-shadow-sm sm:h-44 sm:w-60" aria-hidden="true">
            <polygon points="30,90 80,110 130,90 80,70" fill="#e6e2d9" />
            <polygon points="30,90 30,50 80,30 80,70" fill="var(--color-primary)" opacity="0.9" />
            <polygon points="130,90 130,50 80,30 80,70" fill="var(--color-primary)" opacity="0.7" />
            <rect x="68" y="18" width="24" height="18" rx="2" fill="var(--color-accent)" />
            <circle cx="80" cy="27" r="3" fill="var(--color-ink)" />
          </svg>
        </button>

        {showCallouts &&
          callouts.map((c) => (
            <div
              key={c.id}
              className="absolute hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium shadow-card sm:flex"
              style={{ top: c.top, left: c.left }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </div>
          ))}
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-border bg-background/60 px-3 py-2">
        <StageButton label="Rotate left" onClick={() => setRotation((r) => r - ROTATE_STEP)}>
          ↺
        </StageButton>
        <StageButton label="Rotate right" onClick={() => setRotation((r) => r + ROTATE_STEP)}>
          ↻
        </StageButton>
        <StageButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}>
          −
        </StageButton>
        <StageButton label="Zoom in" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}>
          +
        </StageButton>
        <StageButton
          label="Reset view"
          onClick={() => {
            setRotation(0);
            setZoom(1);
          }}
        >
          ⤾
        </StageButton>
      </div>

      <p className="pb-3 text-center text-xs text-muted-ink">
        Drag or WASD to pan, Q and E to rotate, scroll to zoom
      </p>
    </div>
  );
}

function StageButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-base font-semibold text-ink transition hover:border-accent hover:text-accent"
    >
      {children}
    </button>
  );
}
