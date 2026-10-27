"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass, ghostButtonClass } from "./SiteShell";

type Status = "pending" | "paid" | "failed" | "cancelled" | "expired";

/** Polls the payment until the provider's webhook settles it. The redirect alone never unlocks anything. */
export function PaymentWatcher({ id, initial }: { id: string; initial: Status }) {
  const [status, setStatus] = useState<Status>(initial);
  const [waited, setWaited] = useState(0);
  useEffect(() => {
    if (status !== "pending") return;
    const t = setInterval(async () => {
      setWaited((w) => w + 2);
      const r = await fetch(`/api/payments/${id}`, { cache: "no-store" }).catch(() => null);
      if (r?.ok) setStatus(((await r.json()) as { status: Status }).status);
    }, 2000);
    return () => clearInterval(t);
  }, [id, status]);

  if (status === "paid")
    return (
      <div>
        <p className="text-[15px] leading-[1.6] text-[#3d434a]">Payment confirmed. Every track is open, and a receipt is on its way to your inbox.</p>
        <Link href="/" className={`${buttonClass} mt-5`}>Open the labs</Link>
      </div>
    );
  if (status === "pending")
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-accent" />
          <p className="text-[15px] text-[#3d434a]">Waiting for your bank to confirm the payment.</p>
        </div>
        <p className="mt-3 text-[13px] leading-[1.6] text-muted-ink">
          {waited < 60 ? "This usually takes under a minute. You can keep this page open." : "This is taking longer than usual. You can close this page; we will email you as soon as it is confirmed."}
        </p>
      </div>
    );
  return (
    <div>
      <p className="text-[15px] leading-[1.6] text-[#3d434a]">
        {status === "cancelled" ? "The payment was cancelled." : status === "expired" ? "The payment request expired." : "The payment did not go through."} Nothing was charged.
      </p>
      <Link href="/pricing" className={`${ghostButtonClass} mt-5`}>Try again</Link>
    </div>
  );
}
