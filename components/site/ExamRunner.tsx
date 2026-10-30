"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { finishExam, reportIncident, type ExamResult } from "@/app/actions/exams";
import { accentButtonClass, ghostButtonClass } from "./SiteShell";

type Done = { theoryPct: number; practical: boolean; passed: boolean; late: boolean };

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** A timed exam paper. Answers are kept in this browser until submitted, so a refresh loses nothing. */
export function ExamRunner({ attemptId, title, deadline, questions, done, expert, atCentre = false }: { attemptId: string; title: string; deadline: string; questions: { q: string; options: string[] }[]; done: Done | null; expert: boolean; atCentre?: boolean }) {
  const key = `exam:${attemptId}`;
  const [answers, setAnswers] = useState<(number | null)[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null");
      if (Array.isArray(saved) && saved.length === questions.length) return saved;
    } catch {}
    return questions.map(() => null);
  });
  const [left, setLeft] = useState(() => new Date(deadline).getTime() - Date.now());
  const [result, setResult] = useState<ExamResult | Done | null>(done);
  const [sending, setSending] = useState(false);
  const sent = useRef(Boolean(done));
  const [full, setFull] = useState(false);
  const [warned, setWarned] = useState(0);

  // At a centre the paper runs full screen. Leaving it, or switching away, is recorded for the
  // assessor and the invigilator sees a warning on screen.
  useEffect(() => {
    if (!atCentre || result) return;
    const note = (what: string) => {
      setWarned((n) => n + 1);
      void reportIncident(attemptId, what);
    };
    const onVis = () => document.visibilityState === "hidden" && note("left the exam tab");
    const onBlur = () => note("window lost focus");
    const onFull = () => {
      const on = Boolean(document.fullscreenElement);
      setFull(on);
      if (!on) note("left full screen");
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFull);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFull);
    };
  }, [atCentre, attemptId, result]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(answers));
    } catch {}
  }, [key, answers]);

  const submit = useCallback(async () => {
    if (sent.current) return;
    sent.current = true;
    setSending(true);
    const r = await finishExam(attemptId, answers);
    setResult(r);
    setSending(false);
    if (!("error" in r)) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }, [attemptId, answers, key]);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => {
      const ms = new Date(deadline).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) void submit();
    }, 500);
    return () => clearInterval(t);
  }, [deadline, result, submit]);

  if (result) {
    if ("error" in result) return <p className="rounded-2xl border border-[#e4e6e9] bg-white p-6 text-[14px] text-[#9b2c2c]">{result.error}</p>;
    return (
      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">{title} · result</p>
        <h1 className={`mt-1 font-display text-[30px] font-bold ${result.passed ? "text-run" : "text-ink"}`}>{result.passed ? "Passed" : expert && result.theoryPct >= 70 && result.practical ? "Theory and practical passed" : "Not passed yet"}</h1>
        <ul className="mt-3 flex flex-col gap-1 text-[14px] text-[#3d434a]">
          <li>Theory: <b>{result.theoryPct}%</b> {result.theoryPct >= 70 ? "(pass)" : "(70% needed)"}</li>
          <li>Practical assessments: <b>{result.practical ? "all passed" : "not all passed yet"}</b></li>
          {result.late && <li className="text-[#9b2c2c]">The paper arrived after the time limit, so no answers counted.</li>}
          {expert && <li>Expert also needs the final plant project and the interview; an assessor will be in touch.</li>}
        </ul>
        {!result.passed && (
          <ul className="mt-3 list-disc pl-5 text-[13.5px] text-[#4b5058]">
            {result.theoryPct < 70 && <li>Revise the lessons and quizzes, then resit the theory. Your first resit is free 14 days after this attempt.</li>}
            {!result.practical && <li>Pass the remaining practical assessments in the labs. They count towards your next attempt.</li>}
          </ul>
        )}
        {result.passed && <p className="mt-3 text-[13.5px] text-[#4b5058]">Your certificate of competence is in your account and your email.</p>}
        <div className="mt-4 flex gap-2">
          <Link href="/exams" className={accentButtonClass}>Back to exams</Link>
          <Link href="/account" className={ghostButtonClass}>Your account</Link>
        </div>
      </section>
    );
  }

  const answered = answers.filter((a) => a != null).length;
  return (
    <div className="flex flex-col gap-4 bg-[#f4f5f6]">
      {atCentre && !full && (
        <div className="rounded-2xl border border-[#f08a2c] bg-[#fff6ec] p-4 text-[13.5px] text-[#6b3d0e]">
          <p className="font-semibold">This exam runs full screen.{warned > 0 && ` ${warned} event${warned === 1 ? "" : "s"} recorded for the assessor.`}</p>
          <button type="button" onClick={() => void document.documentElement.requestFullscreen?.()} className={`${accentButtonClass} mt-2`}>Go full screen</button>
        </div>
      )}
      <section className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e4e6e9] bg-white/95 p-4 backdrop-blur">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">{title}</p>
          <p className="text-[13px] text-muted-ink">{answered} of {questions.length} answered</p>
        </div>
        <p className={`font-mono text-[22px] font-bold ${left < 5 * 60_000 ? "text-[#c8402d]" : "text-ink"}`} aria-live="polite">{mmss(left)}</p>
        <button type="button" disabled={sending} onClick={() => { if (answered === questions.length || confirm(`${questions.length - answered} questions are unanswered. Submit anyway?`)) void submit(); }} className={accentButtonClass}>
          {sending ? "Marking" : "Submit"}
        </button>
      </section>
      {questions.map((q, i) => (
        <fieldset key={i} className="rounded-2xl border border-[#e4e6e9] bg-white p-5">
          <legend className="sr-only">Question {i + 1}</legend>
          <p className="text-[14.5px] font-semibold text-ink"><span className="mr-2 font-mono text-[12px] text-muted-ink">{i + 1}.</span>{q.q}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {q.options.map((o, j) => (
              <label key={j} className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-[13.5px] ${answers[i] === j ? "border-ink bg-[#f5f6f7]" : "border-[#e4e6e9]"}`}>
                <input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))} className="mt-0.5" />
                {o}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
