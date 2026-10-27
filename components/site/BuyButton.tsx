"use client";

import { useActionState, useState } from "react";
import { checkout } from "@/app/actions/billing";
import { rand } from "@/config/plans";
import { accentButtonClass } from "./SiteShell";

export function BuyButton({ planId, perSeat, minSeats, priceCents, organisation }: { planId: string; perSeat: boolean; minSeats: number; priceCents: number; organisation: boolean }) {
  const [state, run, pending] = useActionState(checkout, {});
  const [seats, setSeats] = useState(minSeats);
  return (
    <form action={run} className="mt-5 flex flex-col gap-3">
      <input type="hidden" name="plan" value={planId} />
      {organisation && (
        <input name="organisation" required placeholder="Company name" className="rounded-xl border border-[#dfe2e6] px-3 py-2 text-[14px] outline-none focus:border-ink/40" />
      )}
      {perSeat && (
        <label className="flex items-center justify-between gap-3 text-[13px] text-[#4b5058]">
          Seats
          <input
            name="seats"
            type="number"
            min={minSeats}
            value={seats}
            onChange={(e) => setSeats(Math.max(minSeats, Number(e.target.value) || minSeats))}
            className="w-24 rounded-lg border border-[#dfe2e6] px-2.5 py-1.5 text-right font-mono text-[13px] outline-none focus:border-ink/40"
          />
        </label>
      )}
      <button type="submit" disabled={pending} className={accentButtonClass}>
        {pending ? "Opening checkout" : perSeat ? `Pay ${rand(priceCents * seats)}` : "Choose this plan"}
      </button>
      {state.error && <p role="alert" className="text-[12.5px] text-[#9b2c2c]">{state.error}</p>}
    </form>
  );
}
