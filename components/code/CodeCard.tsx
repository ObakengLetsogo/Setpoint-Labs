"use client";

import { useState } from "react";

const KEYWORDS = /(XIC|XIO|OTE|RUNG)\b/g;

export function CodeCard({
  code,
  onRun,
}: {
  code: string[];
  onRun: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  return (
    <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-card sm:mx-6">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm font-semibold text-ink">Try it yourself</p>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-medium text-muted-ink hover:text-accent"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed sm:text-sm">
        {code.map((line, i) => (
          <div key={i} className="flex gap-3">
            <span className="w-5 shrink-0 select-none text-right text-muted-ink">{i + 1}</span>
            <span
              className="text-ink"
              dangerouslySetInnerHTML={{
                __html: line.replace(
                  KEYWORDS,
                  (m) => `<span style="color:var(--color-accent);font-weight:600">${m}</span>`
                ),
              }}
            />
          </div>
        ))}
      </pre>

      <div className="flex justify-end border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={onRun}
          className="rounded-full bg-accent px-6 py-2 text-sm font-bold uppercase tracking-wide text-white transition hover:brightness-110"
        >
          Run
        </button>
      </div>
    </div>
  );
}
