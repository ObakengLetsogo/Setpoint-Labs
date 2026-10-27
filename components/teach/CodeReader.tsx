"use client";

import { useMemo, useState, type ReactNode } from "react";
import { parseProgram, type LogicNode, type Program, type Rung } from "@/engine/ladder";
import { TEACH } from "@/data/teach";
import { useRig, useSim } from "@/store/sim";
import { IconArrowLeft, IconArrowRight } from "@/components/ui/icons";

type Mode = "tour" | "story" | "explore";
type Tab = "guide" | "storyline" | "words";

const INSTR: Record<string, string> = {
  XIC: "normally open contact. Passes power while the bit is 1.",
  XIO: "normally closed contact. Passes power while the bit is 0.",
  OTE: "output coil. Writes the rung result into the bit every scan.",
  OTL: "latch. Sets the bit to 1 when the rung is true and leaves it there.",
  OTU: "unlatch. Clears the bit when the rung is true.",
  TON: "on-delay timer. Counts while the rung is true, DN goes 1 at the preset.",
  TOF: "off-delay timer. Holds DN for the preset after the rung goes false.",
  CTU: "up counter. Adds one on every false to true change of the rung.",
  CTD: "down counter. Takes one away on every false to true change of the rung.",
  RES: "reset. Clears a timer or counter.",
  ONS: "one shot. Passes power for a single scan when the rung before it turns on.",
  GRT: "compare. Passes power while the first value is greater than the second.",
  LES: "compare. Passes power while the first value is less than the second.",
  EQU: "compare. Passes power while both values are equal.",
  NEQ: "compare. Passes power while the values differ.",
  GEQ: "compare. Passes power while the first value is at least the second.",
  LEQ: "compare. Passes power while the first value is at most the second.",
  MOV: "move. Copies a value into a tag while the rung is true.",
  ADD: "add. Writes the sum of two values into a tag while the rung is true.",
  SUB: "subtract. Writes the difference of two values into a tag while the rung is true.",
};

const CMP_WORD: Record<string, string> = { GRT: "is above", LES: "is below", EQU: "equals", NEQ: "is not", GEQ: "is at least", LEQ: "is at most" };
const OPS = "XIC|XIO|ONS|GRT|LES|EQU|NEQ|GEQ|LEQ|OTE|OTL|OTU|TON|TOF|CTU|CTD|RES|MOV|ADD|SUB";

function describe(node: LogicNode, top = true): string {
  if (node.kind === "contact") {
    if (node.op === "ONS") return "the rung has just turned on";
    if (node.b !== undefined) return `${node.tag} ${CMP_WORD[node.op]} ${node.b}`;
    return `${node.tag} is ${node.op === "XIC" ? "on" : "off"}`;
  }
  const parts = node.children.map((c) => describe(c, false));
  const joined = parts.join(node.kind === "series" ? " and " : " or ");
  return !top && node.kind === "parallel" ? `(${joined})` : joined;
}

export function rungInEnglish(r: Rung) {
  const phrase = (o: Rung["outputs"][number]) => {
    switch (o.op) {
      case "OTL":
        return `${o.tag} latches on`;
      case "OTU":
        return `${o.tag} is cleared`;
      case "TON":
        return `timer ${o.tag} counts up to ${o.preset! / 1000} s`;
      case "TOF":
        return `off-delay ${o.tag} stays done`;
      case "CTU":
        return `counter ${o.tag} adds one each time this turns on`;
      case "CTD":
        return `counter ${o.tag} takes one away each time this turns on`;
      case "RES":
        return `${o.tag} is reset`;
      case "MOV":
        return `${o.tag} is set to ${o.src![0]}`;
      case "ADD":
        return `${o.tag} becomes ${o.src![0]} plus ${o.src![1]}`;
      case "SUB":
        return `${o.tag} becomes ${o.src![0]} minus ${o.src![1]}`;
      default:
        return `${o.tag} is on`;
    }
  };
  const outs = r.outputs.map(phrase).join(", and ");
  const when = r.outputs.some((o) => o.op === "CTU" || o.op === "CTD") ? "when" : "while";
  return r.logic ? `${outs} ${when} ${describe(r.logic)}.` : `${outs} every scan.`;
}

