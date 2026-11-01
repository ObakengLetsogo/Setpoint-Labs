import Link from "next/link";
import { Suspense } from "react";
import { sendProject } from "@/app/actions/projects";
import { requireUser } from "@/lib/server/auth";
import { PROJECT_TESTS } from "@/lib/server/assess";
import { projectFor } from "@/lib/server/projects";
import { SiteShell, Skeleton, accentButtonClass, ghostButtonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Expert final project · Setpoint Labs" };

const TAGS: [string, string][] = [
  ["Start_PB, Stop_PB", "I0.0, I0.1: auto start; stop is NC, 1 at rest"],
  ["LS_Low, LS_Lead, LS_Lag, LS_HighHigh", "I0.2 to I0.5: floats, 1 when covered"],
  ["P1_OK, P2_OK", "I0.6, I0.7: overloads, 1 when healthy"],
  ["Flow1_OK, Flow2_OK", "I1.1, I1.2: delivery flow switches, 1 when water flows"],
  ["Ack_PB", "I1.0: acknowledge"],
  ["P1_Run, P2_Run, Horn, Alarm_Lamp", "Q0.0 to Q0.3"],
];
const when = (d: Date) => d.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });

async function Project({ error, sent }: { error?: string; sent: boolean }) {
  const user = await requireUser("/exams/project");
  const p = await projectFor(user.id);
  if (!p)
    return (
      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <h1 className="font-display text-[26px] font-bold text-ink">Expert final project</h1>
        <p className="mt-2 text-[14px] text-[#4b5058]">Your final plant project opens when you pass the Expert exam.</p>
        <Link href="/exams" className={`${ghostButtonClass} mt-4`}>Back to exams</Link>
      </section>
    );
  const results = (p.results as { name: string; passed: boolean; detail?: string }[] | null) ?? [];
  const locked = p.outcome === "pass" || (Boolean(p.interviewAt) && p.outcome === "pending");
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Level 3: Expert</p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-ink">Final plant project</h1>
        <p className="mt-2 text-[14px] leading-[1.6] text-[#4b5058]">
          Write the complete control program for the underground pump station, in ladder or structured text, and a design note explaining it. Hidden tests mark the program as soon as you submit. When every test passes, an assessor books a 30 minute interview with you, then signs the project off.
        </p>
        <p className="mt-2 text-[13.5px] text-[#3d434a]"><b>Due:</b> {when(p.dueAt)}</p>
        {sent && <p className="mt-3 rounded-xl bg-[#eef8f3] px-4 py-3 text-[13.5px] text-[#1b6b4a]">Submitted and marked. Results are below.</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-[#fdf0ef] px-4 py-3 text-[13.5px] text-[#9b2c2c]">{error === "busy" ? "Too many submissions. Try again in an hour." : error}</p>}
        {p.outcome === "pass" && <p className="mt-3 rounded-xl bg-[#eef8f3] px-4 py-3 text-[13.5px] text-[#1b6b4a]">Signed off. {p.feedback}</p>}
        {p.outcome === "fail" && <p className="mt-3 rounded-xl bg-[#fff6e8] px-4 py-3 text-[13.5px] text-[#8a5a12]">Not signed off yet. Feedback: {p.feedback} You can resubmit before the new due date.</p>}
        {p.interviewAt && p.outcome === "pending" && (
          <p className="mt-3 rounded-xl bg-[#eef3fb] px-4 py-3 text-[13.5px] text-[#24456e]">
            Interview booked for {when(p.interviewAt)}. Join at <a className="underline" href={p.interviewLink ?? "#"}>{p.interviewLink}</a>.
          </p>
        )}
        {p.testsPassed && !p.interviewAt && p.outcome === "pending" && <p className="mt-3 rounded-xl bg-[#eef3fb] px-4 py-3 text-[13.5px] text-[#24456e]">Every test passed. An assessor will book your interview and email you.</p>}
      </section>

      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <h2 className="text-[16px] font-semibold text-ink">Requirements</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13.5px] text-[#3d434a]">
          {PROJECT_TESTS.map((t) => (
            <li key={t}>{t}.</li>
          ))}
        </ol>
        <h2 className="mt-5 text-[16px] font-semibold text-ink">Tags</h2>
        <table className="mt-2 w-full text-left text-[12.5px]">
          <tbody>
            {TAGS.map(([t, d]) => (
              <tr key={t} className="border-t border-[#f1f2f4]">
                <td className="py-1.5 pr-3 font-mono text-ink">{t}</td>
                <td className="py-1.5 text-[#4b5058]">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[12.5px] text-muted-ink">Try it on the underground pump station in the Mining track or the sandbox first.</p>
      </section>

      {results.length > 0 && (
        <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
          <h2 className="text-[16px] font-semibold text-ink">Last submission</h2>
          <ul className="mt-2 space-y-1 text-[13.5px]">
            {results.map((r) => (
              <li key={r.name} className={r.passed ? "text-run" : "text-[#9b2c2c]"}>
                {r.passed ? "✓" : "✗"} {r.name}
                {!r.passed && r.detail ? <span className="text-muted-ink"> · {r.detail}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!locked && (
        <form action={sendProject} className="flex flex-col gap-3 rounded-2xl border border-[#e4e6e9] bg-white p-6">
          <h2 className="text-[16px] font-semibold text-ink">Submit</h2>
          <select name="language" defaultValue={p.language ?? "st"} className="w-fit rounded-lg border border-[#dfe2e6] px-3 py-2 text-[13px]">
            <option value="st">Structured text</option>
            <option value="ladder">Ladder</option>
          </select>
          <textarea name="source" required defaultValue={p.source ?? ""} rows={18} spellCheck={false} className="rounded-lg border border-[#dfe2e6] p-3 font-mono text-[12.5px]" placeholder="Your program" />
          <textarea name="notes" required defaultValue={p.notes ?? ""} rows={6} className="rounded-lg border border-[#dfe2e6] p-3 text-[13.5px]" placeholder="Design note: what you built, how it handles faults, and how you tested it (at least 200 characters)." />
          <button type="submit" className={`${accentButtonClass} w-fit`}>Submit and mark</button>
        </form>
      )}
    </div>
  );
}

export default function ProjectPage({ searchParams }: PageProps<"/exams/project">) {
  return (
    <SiteShell>
      <Suspense fallback={<Skeleton lines={6} />}>
        <FromParams searchParams={searchParams} />
      </Suspense>
    </SiteShell>
  );
}

async function FromParams({ searchParams }: { searchParams: PageProps<"/exams/project">["searchParams"] }) {
  const sp = await searchParams;
  return <Project error={typeof sp.error === "string" ? sp.error : undefined} sent={sp.sent === "1"} />;
}
