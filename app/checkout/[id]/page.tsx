import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { payments } from "@/db/schema";
import { planById, rand } from "@/config/plans";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { Card, SiteShell, Skeleton } from "@/components/site/SiteShell";
import { PaymentWatcher } from "@/components/site/PaymentWatcher";

export const metadata = { title: "Confirming your payment · Setpoint Labs" };

async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/checkout/${id}`);
  const p = (await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.userId, user.id))).limit(1))[0];
  if (!p) notFound();
  return (
    <>
      <p className="mb-5 font-mono text-[12px] text-muted-ink">
        {planById(p.planId)?.name ?? p.planId} · {rand(p.amountCents)} · ref SPL-{p.id.slice(0, 12).toUpperCase()}
      </p>
      <PaymentWatcher id={p.id} initial={p.status} />
    </>
  );
}

export default function CheckoutPage({ params }: PageProps<"/checkout/[id]">) {
  return (
    <SiteShell>
      <Card kicker="Checkout" title="Confirming your payment">
        <Suspense fallback={<Skeleton lines={2} />}>
          <Body params={params} />
        </Suspense>
      </Card>
    </SiteShell>
  );
}
