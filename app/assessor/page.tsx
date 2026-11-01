import { Suspense } from "react";
import { bookInterview, decideRplAction, signOff } from "@/app/actions/projects";
import { LEVEL_NAMES, LEVELS } from "@/config/plans";
import { rplToReview } from "@/lib/server/rpl";
import { requireRole } from "@/lib/server/auth";
import { projectsToReview } from "@/lib/server/projects";
import { SiteShell, Skeleton, accentButtonClass, ghostButtonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Assessor · Setpoint Labs" };

const when = (d: Date) => d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });

async function Review({ error, done }: { error?: string; done?: string }) {
  const me = await requireRole(["assessor"], "/assessor");
  const [rows, rpl] = await Promise.all([projectsToReview(), rplToReview()]);
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Assessor</p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-ink">Reviews</h1>
        <p className="mt-2 text-[14px] leading-[1.6] text-[#4b5058]">RPL applications first, then Expert final projects. Projects listed here pass every hidden test: read the program and design note, book a 30 minute interview, then sign off or send back with feedback.</p>
        {done && <p className="mt-3 rounded-xl bg-[#eef8f3] px-4 py-3 text-[13.5px] text-[#1b6b4a]">{done === "rpl" ? "RPL decision recorded; the candidate has been emailed." : done === "booked" ? "Interview booked; the learner has been emailed." : "Decision recorded; the learner has been emailed."}</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-[#fdf0ef] px-4 py-3 text-[13.5px] text-[#9b2c2c]">{error}</p>}
        {!rows.length && <p className="mt-3 text-[13.5px] text-muted-ink">No Expert projects waiting.</p>}
      </section>
      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <h2 className="text-[19px] font-semibold text-ink">RPL applications</h2>
        <p className="mt-1 text-[13.5px] text-[#4b5058]">Judge the experience against the level&apos;s outcomes, follow up with the referee, then approve (at the level asked or lower), ask for more, or decline. Approval only lets the candidate sit the exam.</p>
        {!rpl.length && <p className="mt-2 text-[13.5px] text-muted-ink">Nothing waiting.</p>}
      </section>
      {rpl.map(({ a, name, email }) => (
        <section key={a.id} className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-semibold text-ink">{name} · RPL for {LEVEL_NAMES[a.level as "F"]}</h2>
            <span className="text-[12.5px] text-muted-ink">{email} · {a.years} years · {a.jobTitle}{a.employer ? ` at ${a.employer}` : ""}</span>
          </div>
          <h3 className="mt-3 text-[13px] font-semibold text-ink">Experience</h3>
          <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-[#3d434a]">{a.experience}</p>
          <h3 className="mt-3 text-[13px] font-semibold text-ink">Evidence</h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-[13.5px] text-[#3d434a]">{a.evidence}</p>
          {a.qualifications && (
            <>
              <h3 className="mt-3 text-[13px] font-semibold text-ink">Qualifications</h3>
              <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-[#3d434a]">{a.qualifications}</p>
            </>
          )}
          <form action={decideRplAction} className="mt-4 flex flex-col gap-2">
            <input type="hidden" name="application" value={a.id} />
            <textarea name="feedback" required rows={3} placeholder="Feedback for the candidate" className="rounded-lg border border-[#dfe2e6] p-3 text-[13.5px]" />
            <div className="flex flex-wrap items-center gap-2">
              <select name="approvedLevel" defaultValue={a.level} className="rounded-lg border border-[#dfe2e6] px-3 py-2 text-[13px]">
                {LEVELS.slice(0, LEVELS.indexOf(a.level as "F") + 1).map((l) => <option key={l} value={l}>Approve at {LEVEL_NAMES[l]}</option>)}
              </select>
              <button type="submit" name="decision" value="approve" className={accentButtonClass}>Approve</button>
              <button type="submit" name="decision" value="more_info" className={ghostButtonClass}>Ask for more</button>
              <button type="submit" name="decision" value="decline" className={ghostButtonClass}>Decline</button>
            </div>
          </form>
        </section>
      ))}
      {rows.map(({ p, name, email }) => (
        <section key={p.id} className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-semibold text-ink">{name}</h2>
            <span className="text-[12.5px] text-muted-ink">{email} · submitted {p.submittedAt ? when(p.submittedAt) : ""}</span>
          </div>
          <h3 className="mt-3 text-[13px] font-semibold text-ink">Design note</h3>
          <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-[#3d434a]">{p.notes}</p>
          <details className="mt-3">
            <summary className="cursor-pointer text-[13px] font-semibold text-ink">Program ({p.language === "st" ? "structured text" : "ladder"})</summary>
            <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg bg-[#f6f7f8] p-3 text-[12px]">{p.source}</pre>
          </details>
          {!p.interviewAt ? (
            <form action={bookInterview} className="mt-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="project" value={p.id} />
              <input type="datetime-local" name="at" required className="rounded-lg border border-[#dfe2e6] px-3 py-2 text-[13px]" />
              <input name="link" required placeholder="https:// meeting link" className="min-w-[260px] flex-1 rounded-lg border border-[#dfe2e6] px-3 py-2 text-[13px]" />
              <button type="submit" className={accentButtonClass}>Book the interview</button>
            </form>
          ) : (
            <form action={signOff} className="mt-4 flex flex-col gap-2">
              <p className="text-[13px] text-[#3d434a]">
                Interview {when(p.interviewAt)} · <a className="underline" href={p.interviewLink ?? "#"}>{p.interviewLink}</a>
                {p.assessorId && p.assessorId !== me.id ? " · booked by another assessor" : ""}
              </p>
              <input type="hidden" name="project" value={p.id} />
              <textarea name="feedback" required rows={4} placeholder="Feedback for the learner" className="rounded-lg border border-[#dfe2e6] p-3 text-[13.5px]" />
              <div className="flex gap-2">
                <button type="submit" name="outcome" value="pass" className={accentButtonClass}>Sign off</button>
                <button type="submit" name="outcome" value="fail" className={ghostButtonClass}>Send back</button>
              </div>
            </form>
          )}
        </section>
      ))}
    </div>
  );
}

export default function AssessorPage({ searchParams }: PageProps<"/assessor">) {
  return (
    <SiteShell wide>
      <Suspense fallback={<Skeleton lines={6} />}>
        <FromParams searchParams={searchParams} />
      </Suspense>
    </SiteShell>
  );
}

async function FromParams({ searchParams }: { searchParams: PageProps<"/assessor">["searchParams"] }) {
  const sp = await searchParams;
  return <Review error={typeof sp.error === "string" ? sp.error : undefined} done={typeof sp.done === "string" ? sp.done : undefined} />;
}
