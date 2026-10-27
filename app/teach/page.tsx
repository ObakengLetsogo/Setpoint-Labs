import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/server/auth";
import { managedOrgs } from "@/lib/server/orgs";
import { Card, SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Dashboard · Setpoint Labs", robots: { index: false } };

async function Orgs() {
  const user = await requireUser("/teach");
  const orgs = await managedOrgs(user);
  if (orgs.length === 1) redirect(`/teach/${orgs[0].id}`);
  return orgs.length === 0 ? (
    <p className="text-[14px] leading-[1.6] text-[#4b5058]">You do not manage any organisations yet. Employer seats can be bought on the pricing page; colleges can ask us for an invoice.</p>
  ) : (
    <ul className="divide-y divide-[#f1f2f4]">
      {orgs.map((o) => (
        <li key={o.id} className="py-2.5">
          <Link href={`/teach/${o.id}`} className="text-[14.5px] font-medium text-ink hover:underline">{o.name}</Link>
          <span className="ml-2 font-mono text-[11px] text-muted-ink">{o.kind}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TeachPage() {
  return (
    <SiteShell>
      <Card kicker="Dashboard" title="Your organisations">
        <Suspense fallback={<Skeleton />}>
          <Orgs />
        </Suspense>
      </Card>
    </SiteShell>
  );
}
