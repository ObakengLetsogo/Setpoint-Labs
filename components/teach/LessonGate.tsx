"use client";

import Link from "next/link";
import type { LessonMeta } from "@/data/catalog";
import type { ContentStatus } from "@/store/sim";
import { useSim } from "@/store/sim";
import { IconLock } from "@/components/ui/icons";

/** Stands in for a lesson while its content loads, or explains how to unlock it. */
export function LessonGate({ lesson, status }: { lesson: LessonMeta; status: ContentStatus | undefined }) {
  const retry = () => useSim.getState().loadContent(lesson.id);
  if (!status || status === "loading")
    return (
      <section id="lesson" className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-ink">{lesson.chip} · loading</p>
        <p className="mt-2 text-[20px] font-semibold text-ink">{lesson.title}</p>
        <div className="mt-5 space-y-3">
          {[85, 70, 55].map((w) => (
            <div key={w} className="h-4 animate-pulse rounded bg-[#eef0f2]" style={{ width: `${w}%` }} />
          ))}
        </div>
      </section>
    );
  const next = encodeURIComponent(`/#lesson`);
  return (
    <section id="lesson" className="rounded-2xl border border-[#e4e6e9] bg-white px-6 py-10 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#fff1e8] text-[#d9591a]">
        <IconLock size={18} />
      </span>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-ink">{lesson.chip} · {status === "error" ? "offline" : "members"}</p>
      <p className="mt-2 text-[20px] font-semibold text-ink">{lesson.title}</p>
      <p className="mx-auto mt-2 max-w-[440px] text-[14px] leading-[1.6] text-[#4b5058]">
        {status === "signin" && "Sign in to open this lab. The first two Foundations chapters are free for everyone."}
        {status === "upgrade" && "This lab is part of the full course. A Learner plan opens every track, machine, quiz and certificate."}
        {status === "error" && "We could not load this lab. Check your connection and try again."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {status === "signin" && (
          <>
            <Link href={`/login?next=${next}`} className="rounded-xl bg-ink px-4 py-2.5 text-[14px] font-semibold text-white">Sign in</Link>
            <Link href={`/signup?next=${next}`} className="rounded-xl border border-[#dfe2e6] px-4 py-2.5 text-[14px] font-semibold text-ink">Create an account</Link>
          </>
        )}
        {status === "upgrade" && <Link href="/pricing" className="rounded-xl bg-accent px-4 py-2.5 text-[14px] font-semibold text-white">See plans</Link>}
        {status === "error" && (
          <button type="button" onClick={retry} className="rounded-xl bg-ink px-4 py-2.5 text-[14px] font-semibold text-white">Try again</button>
        )}
      </div>
    </section>
  );
}
