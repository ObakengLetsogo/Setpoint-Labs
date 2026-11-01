import { Suspense } from "react";
import { bookPractical, cancelPractical } from "@/app/actions/practical";
import { PRACTICAL_CENTS, rand } from "@/config/plans";
import { requireUser } from "@/lib/server/auth";
import { CANCEL_DAYS, fmtDay, practicalFor, stageName } from "@/lib/server/practical";
import { BuyButton } from "@/components/site/BuyButton";
import { SiteShell, Skeleton, accentButtonClass, ghostButtonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Practical days · Setpoint Labs" };

const STATUS: Record<string, string> = { booked: "Booked", attended: "Attended", absent: "Absent" };

async function Practical({ error, done }: { error?: string; done?: string }) {
  const user = await requireUser("/practical");
  const { credits, days } = await practicalFor(user.id);
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Practical days</p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-ink">Real panels, real wiring</h1>
        <p className="mt-2 max-w-[70ch] text-[14px] leading-[1.6] text-[#4b5058]">
          Hands-on days in groups of 8 to 12, run by our registered facilitator and assessor. Each day matches an online stage: finish that stage&apos;s lessons first, then book. A seat costs {rand(PRACTICAL_CENTS)} with lunch included. You can cancel free until {CANCEL_DAYS} days before.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#f3f4f6] px-3 py-1 font-mono text-[12px] text-ink">{credits} seat credit{credits === 1 ? "" : "s"}</span>
          <BuyButton planId="practical-day" perSeat={false} minSeats={1} priceCents={PRACTICAL_CENTS} organisation={false} label={`Buy a seat, ${rand(PRACTICAL_CENTS)}`} />
        </div>
        {done && <p className="mt-3 rounded-xl bg-[#eef8f3] px-4 py-3 text-[13.5px] text-[#1b6b4a]">{done === "booked" ? "Booked. A confirmation is on its way to your inbox." : "Cancelled. Your seat credit is back."}</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-[#fdf0ef] px-4 py-3 text-[13.5px] text-[#9b2c2c]">{error}</p>}
      </section>
      {!days.length && <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6 text-[13.5px] text-muted-ink">No days are scheduled yet. The yearly calendar runs in March, May, July, September and November.</section>}
      <div className="grid gap-3 md:grid-cols-2">
        {days.map((d) => (
          <section key={d.id} className="flex flex-col gap-2 rounded-2xl border border-[#e4e6e9] bg-white p-5">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-ink">{stageName(d.stage)}</p>
            <h2 className="text-[17px] font-semibold text-ink">{d.title}</h2>
            <p className="text-[13.5px] text-[#3d434a]">{fmtDay(d.startsAt)} · {d.venue}</p>
            {d.notes && <p className="text-[13px] text-[#4b5058]">{d.notes}</p>}
            <p className="text-[12.5px] text-muted-ink">{d.left} seat{d.left === 1 ? "" : "s"} left</p>
            {d.booking ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-run">{STATUS[d.booking.status] ?? d.booking.status}{d.booking.signedOff ? " · signed off" : ""}</span>
                {d.canCancel && (
                  <form action={cancelPractical}>
                    <input type="hidden" name="booking" value={d.booking.id} />
                    <button type="submit" className={ghostButtonClass}>Cancel</button>
                  </form>
                )}
              </div>
            ) : d.blocked ? (
              <p className="text-[12.5px] text-[#9a6a10]">{d.blocked}</p>
            ) : (
              <form action={bookPractical}>
                <input type="hidden" name="day" value={d.id} />
                <button type="submit" className={accentButtonClass}>Book this day</button>
              </form>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

export default async function PracticalPage({ searchParams }: PageProps<"/practical">) {
  return (
    <SiteShell>
      <Suspense fallback={<Skeleton lines={5} />}>
        <FromParams searchParams={searchParams} />
      </Suspense>
    </SiteShell>
  );
}

async function FromParams({ searchParams }: { searchParams: PageProps<"/practical">["searchParams"] }) {
  const sp = await searchParams;
  return <Practical error={typeof sp.error === "string" ? sp.error : undefined} done={typeof sp.done === "string" ? sp.done : undefined} />;
}
