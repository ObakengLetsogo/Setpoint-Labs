"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSim } from "@/store/sim";
import { LadderDiagram } from "@/components/ladder/LadderDiagram";
import { ScanMonitor } from "@/components/monitor/ScanMonitor";
import { IconButton, Segmented } from "@/components/ui/controls";
import { IconCheck, IconCopy, IconPlay, IconReset, IconStep, IconStop } from "@/components/ui/icons";

const LH = 21;

function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  const commentAt = line.indexOf("//");
  const code = commentAt >= 0 ? line.slice(0, commentAt) : line;
  const re = /(RUNG\s+\d+\s*:)|\b(XIC|XIO|OTE|OTL|OTU|TON|TOF|CTU|RES)\b|\b(AND|OR)\b|(\d+)|([A-Za-z_][A-Za-z0-9_.]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [tok] = m;
    if (m[1]) out.push(<span key={k++} className="text-muted-ink">{tok}</span>);
    else if (m[2]) out.push(<span key={k++} className="font-semibold text-accent">{tok}</span>);
    else if (m[3]) out.push(<span key={k++} className="font-semibold text-primary">{tok}</span>);
    else if (m[4]) out.push(<span key={k++} className="text-energised">{tok}</span>);
    else out.push(<span key={k++} className="text-ink">{tok}</span>);
    last = m.index + tok.length;
  }
  if (last < code.length) out.push(code.slice(last));
  if (commentAt >= 0) out.push(<span key={k++} className="italic text-[#9a9a92]">{line.slice(commentAt)}</span>);
  return out;
}

function Editor() {
  const source = useSim((s) => s.sources[s.lessonId] ?? "");
  const setSource = useSim((s) => s.setSource);
  const trace = useSim((s) => s.trace);
  const program = useSim((s) => s.program);
  const memory = useSim((s) => s.memory);
  const error = useSim((s) => s.error);
  const lines = source.split("\n");
  const powered = useMemo(() => new Map(trace.map((t) => [t.line, t.power])), [trace]);
  const chips = useMemo(() => {
    const map = new Map<number, string>();
    program?.rungs.forEach((r) => {
      const o = r.outputs[0];
      if (o) map.set(r.line, `${o.tag} = ${memory[o.tag] ? 1 : 0}`);
    });
    return map;
  }, [program, memory]);
  const longest = Math.max(...lines.map((l) => l.length), 20);

  return (
    <div className="relative overflow-x-auto overflow-y-hidden bg-[#fffdf9]">
      <div className="relative" style={{ minWidth: `calc(${longest + 4}ch + 56px)` }}>
        <pre aria-hidden="true" className="pointer-events-none m-0 py-2.5 font-mono text-[12.5px]" style={{ lineHeight: `${LH}px` }}>
          {lines.map((line, i) => {
            const n = i + 1;
            const on = powered.get(n);
            const isErr = error?.line === n;
            return (
              <div
                key={i}
                className={`relative flex ${isErr ? "bg-fault/[0.07]" : on ? "bg-energised/[0.07]" : ""}`}
                style={{ height: LH }}
              >
                <span className={`absolute left-0 top-0 h-full w-[3px] ${isErr ? "bg-fault" : on ? "bg-energised" : ""}`} />
                <span className={`w-10 shrink-0 select-none pr-3 text-right ${on ? "text-energised" : "text-[#b4b0a6]"}`}>{n}</span>
                <span className="whitespace-pre pl-1">{highlight(line)}</span>
                {chips.has(n) && (
                  <span
                    className={`ml-3 self-center whitespace-nowrap rounded px-1.5 py-px font-mono text-[10px] leading-4 ${
                      on ? "bg-energised/15 text-energised" : "bg-[#efebe2] text-muted-ink"
                    }`}
                  >
                    {chips.get(n)}
                  </span>
                )}
              </div>
            );
          })}
        </pre>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          aria-label="Ladder program"
          className="absolute inset-0 resize-none overflow-hidden bg-transparent py-2.5 pl-[44px] font-mono text-[12.5px] text-transparent caret-ink outline-none selection:bg-accent/20"
          style={{ lineHeight: `${LH}px` }}
        />
      </div>
    </div>
  );
}

export function CodeCard() {
  const [view, setView] = useState<"ladder" | "text">("ladder");
  const [copied, setCopied] = useState(false);
  const running = useSim((s) => s.running);
  const toggleRun = useSim((s) => s.toggleRun);
  const stepScan = useSim((s) => s.stepScan);
  const resetSource = useSim((s) => s.resetSource);
  const program = useSim((s) => s.program);
  const trace = useSim((s) => s.trace);
  const memory = useSim((s) => s.memory);
  const error = useSim((s) => s.error);
  const source = useSim((s) => s.sources[s.lessonId] ?? "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e4e6e9] bg-white shadow-[0_1px_2px_rgba(27,36,48,0.05)]">
      <header className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3">
        <h2 className="whitespace-nowrap font-display text-[15px] font-bold uppercase tracking-[0.1em] text-ink">Try it yourself</h2>
        <div className="flex items-center gap-1.5">
          <IconButton label={copied ? "Copied" : "Copy program"} onClick={copy}>
            {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
          </IconButton>
          <IconButton label="Reset to lesson program" onClick={resetSource}>
            <IconReset size={15} />
          </IconButton>
          <IconButton label="Step one scan (.)" onClick={stepScan}>
            <IconStep size={14} />
          </IconButton>
          <IconButton label={running ? "Stop (Space)" : "Run (Space)"} onClick={toggleRun} tone={running ? "stop" : "run"}>
            {running ? <IconStop size={13} /> : <IconPlay size={13} />}
          </IconButton>
        </div>
      </header>
      <div className="flex items-center justify-between border-b border-[#eceef0] px-3.5 pb-2.5">
        <Segmented
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "ladder", label: "Ladder" },
            { value: "text", label: "Text" },
          ]}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-ink">
          {program ? `${program.rungs.length} rung${program.rungs.length === 1 ? "" : "s"}` : "Error"} · {view === "text" ? "editable" : "live"}
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 border-b border-fault/20 bg-fault/[0.06] px-3.5 py-2 text-[12px] text-fault">
          <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-fault" />
          <span>{error.message}</span>
        </div>
      )}

      {view === "text" ? (
        <Editor />
      ) : program ? (
        <div className="max-h-[420px] overflow-y-auto px-2.5 py-2.5">
          <LadderDiagram program={program} trace={trace} memory={memory} />
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-[12.5px] text-muted-ink">Fix the error in the Text view to see the ladder.</p>
      )}

      <ScanMonitor />
    </section>
  );
}
