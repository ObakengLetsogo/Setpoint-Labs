"use client";

import { bundleOf, useSim } from "@/store/sim";

interface ServerProgress {
  completed: string[];
  ran: string[];
  quiz: Record<string, number>;
  programs: { slot: string; language: "ladder" | "st"; source: string }[];
}

let started = false;

const post = (body: unknown) =>
  fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => undefined);

/**
 * Keeps a signed in learner's progress and programs on their account. Pulls once, so a new device
 * picks up where the last one stopped, then pushes each change. Without an account everything
 * stays in this browser only.
 */
export async function startSync() {
  if (started || !useSim.getState().account?.user) return;
  started = true;

  const res = await fetch("/api/progress", { cache: "no-store" }).catch(() => null);
  if (res?.ok) {
    const server = (await res.json()) as ServerProgress;
    const s = useSim.getState();
    const completed = { ...s.completed };
    const ran = { ...s.ranLessons };
    const quiz = { ...s.quizScores };
    server.completed.forEach((id) => (completed[id] = true));
    server.ran.forEach((id) => (ran[id] = true));
    for (const [id, score] of Object.entries(server.quiz)) quiz[id] = Math.max(score, quiz[id] ?? 0);
    const sources = { ...s.sources };
    const stSources = { ...s.stSources };
    for (const p of server.programs) (p.language === "st" ? stSources : sources)[p.slot] = p.source;
    useSim.setState({ completed, ranLessons: ran, quizScores: quiz, sources, stSources });
    if (server.programs.some((p) => p.slot === s.lessonId)) s.setLesson(s.lessonId);

    // Anything this browser knew that the account did not.
    for (const id of Object.keys(s.completed)) if (s.completed[id] && !server.completed.includes(id)) void post({ lessonId: id, status: "completed" });
    for (const id of Object.keys(s.ranLessons)) if (s.ranLessons[id] && !server.ran.includes(id)) void post({ lessonId: id, status: "ran" });
  }

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  useSim.subscribe((st, prev) => {
    for (const id of Object.keys(st.completed)) if (st.completed[id] && !prev.completed[id]) void post({ lessonId: id, status: "completed" });
    for (const id of Object.keys(st.ranLessons)) if (st.ranLessons[id] && !prev.ranLessons[id]) void post({ lessonId: id, status: "ran" });
    for (const id of Object.keys(st.quizScores))
      if (st.quizScores[id] !== prev.quizScores[id]) void post({ lessonId: id, quiz: { score: st.quizScores[id], total: bundleOf(id)?.quiz.length ?? 10 } });

    const slot = st.lessonId;
    const lang = st.codeLang;
    const now = lang === "st" ? st.stSources[slot] : st.sources[slot];
    const before = lang === "st" ? prev.stSources[slot] : prev.sources[slot];
    if (now !== undefined && now !== before && prev.lessonId === slot && prev.codeLang === lang) {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        void fetch("/api/programs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot, language: lang, source: now }) }).catch(() => undefined);
      }, 1500);
    }
  });
}
