import Link from "next/link";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { Suspense } from "react";
import { payInvoice, revokeAccess, revokeCert } from "@/app/actions/admin";
import { certificates, enquiries, entitlements, invoices, organisations, payments, subscriptions, users } from "@/db/schema";
import { PLANS, planById, rand } from "@/config/plans";
import { requireRole } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { GrantForm, InvoiceForm } from "@/components/site/AdminForms";
import { SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Admin · Setpoint Labs", robots: { index: false } };

const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");
const th = "px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-ink";
const td = "px-3 py-2 text-[12.5px] text-ink";

function Panel({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#e4e6e9] bg-white">
      <h2 className="flex items-baseline gap-2 border-b border-[#eef0f2] px-4 py-3 text-[15px] font-semibold text-ink">
        {title}
        {count !== undefined && <span className="font-mono text-[11px] text-muted-ink">{count}</span>}
      </h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

async function Admin() {
  await requireRole(["platform_admin"], "/admin");
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
  const [userCount, active, revenue, pays, ents, lapsed, invs, enq, certs] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)` }).from(users),
    db.select({ n: sql<number>`COUNT(*)` }).from(entitlements).where(and(eq(entitlements.status, "active"), gt(entitlements.endsAt, now))),
    db.select({ n: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)` }).from(payments).where(and(eq(payments.status, "paid"), gt(payments.paidAt, monthAgo))),
    db.select({ p: payments, email: users.email }).from(payments).leftJoin(users, eq(users.id, payments.userId)).orderBy(desc(payments.createdAt)).limit(40),
    db
      .select({ e: entitlements, email: users.email, org: organisations.name })
      .from(entitlements)
      .leftJoin(users, eq(users.id, entitlements.userId))
      .leftJoin(organisations, eq(organisations.id, entitlements.organisationId))
      .where(and(eq(entitlements.status, "active"), gt(entitlements.endsAt, now)))
      .orderBy(desc(entitlements.createdAt))
      .limit(60),
    db.select({ s: subscriptions, email: users.email, org: organisations.name }).from(subscriptions).leftJoin(users, eq(users.id, subscriptions.userId)).leftJoin(organisations, eq(organisations.id, subscriptions.organisationId)).where(eq(subscriptions.status, "past_due")).limit(40),
    db.select({ i: invoices, org: organisations.name }).from(invoices).leftJoin(organisations, eq(organisations.id, invoices.organisationId)).orderBy(desc(invoices.createdAt)).limit(30),
    db.select().from(enquiries).orderBy(desc(enquiries.createdAt)).limit(20),
    db.select({ c: certificates, email: users.email }).from(certificates).leftJoin(users, eq(users.id, certificates.userId)).orderBy(desc(certificates.issuedAt)).limit(20),
  ]);
  const plans = PLANS.filter((p) => p.listed).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Accounts", String(userCount[0].n)],
          ["Active plans", String(active[0].n)],
          ["Paid, last 30 days", rand(Number(revenue[0].n))],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-[#e4e6e9] bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-ink">{k}</p>
            <p className="mt-1 font-display text-[30px] font-bold text-ink">{v}</p>
          </div>
        ))}
      </div>

      <p className="text-[13px]"><Link href="/admin/videos" className="font-medium text-[#d9591a] hover:underline">Manage lesson videos</Link></p>

      <Panel title="Grant access">
        <div className="p-4"><GrantForm plans={plans} /></div>
      </Panel>

      <Panel title="Payments" count={pays.length}>
        <table className="w-full text-left">
          <thead><tr><th className={th}>Date</th><th className={th}>Who</th><th className={th}>Plan</th><th className={th}>Amount</th><th className={th}>Provider</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {pays.map(({ p, email }) => (
              <tr key={p.id} className="border-t border-[#f1f2f4]">
                <td className={`${td} font-mono`}>{d(p.createdAt)}</td>
                <td className={td}>{email}</td>
                <td className={td}>{planById(p.planId)?.name ?? p.planId}{p.seats > 1 ? ` × ${p.seats}` : ""}</td>
                <td className={`${td} font-mono`}>{rand(p.amountCents)}</td>
                <td className={td}>{p.provider}</td>
                <td className={td}>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Active access" count={ents.length}>
        <table className="w-full text-left">
          <thead><tr><th className={th}>Holder</th><th className={th}>Plan</th><th className={th}>Seats</th><th className={th}>Until</th><th className={th}>Source</th><th className={th} /></tr></thead>
          <tbody>
            {ents.map(({ e, email, org }) => (
              <tr key={e.id} className="border-t border-[#f1f2f4]">
                <td className={td}>{org ?? email}</td>
                <td className={td}>{planById(e.planId)?.name ?? e.planId}</td>
                <td className={td}>{e.seats}</td>
                <td className={`${td} font-mono`}>{d(e.endsAt)}</td>
                <td className={td}>{e.source}{e.note ? ` · ${e.note}` : ""}</td>
                <td className={td}>
                  <form action={revokeAccess}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className="text-[12px] text-[#9b2c2c] hover:underline">Revoke</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Lapsed plans" count={lapsed.length}>
        <table className="w-full text-left">
          <tbody>
            {lapsed.length === 0 && <tr><td className={`${td} text-muted-ink`}>None.</td></tr>}
            {lapsed.map(({ s, email, org }) => (
              <tr key={s.id} className="border-t border-[#f1f2f4]">
                <td className={td}>{org ?? email}</td>
                <td className={td}>{planById(s.planId)?.name ?? s.planId}</td>
                <td className={`${td} font-mono`}>ended {d(s.currentPeriodEnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Invoices">
        <div className="border-b border-[#eef0f2] p-4"><InvoiceForm plans={PLANS.filter((p) => p.listed && p.audience !== "learner").map((p) => ({ id: p.id, name: p.name }))} /></div>
        <table className="w-full text-left">
          <tbody>
            {invs.map(({ i, org }) => (
              <tr key={i.id} className="border-t border-[#f1f2f4]">
                <td className={`${td} font-mono`}>{i.number}</td>
                <td className={td}>{org}</td>
                <td className={td}>{planById(i.planId)?.name} × {i.seats}</td>
                <td className={`${td} font-mono`}>{rand(i.amountCents)}</td>
                <td className={td}>
                  {i.status === "open" ? (
                    <form action={payInvoice}>
                      <input type="hidden" name="id" value={i.id} />
                      <button type="submit" className="text-[12px] font-semibold text-[#1b6b4a] hover:underline">Mark paid</button>
                    </form>
                  ) : (
                    `${i.status} ${d(i.paidAt)}`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Enquiries" count={enq.length}>
        <table className="w-full text-left">
          <tbody>
            {enq.map((q) => (
              <tr key={q.id} className="border-t border-[#f1f2f4] align-top">
                <td className={`${td} font-mono`}>{d(q.createdAt)}</td>
                <td className={td}>{q.name}<br /><span className="text-muted-ink">{q.email}</span></td>
                <td className={td}>{q.organisation}{q.seats ? ` · ${q.seats} seats` : ""}</td>
                <td className={`${td} max-w-[360px] text-[#4b5058]`}>{q.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Recent certificates">
        <table className="w-full text-left">
          <tbody>
            {certs.map(({ c, email }) => (
              <tr key={c.id} className="border-t border-[#f1f2f4]">
                <td className={`${td} font-mono`}>{c.code}</td>
                <td className={td}>{c.nameOnCertificate} <span className="text-muted-ink">{email}</span></td>
                <td className={td}>{c.trackId}</td>
                <td className={td}>
                  {c.revokedAt ? (
                    "revoked"
                  ) : (
                    <form action={revokeCert}>
                      <input type="hidden" name="code" value={c.code} />
                      <button type="submit" className="text-[12px] text-[#9b2c2c] hover:underline">Revoke</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

export default function AdminPage() {
  return (
    <SiteShell wide>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Admin />
      </Suspense>
    </SiteShell>
  );
}
