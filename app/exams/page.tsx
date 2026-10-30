import Link from "next/link";
import { Suspense } from "react";
import { beginExam } from "@/app/actions/exams";
import { EXAM_PRICES, LEVEL_NAMES, LEVELS, RESIT_CENTS, rand } from "@/config/plans";
import { requireUser } from "@/lib/server/auth";
import { EXAM_SPEC, PASS_PCT, examStatus } from "@/lib/server/exams";
import { BuyButton } from "@/components/site/BuyButton";
import { SiteShell, Skeleton, accentButtonClass, ghostButtonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Exams · Setpoint Labs" };

const PRACTICAL = { F: "Fundamentals and Installation", P: "Machines, Process and Platforms", E: "Advanced Programming" } as const;

async function Exams({ error }: { error?: string }) {
  const user = await requireUser("/exams");
  const all = await Promise.all(LEVELS.map((l) => examStatus(user.id, l)));
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Level exams</p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-ink">Prove your skill</h1>
        <p className="mt-2 text-[14px] leading-[1.6] text-[#4b5058]">
          Each level exam has a timed theory paper and a practical part: the level&apos;s practical assessments, marked by hidden tests. You need {PASS_PCT}% on the theory and every practical assessment passed. Pass one level before sitting the next. A pass earns a certificate of competence with a public verify page.
        </p>
        {error && <p role="alert" className="mt-3 rounded-xl bg-[#fdf0ef] px-4 py-3 text-[13.5px] text-[#9b2c2c]">{error === "busy" ? "Too many starts. Try again in an hour." : error}</p>}
      </section>
      {all.map((s, i) => {
        const l = s.level;
        return (
          <section key={l} className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[18px] font-semibold text-ink">Level {i + 1}: {LEVEL_NAMES[l]} exam</h2>
              <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${s.passed ? "text-run" : "text-muted-ink"}`}>{s.passed ? "Passed" : s.lastPct != null ? `Last theory ${s.lastPct}%` : "Not sat"}</span>
            </div>
            <p className="mt-2 text-[13.5px] leading-[1.6] text-[#4b5058]">
              Theory: {EXAM_SPEC[l].questions} questions in {EXAM_SPEC[l].minutes} minutes. Practical: the {PRACTICAL[l]} assessments.
              {l === "E" && " The Expert level also needs the final plant project and a 30 minute interview, signed off by an assessor."}
            </p>
            <p className="mt-1 text-[13px] text-muted-ink">Exam credits: {s.credits}{s.freeResitFrom ? ` · free resit from ${s.freeResitFrom.toISOString().slice(0, 10)}` : ""}</p>
            <div className="mt-4 flex flex-wrap items-start gap-3">
              {s.openAttempt && <Link href={`/exams/${s.openAttempt}`} className={accentButtonClass}>Continue the exam</Link>}
              {s.canStart && (
                <form action={beginExam}>
                  <input type="hidden" name="level" value={l} />
                  <button type="submit" className={accentButtonClass}>Start the exam now</button>
                </form>
              )}
              {!s.passed && !s.openAttempt && !s.credits && !s.blocked?.includes("first") && (
                <div className="w-full max-w-[280px]">
                  <BuyButton planId={s.lastPct != null ? `resit-${l}` : `exam-${l}`} perSeat={false} minSeats={1} priceCents={s.lastPct != null ? RESIT_CENTS : EXAM_PRICES[l]} organisation={false} label={`Buy the ${s.lastPct != null ? "resit" : "exam"}, ${rand(s.lastPct != null ? RESIT_CENTS : EXAM_PRICES[l])}`} />
                </div>
              )}
              {!s.canStart && !s.openAttempt && s.blocked && <p className="text-[13px] text-muted-ink">{s.blocked}</p>}
              <Link href="/#labs" className={ghostButtonClass}>Practise in the labs</Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default async function ExamsPage({ searchParams }: PageProps<"/exams">) {
  return (
    <SiteShell>
      <Suspense fallback={<Skeleton lines={5} />}>
        <ExamsFromParams searchParams={searchParams} />
      </Suspense>
    </SiteShell>
  );
}

async function ExamsFromParams({ searchParams }: { searchParams: PageProps<"/exams">["searchParams"] }) {
  const sp = await searchParams;
  return <Exams error={typeof sp.error === "string" ? sp.error : undefined} />;
}
