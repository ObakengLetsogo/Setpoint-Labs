"use client";

import { useSim } from "@/store/sim";

const LANGUAGES = [
  { code: "EN", name: "English", available: true },
  { code: "AF", name: "Afrikaans", available: false },
  { code: "ZU", name: "isiZulu", available: false },
  { code: "XH", name: "isiXhosa", available: false },
  { code: "TN", name: "Setswana", available: false },
  { code: "ST", name: "Sesotho", available: false },
];

export function LanguageSheetContent() {
  const language = useSim((s) => s.language);
  const setLanguage = useSim((s) => s.setLanguage);
  return (
    <div className="grid grid-cols-2 gap-2">
      {LANGUAGES.map((l) => {
        const on = language === l.code;
        return (
          <button
            key={l.code}
            type="button"
            disabled={!l.available}
            onClick={() => setLanguage(l.code)}
            className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
              on ? "border-ink bg-ink/[0.03]" : "border-border hover:border-ink/25"
            } ${l.available ? "" : "cursor-not-allowed opacity-50"}`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-[11px] font-semibold ${on ? "bg-ink text-white" : "bg-background text-ink"}`}>
              {l.code}
            </span>
            <span>
              <span className="block text-[13px] text-ink">{l.name}</span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-muted-ink">{l.available ? "Available" : "Soon"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
