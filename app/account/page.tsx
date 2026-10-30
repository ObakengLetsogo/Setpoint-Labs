import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { certificates, payments, progress } from "@/db/schema";
import { planById, rand, LEVEL_NAMES } from "@/config/plans";
import { CURRICULUM } from "@/data/curriculum";
import { accessFor } from "@/lib/server/access";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { ResendButton } from "@/components/site/ResendButton";
import { SiteShell, Skeleton, accentButtonClass, ghostButtonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Your account · Setpoint Labs" };

const date = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
const STATUS_TONE: Record<string, string> = { paid: "text-[#1b6b4a]", pending: "text-[#9a6a10]", failed: "text-[#9b2c2c]", cancelled: "text-muted-ink", expired: "text-muted-ink" };

async function Account() {
  const user = await requireUser("/account");
  const [access, pays, certs, done] = await Promise.all([
    accessFor(user.id),
    db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.createdAt)).limit(20),
    db.select().from(certificates).where(eq(certificates.userId, user.id)),
    db.select({ lessonId: progress.lessonId }).from(progress).where(eq(progress.userId, user.id)),
  ]);
  const completed = done.length;
  const isStaff = ["teacher", "employer_admin", "institution_admin", "platform_admin"].includes(user.role);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Your account</p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-ink">{user.name}</h1>
        <p className="mt-1 text-[13.5px] text-[#4b5058]">{user.email}</p>
        {!user.verified && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[#f2dfb5] bg-[#fdf8ec] p-4">
            <p className="text-[13.5px] text-[#6b4f12]">Confirm your email to buy a plan and earn certificates. Check your inbox for our link.</p>
            <ResendButton />
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/" className={accentButtonClass}>Open the labs</Link>
          {isStaff && <Link href="/teach" className={ghostButtonClass}>Dashboard</Link>}
          {user.role === "platform_admin" && <Link href="/admin" className={ghostButtonClass}>Admin</Link>}
          <form action={signOut}>
            <button type="submit" className={ghostButtonClass}>Sign out</button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <h2 className="text-[17px] font-semibold text-ink">Plan</h2>
        {access.paid ? (
          <p className="mt-2 text-[14px] leading-[1.6] text-[#3d434a]">
            {access.planName}{access.via === "organisation" ? " through your organisation" : ""}. Open: <b>{access.levels.map((l) => LEVEL_NAMES[l]).join(", ")}</b>, until <b>{date(access.until)}</b>.
            {access.inGrace && " Your plan has ended; these are your grace days, so renew to keep going."}
          </p>
        ) : (
          <p className="mt-2 text-[14px] leading-[1.6] text-[#3d434a]">Free. Foundation chapters 1 and 2 are open.</p>
        )}
        <Link href="/pricing" className={`${ghostButtonClass} mt-4`}>{access.paid ? "Renew or change plan" : "See plans"}</Link>
      </section>

      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <h2 className="text-[17px] font-semibold text-ink">Certificates</h2>
        <p className="mt-1 text-[13px] text-muted-ink">{completed} lessons completed. Pass the practical assessment for a track to earn its certificate.</p>
        <ul className="mt-3 divide-y divide-[#f1f2f4]">
          {CURRICULUM.map((t) => {
            const c = certs.find((x) => x.trackId === t.id && !x.revokedAt);
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                <span className="text-ink">{t.name}</span>
                {c ? (
                  <Link href={`/verify/${c.code}`} className="font-mono text-[12px] text-[#1b6b4a] hover:underline">{c.code}</Link>
                ) : (
                  <Link href={`/assess/${t.id}`} className="text-[12.5px] text-[#d9591a] hover:underline">Take the assessment</Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
        <h2 className="text-[17px] font-semibold text-ink">Payments</h2>
        {pays.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-muted-ink">No payments yet.</p>
        ) : (
          <table className="mt-3 w-full text-left text-[13px]">
            <tbody>
              {pays.map((p) => (
                <tr key={p.id} className="border-t border-[#f1f2f4] first:border-t-0">
                  <td className="py-2 font-mono text-[12px] text-muted-ink">{date(p.createdAt)}</td>
                  <td className="py-2 text-ink">{planById(p.planId)?.name ?? p.planId}{p.seats > 1 ? ` × ${p.seats}` : ""}</td>
                  <td className="py-2 text-right font-mono">{rand(p.amountCents)}</td>
                  <td className={`py-2 text-right text-[12px] ${STATUS_TONE[p.status]}`}>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <SiteShell>
      <Suspense fallback={<Skeleton lines={4} />}>
        <Account />
      </Suspense>
    </SiteShell>
  );
}
