"use client";

import { useState } from "react";
import type { Lesson } from "@/data/types";

const TABS = ["Overview", "Tags & I/O", "Example", "Specifications"] as const;
type Tab = (typeof TABS)[number];

export function LessonPanel({ lesson }: { lesson: Lesson }) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div id="lesson-panel" className="mx-4 mt-4 rounded-2xl border border-border bg-surface shadow-card sm:mx-6">
      <div className="flex gap-4 overflow-x-auto border-b border-border px-4 pt-3">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 whitespace-nowrap border-b-2 pb-2 text-sm font-medium transition ${
              tab === t ? "border-accent font-bold text-ink" : "border-transparent text-muted-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 animate-fade-up" key={tab}>
        {lesson.locked ? (
          <p className="text-sm text-muted-ink">{lesson.summary}</p>
        ) : tab === "Overview" ? (
          <OverviewTab lesson={lesson} />
        ) : tab === "Tags & I/O" ? (
          <IoTab lesson={lesson} />
        ) : tab === "Example" ? (
          <ExampleTab lesson={lesson} />
        ) : (
          <SpecsTab lesson={lesson} />
        )}
      </div>
    </div>
  );
}

function CodeChip({ children }: { children: string }) {
  return (
    <code className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
      {children}
    </code>
  );
}

function OverviewTab({ lesson }: { lesson: Lesson }) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-ink">{lesson.summary}</p>
      <ul className="space-y-2">
        {lesson.facts.map((fact, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-ink">
            <span className="mt-0.5 text-accent">●</span>
            <span>{fact}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IoTab({ lesson }: { lesson: Lesson }) {
  return (
    <div className="space-y-2">
      {lesson.io.map((point) => (
        <div key={point.address} className="flex items-start gap-3 rounded-lg border border-border p-2.5">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: point.color }} />
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-ink">
              {point.address} <span className="text-muted-ink">· {point.tagName}</span>
            </p>
            <p className="text-xs text-muted-ink">
              {point.connectsTo}: {point.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExampleTab({ lesson }: { lesson: Lesson }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-ink">
        How the code works
      </p>
      <ol className="space-y-3">
        {lesson.steps.map((step) => (
          <li key={step.line} className="flex gap-3 text-sm text-ink">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {step.line}
            </span>
            <span className="leading-relaxed">{renderWithChips(step.text)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function renderWithChips(text: string) {
  const parts = text.split(/(XIC\([^)]*\)|XIO\([^)]*\)|OTE\([^)]*\))/g);
  return parts.map((part, i) =>
    /^(XIC|XIO|OTE)\(/.test(part) ? <CodeChip key={i}>{part}</CodeChip> : <span key={i}>{part}</span>
  );
}

function SpecsTab({ lesson }: { lesson: Lesson }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {lesson.specs.map((spec) => (
        <div key={spec.label} className="rounded-lg border border-border p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-ink">{spec.label}</p>
          <p className="mt-1 text-lg font-semibold text-ink">{spec.value}</p>
        </div>
      ))}
    </div>
  );
}
