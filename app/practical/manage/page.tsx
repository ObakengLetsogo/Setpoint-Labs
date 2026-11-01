import { Suspense } from "react";
import { addPracticalDay, dropPracticalDay, markPractical } from "@/app/actions/practical";
import { STAGES } from "@/data/curriculum";
import { requireRole } from "@/lib/server/auth";
import { fmtDay, practicalRoster, stageName } from "@/lib/server/practical";
import { SiteShell, Skeleton, accentButtonClass, ghostButtonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Practical days, manage · Setpoint Labs" };

const input = "rounded-lg border border-[#dfe2e6] px-3 py-2 text-[13px]";
const DONE: Record<string, string> = { created: "Day scheduled.", dropped: "Day cancelled; booked learners were emailed and got their credit back.", marked: "Saved." };

async function Manage({ error, done }: { error?: string; done?: string }) {
  const me = await requireRole(["assessor"], "/practical/manage");
  const rows = await practicalRoster();
  const admin = me.role === "platform_admin";
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Facilitator</p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-ink">Practical days</h1>
        <p className="mt-2 text-[14px] leading-[1.6] text-[#4b5058]">Mark attendance and the practical sign-off on the day. Admins schedule and cancel days.</p>
        {done && <p className="mt-3 rounded-xl bg-[#eef8f3] px-4 py-3 text-[13.5px] text-[#1b6b4a]">{DONE[done] ?? "Done."}</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-[#fdf0ef] px-4 py-3 text-[13.5px] text-[#9b2c2c]">{error}</p>}
        {admin && (
          <form action={addPracticalDay} className="mt-4 grid gap-2 sm:grid-cols-2">
            <input name="title" required placeholder="Day 1: Motor starters and wiring" className={input} />
            <select name="stage" className={input} defaultValue="1">
              {STAGES.map((s) => <option key={s.n} value={s.n}>{stageName(s.n)}</option>)}
              <option value="">Open day (anyone)</option>
            </select>
            <input type="datetime-local" name="at" required className={input} />
            <input name="venue" required defaultValue="27 Boxes, Melville, Johannesburg" className={input} />
            <input type="number" name="capacity" required min={1} max={40} defaultValue={12} className={input} />
            <input name="notes" placeholder="What to bring, start time, parking" className={input} />
            <button type="submit" className={`${accentButtonClass} sm:col-span-2`}>Schedule the day</button>
          </form>
        )}
      </section>
      {rows.map(({ d, people }) => (
        <section key={d.id} className="rounded-2xl border border-[#e4e6e9] bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[16px] font-semibold text-ink">{d.title}{d.cancelledAt ? " (cancelled)" : ""}</h2>
            <span className="text-[12.5px] text-muted-ink">{fmtDay(d.startsAt)} · {d.venue} · {people.length}/{d.capacity} · {stageName(d.stage)}</span>
          </div>
          {!people.length && <p className="mt-2 text-[13px] text-muted-ink">No bookings yet.</p>}
          <div className="mt-2 flex flex-col divide-y divide-[#f1f2f4]">
            {people.map(({ b, name, email }) => (
              <form key={b.id} action={markPractical} className="flex flex-wrap items-center gap-2 py-2 text-[13px]">
                <input type="hidden" name="booking" value={b.id} />
                <span className="min-w-[180px] flex-1 text-ink">{name} <span className="text-muted-ink">{email}</span></span>
                <span className="font-mono text-[11px] uppercase text-muted-ink">{b.status}{b.signedOff ? " · signed off" : ""}</span>
                <select name="attended" defaultValue={b.status === "absent" ? "no" : "yes"} className={input}>
                  <option value="yes">Attended</option>
                  <option value="no">Absent</option>
                </select>
                <label className="flex items-center gap-1"><input type="checkbox" name="signedOff" defaultChecked={b.signedOff} /> Practical signed off</label>
                <input name="note" defaultValue={b.note ?? ""} placeholder="Note" className={input} />
                <button type="submit" className={ghostButtonClass}>Save</button>
              </form>
            ))}
          </div>
          {admin && !d.cancelledAt && (
            <form action={dropPracticalDay} className="mt-3">
              <input type="hidden" name="day" value={d.id} />
              <button type="submit" className="text-[12.5px] text-[#9b2c2c] hover:underline">Cancel this day</button>
            </form>
          )}
        </section>
      ))}
    </div>
  );
}

export default async function ManagePage({ searchParams }: PageProps<"/practical/manage">) {
  return (
    <SiteShell>
      <Suspense fallback={<Skeleton lines={5} />}>
        <FromParams searchParams={searchParams} />
      </Suspense>
    </SiteShell>
  );
}

async function FromParams({ searchParams }: { searchParams: PageProps<"/practical/manage">["searchParams"] }) {
  const sp = await searchParams;
  return <Manage error={typeof sp.error === "string" ? sp.error : undefined} done={typeof sp.done === "string" ? sp.done : undefined} />;
}
