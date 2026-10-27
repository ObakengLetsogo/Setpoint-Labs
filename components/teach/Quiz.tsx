"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/data/quizzes/types";
import { useSim } from "@/store/sim";
import { IconCheck, IconReset } from "@/components/ui/icons";

/** Multiple choice quiz with an explanation after every answer and a best score that is saved. */
export function Quiz({ lessonId, questions }: { lessonId: string; questions: QuizQuestion[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const best = useSim((s) => s.quizScores[lessonId]);
  const setQuizScore = useSim((s) => s.setQuizScore);
  const answered = Object.keys(picked).length;
  const score = questions.filter((q, i) => picked[i] === q.answer).length;
  const finished = answered === questions.length;

  const choose = (i: number, option: number) => {
    if (picked[i] !== undefined) return;
    const next = { ...picked, [i]: option };
    setPicked(next);
    if (Object.keys(next).length === questions.length) setQuizScore(lessonId, questions.filter((q, k) => next[k] === q.answer).length);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-[#e4e6e9] bg-white px-4 py-2.5">
        <span className="font-mono text-[11px] text-muted-ink">
          {answered} of {questions.length} answered · {score} right
        </span>
        <span className="font-mono text-[11px] text-muted-ink">{best !== undefined ? `best ${best}/${questions.length}` : "not tried yet"}</span>
      </div>
      <ol className="flex flex-col gap-3">
        {questions.map((q, i) => {
          const mine = picked[i];
          const done = mine !== undefined;
          return (
            <li key={i} className="rounded-2xl border border-[#e4e6e9] bg-white p-4">
              <p className="text-[14px] font-semibold leading-[1.5] text-ink">
                <span className="mr-2 font-mono text-[11px] font-bold text-[#d9591a]">{String(i + 1).padStart(2, "0")}</span>
                {q.q}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((o, k) => {
                  const right = done && k === q.answer;
                  const wrong = done && k === mine && k !== q.answer;
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={done}
                      onClick={() => choose(i, k)}
                      className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-[13px] leading-[1.45] transition ${
                        right ? "border-run/50 bg-run/[0.07] text-ink" : wrong ? "border-fault/40 bg-fault/[0.06] text-ink" : done ? "border-[#eceef0] text-[#8a9098]" : "border-[#e4e6e9] text-ink hover:border-[#b9c0c7]"
                      }`}
                    >
                      <span className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${right ? "bg-run text-white" : wrong ? "bg-fault text-white" : "bg-[#f3f4f5] text-[#5b6068]"}`}>
                        {right ? <IconCheck size={11} strokeWidth={3} /> : "ABCD"[k]}
                      </span>
                      {o}
                    </button>
                  );
                })}
              </div>
              {done && <p className={`mt-3 rounded-lg px-3 py-2 text-[12.5px] leading-[1.55] ${mine === q.answer ? "bg-run/[0.06] text-[#1d5e44]" : "bg-[#fbeee4] text-[#8a3d12]"}`}>{q.why}</p>}
            </li>
          );
        })}
      </ol>
      {finished && (
        <div className="flex items-center justify-between rounded-2xl border border-[#e4e6e9] bg-white px-4 py-3">
          <p className="text-[14px] font-semibold text-ink">
            {score} of {questions.length}. {score === questions.length ? "Perfect." : score >= questions.length * 0.7 ? "Well done." : "Read the explanations and try again."}
          </p>
          <button type="button" onClick={() => setPicked({})} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e6e9] px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-[#b9c0c7]">
            <IconReset size={13} /> Try again
          </button>
        </div>
      )}
    </div>
  );
}
