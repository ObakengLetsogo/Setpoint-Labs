"use client";

import type { RigId } from "@/data/curriculum";
import { lessons } from "@/data/lessons";
import { isSandbox, sandboxId, sandboxRig } from "@/data/sandbox";
import { RIGS } from "@/rigs";
import type { RigDef } from "@/rigs/types";
import { defaultST, useRig, useSim } from "@/store/sim";
import { CodeCard } from "@/components/code/CodeCard";
import { Multimeter } from "./Multimeter";
import { IconArrowRight, IconBolt, IconCode, IconHand } from "@/components/ui/icons";

const rigs = Object.values(RIGS) as RigDef[];
const lessonsOn = (rig: RigId) => lessons.filter((l) => l.rig === rig && !l.locked);

/** Pick any machine and program it freely. */
export function SandboxPicker({ onOpen }: { onOpen: () => void }) {
  const lessonId = useSim((s) => s.lessonId);
  const active = sandboxRig(lessonId);
  return (
    <section id="sandbox" className="scroll-mt-6 rounded-2xl border border-[#e4e6e9] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Sandbox</p>
          <h2 className="mt-1 font-display text-[24px] font-bold text-ink">Free play on any machine</h2>
          <p className="mt-1 max-w-[560px] text-[13.5px] leading-[1.6] text-[#4b5058]">
            Your own program in ladder or structured text, on any of the {rigs.length} machines. Faults and controls work as in the labs. Nothing is marked.
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {rigs.map((rig) => {
          const on = active === rig.id;
          const inputs = rig.tags.filter((t) => t.kind === "input").length;
          const outputs = rig.tags.filter((t) => t.kind === "output").length;
          return (
            <button
              key={rig.id}
              type="button"
              onClick={() => {
                useSim.getState().setLesson(sandboxId(rig.id));
                onOpen();
              }}
              className={`group flex flex-col items-start rounded-xl border px-3.5 py-3 text-left transition ${
                on ? "border-accent/60 bg-[#fff8f3] shadow-[0_0_0_3px_rgba(242,107,29,0.1)]" : "border-[#e4e6e9] bg-[#fafbfb] hover:border-ink/25 hover:bg-white"
              }`}
            >
              <span className="text-[14px] font-semibold text-ink">{rig.name}</span>
              <span className="mt-0.5 font-mono text-[10.5px] text-muted-ink">
                {inputs} in · {outputs} out · {lessonsOn(rig.id).length} {lessonsOn(rig.id).length === 1 ? "lab" : "labs"}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#d9591a] opacity-80 group-hover:opacity-100">
                {on ? "Open now" : "Program it"} <IconArrowRight size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The workspace shown in place of a lesson while a sandbox is open. */
export function SandboxView() {
  const rig = useRig();
  const lessonId = useSim((s) => s.lessonId);
  const codeLang = useSim((s) => s.codeLang);
  if (!isSandbox(lessonId)) return null;
  const start = lessonsOn(rig.id);

  const load = (id: string) => {
    const lesson = lessons.find((l) => l.id === id);
    if (lesson) useSim.getState().setSource(codeLang === "st" ? defaultST(id) : lesson.code.join("\n"));
  };

  return (
    <section id="lesson" className="scroll-mt-6 flex flex-col gap-5">
      <div className="rounded-2xl border border-[#e4e6e9] bg-white p-5 sm:p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Sandbox · {rig.name}</p>
        <h2 className="mt-1 font-display text-[26px] font-bold text-ink">
          {rig.headline[0]} <span className="text-accent">{rig.headline[1]}</span>
        </h2>
        <p className="mt-1 max-w-[620px] text-[13.5px] leading-[1.6] text-[#4b5058]">{rig.tagline}</p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-ink">
              <IconCode size={12} /> Start from a lab program
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {start.length === 0 && <span className="text-[12.5px] text-muted-ink">No labs on this machine yet.</span>}
              {start.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => load(l.id)}
                  className="rounded-md border border-[#e4e6e9] bg-[#f6f7f8] px-2 py-1 font-mono text-[11px] text-ink transition hover:border-ink/25 hover:bg-white"
                >
                  {l.chip} {l.title}
                </button>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-ink">
              <IconHand size={12} /> Hands on
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-[#4b5058]">
              Pick a part on the rig above to press it, change a setting or read a meter.
            </p>
            {rig.faults.length > 0 && (
              <>
                <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-ink">
                  <IconBolt size={12} /> Faults you can inject
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rig.faults.map((f) => (
                    <span key={f.key} className="rounded-md border border-[#f1d6d6] bg-[#fdf4f4] px-2 py-1 font-mono text-[11px] text-[#9b2c2c]">
                      {f.label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#e4e6e9]">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#f6f7f8] font-mono text-[10px] uppercase tracking-[0.14em] text-muted-ink">
                <tr>
                  <th className="px-3 py-2 font-medium">Tag</th>
                  <th className="px-3 py-2 font-medium">Address</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Wired to</th>
                </tr>
              </thead>
              <tbody>
                {rig.tags
                  .filter((t) => t.kind !== "marker")
                  .map((t) => (
                    <tr key={t.tag} className="border-t border-[#eef0f2]">
                      <td className="px-3 py-1.5 font-mono text-ink">
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: t.color }} />
                        {t.tag}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[#4b5058]">{t.address}</td>
                      <td className="hidden px-3 py-1.5 text-[#4b5058] sm:table-cell">{t.connectsTo}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <CodeCard />
      <Multimeter key={rig.id} />
    </section>
  );
}
