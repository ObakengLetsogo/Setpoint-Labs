"use client";

import { useState, type ReactNode } from "react";
import type { Lesson } from "@/data/types";
import { TEACH, WIRES } from "@/data/teach";
import { useSim } from "@/store/sim";
import { CodeCard } from "@/components/code/CodeCard";
import { IconBulb, IconCheck, IconCode, IconFlag, IconList, IconMonitor, IconWire } from "@/components/ui/icons";
import { IoPinout } from "./IoPinout";
import { WiringTable, WiringView } from "./WiringView";
import { CodeReader } from "./CodeReader";
import { TerminalChip, toneFor, usedTerminals } from "./Terminal";
import { withChips } from "./chips";

function Section({ id, n, icon, title, children }: { id: string; n: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section id={id} className="relative scroll-mt-28 pl-11">
      <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#dfe2e6] bg-white text-[#5b6068]">{icon}</span>
      <h3 className="flex items-baseline gap-2 pt-1 text-[19px] font-semibold text-ink">
        <span className="font-mono text-[12px] font-semibold text-[#d9591a]">{n}</span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Steps({ lessonId, steps }: { lessonId: string; steps: string[] }) {
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const done = steps.filter((_, i) => ticked[`${lessonId}-${i}`]).length;
  return (
    <div>
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const key = `${lessonId}-${i}`;
          const on = Boolean(ticked[key]);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => setTicked((t) => ({ ...t, [key]: !t[key] }))}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${on ? "border-run/30 bg-run/[0.05]" : "border-[#e4e6e9] bg-white hover:border-[#c9ced4]"}`}
              >
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${on ? "bg-run text-white" : "border border-[#d5d9de] text-[#5b6068]"}`}>
                  {on ? <IconCheck size={12} strokeWidth={3} /> : String(i + 1).padStart(2, "0")}
                </span>
                <span className={`text-[13.5px] leading-[1.55] ${on ? "text-[#5b6068] line-through decoration-[#9fd3bb]" : "text-ink"}`}>{withChips(s)}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 font-mono text-[11px] text-muted-ink">
        {done} of {steps.length} ticked
      </p>
    </div>
  );
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  const [mode, setMode] = useState<"lab" | "code">("lab");
  const teach = TEACH[lesson.id];
  const completed = useSim((s) => s.completed[lesson.id]);
  const ran = useSim((s) => s.ranLessons[lesson.id]);

  if (!teach || lesson.locked) {
    return (
      <section id="lesson" className="rounded-2xl border border-dashed border-[#d5d9de] bg-white px-6 py-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-ink">F{lesson.number} · planned</p>
        <p className="mt-2 text-[20px] font-semibold text-ink">{lesson.title}</p>
        <p className="mt-1 text-[13.5px] text-[#5b6068]">This lab is being written. The first three run on the sim today.</p>
      </section>
    );
  }

  const used = usedTerminals(teach.wires);
  const status = completed ? ["done by you", "bg-run text-white"] : ran ? ["runs on the sim", "bg-run/10 text-run"] : ["built, not run", "bg-[#fbeee4] text-[#b5531f]"];
  const stops = teach.tour.length;
  const nav: [string, string, ReactNode][] = [
    ["goal", "Goal", <IconFlag key="g" size={13} />],
    ["how", "How it works", <IconBulb key="h" size={13} />],
    ["wire", "Wire", <IconWire key="w" size={13} />],
    ["steps", `Steps 0/${teach.steps.length}`, <IconList key="s" size={13} />],
    ["run", "Run it", <IconMonitor key="r" size={13} />],
  ];

  return (
    <section id="lesson" className="flex flex-col gap-4 scroll-mt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="flex items-baseline gap-3 text-[26px] font-semibold tracking-[-0.01em] text-ink">
          <span className="font-mono text-[14px] font-bold text-[#d9591a]">{String(lesson.number).padStart(2, "0")}</span>
          {lesson.title}
        </h2>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold ${status[1]}`}>{status[0]}</span>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[#e4e6e9] bg-white p-1">
        <button
          type="button"
          onClick={() => setMode("lab")}
          className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition ${mode === "lab" ? "bg-[#f3f4f5]" : "hover:bg-[#f8f9fa]"}`}
        >
          <IconWire size={16} />
          <span>
            <span className="block text-[14px] font-semibold text-ink">Do the lab</span>
            <span className="block font-mono text-[10.5px] text-muted-ink">wire · run · check</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("code")}
          className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-left transition ${mode === "code" ? "bg-ink text-white" : "hover:bg-[#f8f9fa]"}`}
        >
          <IconCode size={16} />
          <span>
            <span className="flex items-center gap-2 text-[14px] font-semibold">
              Read the code
              <span className="rounded-full bg-[#d9591a] px-2 py-0.5 font-mono text-[9.5px] font-bold text-white">{stops} stop tour</span>
            </span>
            <span className={`block font-mono text-[10.5px] ${mode === "code" ? "text-[#aeb6c0]" : "text-muted-ink"}`}>1 file · ladder · guided tour</span>
          </span>
        </button>
      </div>

      {mode === "code" ? (
        <CodeReader key={lesson.id} onBack={() => setMode("lab")} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-4 lg:self-start">
            <IoPinout wires={teach.wires} between={teach.between} />
          </div>

          <div className="flex min-w-0 flex-col gap-8">
            <nav className="no-scrollbar sticky top-0 z-20 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-[#e4e6e9] bg-white/90 p-1 backdrop-blur">
              {nav.map(([id, label, icon]) => (
                <a key={id} href={`#${id}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-[#3d434a] hover:bg-[#f3f4f5] hover:text-ink">
                  {icon}
                  {label}
                </a>
              ))}
            </nav>

            <div className="relative flex flex-col gap-10 before:absolute before:bottom-4 before:left-4 before:top-8 before:w-px before:bg-[#e4e6e9]">
              <Section id="goal" n="00" icon={<IconFlag size={14} />} title="Goal">
                <div className="rounded-2xl border border-[#e4e6e9] bg-white p-5">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#d9591a]">Foundations · lesson {lesson.number} of 20</p>
                  <p className="mt-2 text-[15px] leading-[1.6] text-ink">{teach.goal}</p>
                  <p className="mt-2 text-[13.5px] leading-[1.6] text-[#4b5058]">{lesson.summary}</p>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-ink">On the rig</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {WIRES.filter((w) => teach.wires.includes(w.n)).map((w) => (
                      <TerminalChip key={w.n} id={w.plc} tone={toneFor(w.plc, used)} label={`${w.plc} ${w.role}`} />
                    ))}
                  </div>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-ink">You will learn</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {teach.learn.map((l) => (
                      <span key={l} className="rounded-md border border-[#e4e6e9] bg-[#f6f7f8] px-2 py-1 font-mono text-[11px] text-ink">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </Section>

              <Section id="how" n="01" icon={<IconBulb size={14} />} title="How it is wired">
                <WiringView key={lesson.id} wires={teach.wires} />
              </Section>

              <Section id="wire" n="02" icon={<IconWire size={14} />} title="Wiring">
                <WiringTable wires={teach.wires} />
              </Section>

              <Section id="steps" n="03" icon={<IconList size={14} />} title="Steps">
                <Steps key={lesson.id} lessonId={lesson.id} steps={teach.steps} />
              </Section>

              <Section id="run" n="04" icon={<IconMonitor size={14} />} title="Run it on the sim">
                <CodeCard />
              </Section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
