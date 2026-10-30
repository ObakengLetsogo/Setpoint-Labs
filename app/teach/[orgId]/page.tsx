import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { organisations } from "@/db/schema";
import { CURRICULUM } from "@/data/curriculum";
import { catalog } from "@/data/catalog";
import { PLATFORMS } from "@/engine/platforms";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { canManage, cohortsOf, isOrgAdmin, learners, seatUsage, voucherUsage } from "@/lib/server/orgs";
import { manageSeat } from "@/app/actions/teach";
import { LEVELS, LEVEL_NAMES, VOUCHER_MONTHS } from "@/config/plans";
import { CohortForm, ImportForm, OrgSettingsForm } from "@/components/site/TeachForms";
import { SiteShell, Skeleton, ghostButtonClass } from "@/components/site/SiteShell";

export const metadata = { title: "Dashboard · Setpoint Labs", robots: { index: false } };

const th = "px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-ink";
const td = "px-3 py-2 text-[12.5px] text-ink";
const platforms = PLATFORMS.map((p) => ({ id: p.id, name: p.name }));

async function Dashboard({ params, searchParams }: { params: Promise<{ orgId: string }>; searchParams: Promise<{ class?: string; q?: string }> }) {
  const { orgId } = await params;
  const { class: classId, q } = await searchParams;
  const user = await requireUser(`/teach/${orgId}`);
  if (!(await canManage(user, orgId))) notFound();
  const org = (await db.select().from(organisations).where(eq(organisations.id, orgId)).limit(1))[0];
  if (!org) notFound();
  const [rows, usage, classes, admin, vouchers] = await Promise.all([learners(orgId), seatUsage(orgId), cohortsOf(orgId), isOrgAdmin(user, orgId), voucherUsage(orgId)]);
  const vouchersLeft = (l: (typeof LEVELS)[number]) => vouchers[l].total - vouchers[l].used;
  const total = catalog.filter((l) => !l.locked).length;
  const cls = classes.find((c) => c.id === classId);
  const shown = rows.filter((r) => (!cls || r.cohorts.includes(cls.name)) && (!q || `${r.name} ${r.email}`.toLowerCase().includes(q.toLowerCase())));
  const avg = shown.length ? Math.round(shown.reduce((n, r) => n + r.completed, 0) / shown.length) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[#e4e6e9] bg-white p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">{org.kind === "institution" ? "Teacher dashboard" : "Manager dashboard"}</p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-ink">{org.name}</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {[
            ["Learners", String(rows.length)],
            ["Seats used", `${usage.used} of ${usage.total}`],
            ["Exam vouchers left", LEVELS.map((l) => `${l} ${vouchersLeft(l)}`).join(" · ")],
            ["Average lessons done", `${avg} of ${total}`],
            ["Certificates", String(rows.reduce((n, r) => n + r.certificates.length, 0))],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-[#f6f7f8] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-ink">{k}</p>
              <p className="mt-1 font-display text-[22px] font-bold text-ink">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-[#e4e6e9] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eef0f2] px-4 py-3">
          <form className="flex flex-wrap items-center gap-2">
            <input name="q" defaultValue={q} placeholder="Search name or email" className="rounded-lg border border-[#dfe2e6] px-3 py-1.5 text-[13px] outline-none focus:border-ink/40" />
            <select name="class" defaultValue={classId ?? ""} className="rounded-lg border border-[#dfe2e6] px-3 py-1.5 text-[13px]">
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-[#f3f4f5] px-3 py-1.5 text-[13px] font-medium text-ink">Filter</button>
          </form>
          <a href={`/api/teach/${orgId}/learners`} className={ghostButtonClass}>Export CSV</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr><th className={th}>Learner</th><th className={th}>Class</th><th className={th}>Lessons</th><th className={th}>Quiz avg</th><th className={th}>Certificates</th><th className={th}>Last active</th><th className={th}>Seat</th><th className={th}>Exam vouchers</th></tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td colSpan={8} className={`${td} py-6 text-center text-muted-ink`}>No learners yet. Add them below.</td></tr>
              )}
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-[#f1f2f4]">
                  <td className={td}>{r.name}<span className="block text-[11.5px] text-muted-ink">{r.email}</span></td>
                  <td className={td}>{r.cohorts.join(", ")}</td>
                  <td className={td}>
                    <span className="font-mono">{r.completed}</span>
                    <span className="mt-1 block h-1.5 w-24 rounded-full bg-[#eef0f2]"><span className="block h-1.5 rounded-full bg-run" style={{ width: `${Math.min(100, (r.completed / total) * 100)}%` }} /></span>
                  </td>
                  <td className={`${td} font-mono`}>{r.quizAvg === null ? "" : `${r.quizAvg} %`}</td>
                  <td className={td}>{r.certificates.map((t) => CURRICULUM.find((c) => c.id === t)?.code ?? t).join(" ")}</td>
                  <td className={`${td} font-mono`}>{r.lastActive ? r.lastActive.toISOString().slice(0, 10) : ""}</td>
                  <td className={td}>
                    {r.seated ? "yes" : <span className="text-[#9a6a10]">no seat</span>}
                    {admin && (
                      <form action={manageSeat} className="mt-1">
                        <input type="hidden" name="orgId" value={orgId} />
                        <input type="hidden" name="userId" value={r.id} />
                        <button type="submit" name="action" value={r.seated ? "release" : "seat"} className="font-mono text-[10.5px] text-[#d9591a] hover:underline">{r.seated ? "free seat" : "give seat"}</button>
                      </form>
                    )}
                  </td>
                  <td className={td}>
                    <span className="font-mono">{r.examVouchers.join(" ")}</span>
                    {admin && (
                      <form action={manageSeat} className="mt-1 flex gap-1">
                        <input type="hidden" name="orgId" value={orgId} />
                        <input type="hidden" name="userId" value={r.id} />
                        <input type="hidden" name="action" value="voucher" />
                        {LEVELS.filter((l) => vouchersLeft(l) > 0 && !r.examVouchers.includes(l)).map((l) => (
                          <button key={l} type="submit" name="level" value={l} title={`Give a ${LEVEL_NAMES[l]} exam voucher`} className="rounded border border-[#dfe2e6] px-1.5 font-mono text-[10.5px] text-ink hover:border-ink/40">+{l}</button>
                        ))}
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e4e6e9] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-ink">Add learners</h2>
          <div className="mt-3"><ImportForm orgId={orgId} classes={classes} /></div>
        </section>
        <section className="rounded-2xl border border-[#e4e6e9] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-ink">Classes</h2>
          <ul className="mt-2 divide-y divide-[#f1f2f4]">
            {classes.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-[13.5px]">
                <Link href={`/teach/${orgId}/classes/${c.id}`} className="font-medium text-ink hover:underline">{c.name}</Link>
                <span className="font-mono text-[11px] text-muted-ink">{c.size} learners{c.platformLock ? ` · ${PLATFORMS.find((p) => p.id === c.platformLock)?.name}` : ""}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3"><CohortForm orgId={orgId} platforms={platforms} /></div>
        </section>
      </div>

      {admin && (
        <section className="rounded-2xl border border-[#e4e6e9] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-ink">Organisation settings</h2>
          <p className="mt-1 text-[12.5px] text-muted-ink">Lock every learner to the controller family your workshop uses, and set the name printed on their certificates.</p>
          <div className="mt-3"><OrgSettingsForm orgId={orgId} platform={org.platformLock} certificateName={org.certificateName} platforms={platforms} /></div>
          <p className="mt-3 text-[12.5px] text-[#4b5058]">Need more seats or exam vouchers? <Link href="/pricing#companies" className="text-[#d9591a] hover:underline">Buy them</Link> or ask us for an invoice. Seats and vouchers stay valid for {VOUCHER_MONTHS} months. A freed training seat can go to someone else; an exam voucher stays with the learner it was given to.</p>
        </section>
      )}
    </div>
  );
}

export default function OrgPage({ params, searchParams }: PageProps<"/teach/[orgId]">) {
  return (
    <SiteShell wide>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Dashboard params={params} searchParams={searchParams as Promise<{ class?: string; q?: string }>} />
      </Suspense>
    </SiteShell>
  );
}