function instructionsOn(line: string) {
  return [...line.matchAll(new RegExp(`\\b(${OPS})\\s*\\(([^)]*)\\)`, "g"))].map((m) => ({ op: m[1], arg: m[2].split(",")[0].trim() }));
}

function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  const at = line.indexOf("//");
  const code = at >= 0 ? line.slice(0, at) : line;
  const re = new RegExp(`(RUNG\\s+\\d+\\s*:)|\\b(${OPS})\\b|\\b(AND|OR)\\b|([A-Za-z_][A-Za-z0-9_.]*)`, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    if (m[1]) out.push(<span key={k++} className="text-[#8a6d3b]">{m[0]}</span>);
    else if (m[2]) out.push(<span key={k++} className="font-semibold text-[#7a3fb0]">{m[0]}</span>);
    else if (m[3]) out.push(<span key={k++} className="font-semibold text-[#2457a6]">{m[0]}</span>);
    else out.push(<span key={k++} className="text-[#b5531f] underline decoration-dotted decoration-[#e5b597] underline-offset-[3px]">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  if (at >= 0) out.push(<span key={k++} className="italic text-[#8f949b]">{line.slice(at)}</span>);
  return out;
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition ${on ? "border-ink bg-ink text-white" : "border-[#e1e4e8] bg-white text-ink hover:border-[#c9ced4]"}`}
    >
      {children}
    </button>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex h-8 w-8 items-center justify-center">
      <svg viewBox="0 0 28 28" className="absolute inset-0 -rotate-90">
        <circle cx="14" cy="14" r={r} fill="none" stroke="#e7e9ec" strokeWidth="3" />
        <circle cx="14" cy="14" r={r} fill="none" stroke="#d9591a" strokeWidth="3" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
      </svg>
      <span className="font-mono text-[8.5px] font-bold text-ink">{Math.round(pct * 100)}%</span>
    </span>
  );
}

export function CodeReader({ onBack }: { onBack: () => void }) {
  const rig = useRig();
  const lessonId = useSim((s) => s.lessonId);
  const source = useSim((s) => s.sources[s.lessonId] ?? "");
  const teach = TEACH[lessonId];
  const [mode, setMode] = useState<Mode>("tour");
  const [tab, setTab] = useState<Tab>("guide");
  const [scene, setScene] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const [beginner, setBeginner] = useState(true);
  const [simple, setSimple] = useState(false);
  const [focus, setFocus] = useState(true);
  const [picked, setPicked] = useState<number | null>(null);

  const program: Program | null = useMemo(() => {
    try {
      return parseProgram(source);
    } catch {
      return null;
    }
  }, [source]);
  const rungAt = useMemo(() => new Map(program?.rungs.map((r) => [r.line, r]) ?? []), [program]);
  const lines = source.split("\n");

  if (!teach) return null;
  const scenes = mode === "story" ? teach.story : teach.tour;
  const count = scenes.length;
  const idx = Math.min(scene, count - 1);
  const tourScene = mode === "tour" ? teach.tour[idx] : null;
  const range: [number, number] | null = mode === "tour" ? tourScene!.lines : mode === "explore" && picked ? [picked, picked] : null;
  const inRange = (n: number) => !!range && n >= range[0] && n <= range[1];

  const go = (d: number) => {
    const next = Math.max(0, Math.min(count - 1, idx + d));
    setScene(next);
    setSeen((s) => new Set(s).add(next));
  };

  const pickedRung = picked ? rungAt.get(picked) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-lg border border-[#e1e4e8] bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink hover:border-[#c9ced4]">
            <IconArrowLeft size={13} /> Back to the lab
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#e1e4e8] bg-white px-2.5 py-1.5 font-mono text-[11.5px] text-ink">
            <span className="h-2 w-2 rounded-[2px] bg-[#d9591a]" /> motor_start.lad <span className="text-muted-ink">1/1</span>
          </span>
          <div className="inline-flex rounded-full border border-[#e1e4e8] bg-white p-[3px]">
            {(["tour", "story", "explore"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setScene(0);
                  setTab("guide");
                }}
                className={`rounded-full px-3 py-1 text-[12px] font-medium capitalize ${mode === m ? "bg-[#d9591a] text-white" : "text-[#4b5058] hover:text-ink"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Ring pct={mode === "tour" ? seen.size / teach.tour.length : (idx + 1) / count} />
          <Pill on={beginner} onClick={() => setBeginner((b) => !b)}>
            Beginner
          </Pill>
          <Pill on={simple} onClick={() => setSimple((b) => !b)}>
            Simple view
          </Pill>
          <Pill on={focus} onClick={() => setFocus((b) => !b)}>
            Focus
          </Pill>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-[#e4e6e9] bg-white">
          <div className="overflow-x-auto py-2 font-mono text-[12.5px] leading-[22px]">
            {lines.map((line, i) => {
              const n = i + 1;
              const isComment = line.trim().startsWith("//");
              if (simple && isComment) return null;
              const rung = rungAt.get(n);
              const hot = inRange(n);
              const dim = focus && range && !hot;
              return (
                <div key={i} className={`transition-opacity ${dim ? "opacity-35" : ""}`}>
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === "explore") setPicked(n);
                    }}
                    className={`flex w-full min-w-max items-start text-left ${hot ? "bg-[#fbeee4]" : mode === "explore" ? "hover:bg-[#f6f7f8]" : ""}`}
                  >
                    <span className={`w-[3px] self-stretch ${hot ? "bg-[#d9591a]" : ""}`} />
                    <span className="w-10 shrink-0 select-none pr-3 text-right text-[#b0b4ba]">{n}</span>
                    <span className="whitespace-pre pr-6">{highlight(line)}</span>
                  </button>
                  {beginner && rung && (
                    <p className={`ml-[52px] pb-1 pr-4 font-body text-[11.5px] leading-[1.45] text-[#6b7078] ${hot ? "bg-[#fbeee4]" : ""}`}>{rungInEnglish(rung)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-[#e4e6e9] bg-white p-4">
          <div className="inline-flex self-start rounded-full bg-[#f1f2f4] p-[3px]">
            {(["guide", "storyline", "words"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold capitalize ${tab === t ? "bg-ink text-white" : "text-[#4b5058]"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4 flex-1">
            {tab === "guide" && mode === "tour" && tourScene && (
              <div key={idx} className="animate-fade-up">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#d9591a]">{tourScene.kicker}</p>
                <h3 className="mt-1 text-[21px] font-semibold leading-tight text-ink">{tourScene.title}</h3>
                <p className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted-ink">
                  <span className="rounded bg-[#fbe2d2] px-1.5 py-0.5 font-semibold text-[#b5531f]">motor_start.lad</span>
                  this lab · line {tourScene.lines[0]}
                  {tourScene.lines[1] !== tourScene.lines[0] ? `-${tourScene.lines[1]}` : ""}
                </p>
                <p className="mt-3 rounded-lg bg-[#f4f5f6] px-3 py-2.5 text-[13px] leading-[1.5] text-ink">{tourScene.lead}</p>
                <p className="mt-3 text-[13.5px] leading-[1.6] text-[#3d434a]">{tourScene.body}</p>
                {tourScene.precise && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[12.5px] font-semibold text-[#b5531f]">The precise story</summary>
                    <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[#4b5058]">{tourScene.precise}</p>
                  </details>
                )}
                {tourScene.handsTo && (
                  <div className="mt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-ink">Tags in this scene</p>
                    <div className="mt-1.5 space-y-1.5">
                      {tourScene.handsTo.map((t) => {
                        const meta = rig.tags.find((x) => x.tag === t);
                        return (
                          <div key={t} className="flex items-center justify-between rounded-lg border border-[#e4e6e9] px-3 py-2 font-mono text-[12px]">
                            <span className="text-ink">{t}</span>
                            <span className="text-muted-ink">{meta ? `${meta.address} · ${meta.connectsTo}` : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <details className="mt-3 rounded-lg border border-[#e4e6e9] px-3 py-2">
                  <summary className="cursor-pointer text-[12.5px] font-semibold text-ink">
                    Line by line ({instructionsOn(lines.slice(tourScene.lines[0] - 1, tourScene.lines[1]).join(" ")).length})
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {instructionsOn(lines.slice(tourScene.lines[0] - 1, tourScene.lines[1]).join(" ")).map((x, k) => (
                      <li key={k} className="text-[12.5px] leading-[1.5] text-[#4b5058]">
                        <span className="font-mono font-semibold text-[#7a3fb0]">{x.op}</span>
                        <span className="font-mono text-[#b5531f]">({x.arg})</span> is a {INSTR[x.op]}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}

            {tab === "guide" && mode === "story" && (
              <div key={idx} className="animate-fade-up">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#d9591a]">
                  Beat {idx + 1} of {count} · {teach.story[idx].t}
                </p>
                <p className="mt-2 text-[17px] leading-[1.5] text-ink">{teach.story[idx].text}</p>
              </div>
            )}

            {tab === "guide" && mode === "explore" && (
              <div className="animate-fade-up">
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#d9591a]">Explore</p>
                {!pickedRung ? (
                  <>
                    <h3 className="mt-1 text-[21px] font-semibold text-ink">Tap any line</h3>
                    <p className="mt-2 text-[13.5px] leading-[1.6] text-[#3d434a]">
                      Every rung explains itself: tap it to see what each instruction does and what the whole line means. Underlined words are tags you can find on the rig.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="mt-1 text-[21px] font-semibold text-ink">Rung {pickedRung.number}</h3>
                    <p className="mt-2 rounded-lg bg-[#f4f5f6] px-3 py-2.5 text-[13px] leading-[1.5] text-ink">{rungInEnglish(pickedRung)}</p>
                    <ul className="mt-3 space-y-2">
                      {instructionsOn(lines[pickedRung.line - 1]).map((x, k) => {
                        const meta = rig.tags.find((t) => t.tag === x.arg);
                        return (
                          <li key={k} className="text-[12.5px] leading-[1.5] text-[#4b5058]">
                            <span className="font-mono font-semibold text-[#7a3fb0]">{x.op}</span>
                            <span className="font-mono text-[#b5531f]">({x.arg})</span>
                            {meta ? <span className="font-mono text-muted-ink"> {meta.address}</span> : null} is a {INSTR[x.op]}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}

            {tab === "storyline" && (
              <ol className="relative space-y-3 border-l border-[#e4e6e9] pl-4">
                {teach.story.map((s, k) => (
                  <li key={k} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#d9591a] ring-4 ring-white" />
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-ink">{s.t}</p>
                    <p className="text-[13px] leading-[1.5] text-ink">{s.text}</p>
                  </li>
                ))}
              </ol>
            )}

            {tab === "words" && (
              <dl className="space-y-3">
                {teach.words.map((w) => (
                  <div key={w.term}>
                    <dt className="font-mono text-[12px] font-semibold text-[#b5531f] underline decoration-dotted underline-offset-[3px]">{w.term}</dt>
                    <dd className="mt-0.5 text-[13px] leading-[1.5] text-[#3d434a]">{w.meaning}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>

      {mode !== "explore" && (
        <div className="flex items-center justify-between">
          <button type="button" disabled={idx === 0} onClick={() => go(-1)} className="inline-flex items-center gap-1 rounded-lg border border-[#e1e4e8] bg-white px-3 py-2 text-[12.5px] font-medium text-ink disabled:opacity-40">
            <IconArrowLeft size={13} /> Back
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: count }, (_, k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === idx ? "w-8 bg-[#d9591a]" : k < idx ? "w-6 bg-[#e8b394]" : "w-6 bg-[#e1e4e8]"}`} />
            ))}
          </div>
          <button type="button" disabled={idx === count - 1} onClick={() => go(1)} className="inline-flex items-center gap-1 rounded-lg bg-[#d9591a] px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-40">
            Next <IconArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
