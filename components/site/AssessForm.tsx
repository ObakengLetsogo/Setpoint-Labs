"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submit, type AssessState } from "@/app/actions/assess";
import { accentButtonClass } from "./SiteShell";

export function AssessForm({ trackId, starter }: { trackId: string; starter: string }) {
  const [state, run, pending] = useActionState<AssessState, FormData>(submit, null);
  const [lang, setLang] = useState<"ladder" | "st">("ladder");
  const [source, setSource] = useState(starter);
  // A syntax error comes back with no results; a marked program comes back with them.
  const error = state?.error;
  const marked = state && "results" in state && state.results.length > 0 ? state : null;
  return (
    <form action={run} className="flex flex-col gap-4">
      <input type="hidden" name="track" value={trackId} />
      <input type="hidden" name="language" value={lang} />
      <div className="flex items-center gap-1 self-start rounded-full bg-[#f3f4f5] p-1 text-[12.5px] font-medium">
        {(["ladder", "st"] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLang(l)} className={`rounded-full px-3 py-1 ${lang === l ? "bg-ink text-white" : "text-[#4b5058]"}`}>
            {l === "ladder" ? "Ladder" : "Structured text"}
          </button>
        ))}
      </div>
      <textarea
        name="source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
        rows={16}
        className="w-full rounded-xl border border-[#dfe2e6] bg-[#fbfbfa] p-4 font-mono text-[13px] leading-[1.7] text-ink outline-none focus:border-ink/40"
        placeholder={lang === "ladder" ? "RUNG 1: XIC(Start_PB) ..." : "Motor_Run := ...;"}
      />
      <button type="submit" disabled={pending} className={`${accentButtonClass} self-start`}>
        {pending ? "Marking" : "Submit for marking"}
      </button>
      {error && <p role="alert" className="rounded-lg border border-[#f1d6d6] bg-[#fdf4f4] px-3 py-2 font-mono text-[12.5px] text-[#9b2c2c]">{error}</p>}
      {marked && (
        <div className="rounded-xl border border-[#e4e6e9]">
          <p className={`border-b border-[#eef0f2] px-4 py-3 text-[14px] font-semibold ${marked.passed ? "text-[#1b6b4a]" : "text-ink"}`}>
            {marked.passed ? "Passed every test." : `${marked.results.filter((r) => r.passed).length} of ${marked.results.length} tests passed.`}
            {marked.certificate && (
              <>
                {" "}Certificate <Link href={`/verify/${marked.certificate}`} className="font-mono text-[#d9591a] underline">{marked.certificate}</Link>
              </>
            )}
          </p>
          {marked.note && <p className="border-b border-[#eef0f2] px-4 py-2 text-[13px] text-[#6b4f12]">{marked.note}</p>}
          <ul className="divide-y divide-[#f1f2f4]">
            {marked.results.map((r) => (
              <li key={r.name} className="flex gap-3 px-4 py-2.5 text-[13px]">
                <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${r.passed ? "bg-run" : "bg-[#d64545]"}`} />
                <span>
                  <span className="text-ink">{r.name}</span>
                  {r.detail && <span className="block font-mono text-[11.5px] text-[#9b2c2c]">{r.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
