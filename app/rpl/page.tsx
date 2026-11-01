import { Suspense } from "react";
import { sendRpl } from "@/app/actions/projects";
import { LEVEL_NAMES, LEVELS } from "@/config/plans";
import { requireUser } from "@/lib/server/auth";
import { RPL_MIN_EXPERIENCE, rplFor } from "@/lib/server/rpl";
import { SiteShell, Skeleton, accentButtonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Recognition of Prior Learning · Setpoint Labs" };

const input = "rounded-lg border border-[#dfe2e6] px-3 py-2 text-[13.5px]";
const STATUS = { submitted: "With an assessor", more_info: "More information needed", approved: "Approved", declined: "Not approved" } as const;

async function Rpl({ error, sent }: { error?: string; sent?: boolean }) {
  const user = await requireUser("/rpl");
  const apps = await rplFor(user.id);
  const open = apps.find((a) => a.status === "submitted" || a.status === "more_info");
  const draft = open?.status === "more_info" ? open : null;
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">RPL</p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-ink">Recognition of Prior Learning</h1>
        <div className="mt-2 max-w-[70ch] space-y-2 text-[14px] leading-[1.6] text-[#4b5058]">
          <p>Already working with PLCs? Apply to be assessed at a level without doing the full course. Our RPL process follows the QCTO and SAQA RPL policies.</p>
          <p>A registered assessor reviews your experience and evidence and may ask for more. If approved, you sit that level&apos;s exam, theory and practical, at the normal exam price, without passing the earlier levels first. Applying is free. The certificate is the same as for any other candidate.</p>
        </div>
        {sent && <p className="mt-3 rounded-xl bg-[#eef8f3] px-4 py-3 text-[13.5px] text-[#1b6b4a]">Application sent. An assessor will email you, usually within 10 working days.</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-[#fdf0ef] px-4 py-3 text-[13.5px] text-[#9b2c2c]">{error === "busy" ? "Too many tries; wait a while." : error}</p>}
      </section>

      {apps.length > 0 && (
        <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
          <h2 className="text-[16px] font-semibold text-ink">Your applications</h2>
          <ul className="mt-2 flex flex-col divide-y divide-[#f1f2f4] text-[13.5px]">
            {apps.map((a) => (
              <li key={a.id} className="py-2">
                <span className="font-semibold text-ink">{LEVEL_NAMES[a.level as "F"]}</span> · sent {a.submittedAt.toISOString().slice(0, 10)} · <span className={a.status === "approved" ? "text-run" : a.status === "declined" ? "text-[#9b2c2c]" : "text-[#9a6a10]"}>{STATUS[a.status]}{a.status === "approved" && a.approvedLevel !== a.level ? ` at ${LEVEL_NAMES[a.approvedLevel as "F"]}` : ""}</span>
                {a.feedback && <p className="mt-1 text-[13px] text-[#4b5058]">Assessor: {a.feedback}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {open?.status !== "submitted" && (
        <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
          <h2 className="text-[16px] font-semibold text-ink">{draft ? "Update your application" : "Apply"}</h2>
          <form action={sendRpl} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[13px] text-ink">Level to be assessed at
              <select name="level" defaultValue={draft?.level ?? "P"} className={input}>
                {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_NAMES[l]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-ink">Years working with PLCs
              <input type="number" name="years" min={1} max={50} required defaultValue={draft?.years ?? ""} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-ink">Job title
              <input name="jobTitle" required defaultValue={draft?.jobTitle ?? ""} placeholder="Instrumentation technician" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-ink">Employer (optional)
              <input name="employer" defaultValue={draft?.employer ?? ""} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-ink sm:col-span-2">Your experience, at least {RPL_MIN_EXPERIENCE} characters
              <textarea name="experience" required rows={7} defaultValue={draft?.experience ?? ""} placeholder="The plant and machines you have worked on, the PLC brands and software, what you programmed, commissioned or fault-found, and an example you are proud of." className={input} />
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-ink sm:col-span-2">Evidence
              <textarea name="evidence" required rows={4} defaultValue={draft?.evidence ?? ""} placeholder="Links to programs, drawings, photos or reports (shared folders are fine), and the name, role and phone number of a supervisor who can confirm your work." className={input} />
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-ink sm:col-span-2">Qualifications and trade tests (optional)
              <textarea name="qualifications" rows={2} defaultValue={draft?.qualifications ?? ""} placeholder="N6 Electrical, trade test, wireman's licence, vendor courses" className={input} />
            </label>
            <p className="text-[12.5px] text-muted-ink sm:col-span-2">Do not upload ID numbers or anything confidential to your employer. We use what you send only to assess this application.</p>
            <button type="submit" className={`${accentButtonClass} sm:col-span-2`}>{draft ? "Send it again" : "Send the application"}</button>
          </form>
        </section>
      )}
    </div>
  );
}

export default async function RplPage({ searchParams }: PageProps<"/rpl">) {
  return (
    <SiteShell>
      <Suspense fallback={<Skeleton lines={5} />}>
        <FromParams searchParams={searchParams} />
      </Suspense>
    </SiteShell>
  );
}

async function FromParams({ searchParams }: { searchParams: PageProps<"/rpl">["searchParams"] }) {
  const sp = await searchParams;
  return <Rpl error={typeof sp.error === "string" ? sp.error : undefined} sent={sp.sent === "1"} />;
}
