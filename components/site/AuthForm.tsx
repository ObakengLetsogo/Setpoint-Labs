"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { buttonClass } from "./SiteShell";

export interface FieldDef {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}

/** A server action form with labelled fields, inline errors and a pending state. */
export function AuthForm({ action, fields, submit, hidden = {} }: { action: (s: FormState, f: FormData) => Promise<FormState>; fields: FieldDef[]; submit: string; hidden?: Record<string, string> }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="flex flex-col gap-4">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink">{f.label}</span>
          <input
            name={f.name}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            required
            className="rounded-xl border border-[#dfe2e6] bg-white px-3.5 py-2.5 text-[14.5px] text-ink outline-none transition focus:border-ink/40 focus:shadow-[0_0_0_3px_rgba(27,36,48,0.06)]"
          />
          {f.hint && <span className="text-[12px] text-muted-ink">{f.hint}</span>}
        </label>
      ))}
      {state.error && <p role="alert" className="rounded-lg border border-[#f1d6d6] bg-[#fdf4f4] px-3 py-2 text-[13px] text-[#9b2c2c]">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg border border-[#cfe9dc] bg-[#eef8f3] px-3 py-2 text-[13px] text-[#1b6b4a]">{state.ok}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "One moment" : submit}
      </button>
    </form>
  );
}
