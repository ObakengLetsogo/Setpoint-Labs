"use client";

import { useActionState } from "react";
import { createInvoice, grantAccess } from "@/app/actions/admin";
import { buttonClass } from "./SiteShell";

const input = "rounded-lg border border-[#dfe2e6] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-ink/40";

function Status({ s }: { s: { error?: string; ok?: string } }) {
  if (s.error) return <span role="alert" className="text-[12.5px] text-[#9b2c2c]">{s.error}</span>;
  if (s.ok) return <span role="status" className="text-[12.5px] text-[#1b6b4a]">{s.ok}</span>;
  return null;
}

export function GrantForm({ plans }: { plans: { id: string; name: string }[] }) {
  const [s, run, pending] = useActionState(grantAccess, {});
  return (
    <form action={run} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_80px_1.2fr_auto]">
      <input name="email" type="email" required placeholder="learner@email" className={input} />
      <select name="plan" className={input}>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input name="months" type="number" min={1} max={60} defaultValue={1} className={input} aria-label="Months" />
      <input name="note" placeholder="Reason, e.g. bursary" className={input} />
      <button type="submit" disabled={pending} className={buttonClass}>Grant</button>
      <div className="sm:col-span-5"><Status s={s} /></div>
    </form>
  );
}

export function InvoiceForm({ plans }: { plans: { id: string; name: string }[] }) {
  const [s, run, pending] = useActionState(createInvoice, {});
  return (
    <form action={run} className="grid gap-2 sm:grid-cols-3">
      <input name="organisation" required placeholder="Organisation name" className={input} />
      <select name="kind" className={input}>
        <option value="institution">Institution</option>
        <option value="employer">Employer</option>
      </select>
      <input name="adminEmail" type="email" required placeholder="Their admin's account email" className={input} />
      <select name="plan" className={input}>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input name="seats" type="number" min={1} defaultValue={20} className={input} aria-label="Seats" />
      <button type="submit" disabled={pending} className={buttonClass}>Raise invoice</button>
      <div className="sm:col-span-3"><Status s={s} /></div>
    </form>
  );
}
