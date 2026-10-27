import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { simulatePayment } from "@/app/actions/billing";
import { payments } from "@/db/schema";
import { rand } from "@/config/plans";
import { db } from "@/lib/server/db";
import { Card, SiteShell, Skeleton, accentButtonClass, ghostButtonClass } from "@/components/site/SiteShell";

const enabled = () => process.env.NODE_ENV !== "production" || process.env.PAYMENT_PROVIDER === "dev";

async function Body({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ return?: string }> }) {
  if (!enabled()) notFound();
  const { id } = await params;
  const { return: back = `/checkout/${id}` } = await searchParams;
  const p = (await db.select().from(payments).where(eq(payments.id, id)).limit(1))[0];
  if (!p) notFound();
  const button = (status: string, label: string, cls: string) => (
    <form action={simulatePayment}>
      <input type="hidden" name="paymentId" value={id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="return" value={back} />
      <button type="submit" className={cls}>{label}</button>
    </form>
  );
  return (
    <>
      <p className="text-[14px] leading-[1.6] text-[#4b5058]">
        Development payment page standing in for Stitch. Each button sends a signed webhook through the real handler, then returns you to the confirming page.
      </p>
      <p className="mt-3 font-mono text-[13px] text-ink">Amount {rand(p.amountCents)} · status {p.status}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {button("paid", "Simulate success", accentButtonClass)}
        {button("failed", "Simulate failure", ghostButtonClass)}
        {button("cancelled", "Simulate cancel", ghostButtonClass)}
      </div>
    </>
  );
}

export default function DevPayPage({ params, searchParams }: PageProps<"/dev/pay/[id]">) {
  return (
    <SiteShell>
      <Card kicker="Test mode" title="Payment simulator">
        <Suspense fallback={<Skeleton />}>
          <Body params={params} searchParams={searchParams as Promise<{ return?: string }>} />
        </Suspense>
      </Card>
    </SiteShell>
  );
}
