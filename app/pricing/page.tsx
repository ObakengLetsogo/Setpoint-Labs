import Link from "next/link";
import { PLANS, rand } from "@/config/plans";
import { BuyButton } from "@/components/site/BuyButton";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { SiteShell } from "@/components/site/SiteShell";
import { IconCheck } from "@/components/ui/icons";

export const metadata = { title: "Pricing · Setpoint Labs" };

const FAQ: [string, string][] = [
  ["What is free?", "The first two Foundations chapters, seven lessons, with the full simulator, plus the sandbox on the motor starter. No card needed."],
  ["How do I pay?", "Through Stitch: instant EFT from your bank, card and the other methods Stitch supports. Institutions can also pay by invoice and EFT."],
  ["When does access start?", "As soon as the payment is confirmed by the bank, usually within a minute. You will get a receipt by email."],
  ["What happens when my plan ends?", "We remind you before it ends and keep lessons open for three more days. After that paid lessons lock, but your progress, programs and certificates stay."],
  ["Which PLCs does it cover?", "The skills are brand neutral, and every lesson shows its program the way Siemens, Allen Bradley, Schneider, Mitsubishi, Omron and Delta controllers write it."],
  ["Are prices VAT inclusive?", "Yes. Receipts show the VAT part."],
];

export default function PricingPage() {
  const online = PLANS.filter((p) => p.online);
  const institution = PLANS.filter((p) => !p.online);
  return (
    <SiteShell wide>
      <div className="mx-auto max-w-[760px] text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Pricing</p>
        <h1 className="mt-2 font-display text-[40px] font-bold leading-[1.05] text-ink">Learn PLCs by running them</h1>
        <p className="mt-3 text-[15.5px] leading-[1.6] text-[#4b5058]">Start free. Pay when you want every track, machine and certificate. Prices in rand, VAT inclusive.</p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="flex flex-col rounded-2xl border border-[#e4e6e9] bg-white p-6">
          <h2 className="text-[17px] font-semibold text-ink">Free</h2>
          <p className="mt-1 text-[13px] text-muted-ink">No account needed to start.</p>
          <p className="mt-5 font-display text-[36px] font-bold text-ink">R0</p>
          <ul className="mt-5 flex flex-1 flex-col gap-2 text-[13.5px] text-[#3d434a]">
            {["Foundations chapters 1 and 2", "The full 3D simulator", "Sandbox on the motor starter"].map((f) => (
              <li key={f} className="flex gap-2"><IconCheck size={15} className="mt-0.5 shrink-0 text-run" />{f}</li>
            ))}
          </ul>
          <Link href="/" className="mt-5 inline-flex justify-center rounded-xl border border-[#dfe2e6] px-4 py-2.5 text-[14px] font-semibold text-ink hover:border-ink/30">Start learning</Link>
        </section>
        {online.map((p, i) => (
          <section key={p.id} className={`flex flex-col rounded-2xl border bg-white p-6 ${i === 1 ? "border-accent/60 shadow-[0_0_0_4px_rgba(242,107,29,0.08)]" : "border-[#e4e6e9]"}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-ink">{p.name}</h2>
              {i === 1 && <span className="rounded-full bg-[#fff1e8] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#d9591a]">Best value</span>}
            </div>
            <p className="mt-1 text-[13px] text-muted-ink">{p.blurb}</p>
            <p className="mt-5 font-display text-[36px] font-bold text-ink">
              {rand(p.priceCents)}
              <span className="ml-1 font-sans text-[13px] font-normal text-muted-ink">{p.perSeat ? "per seat per year" : p.periodMonths === 1 ? "per month" : "per year"}</span>
            </p>
            <ul className="mt-5 flex flex-1 flex-col gap-2 text-[13.5px] text-[#3d434a]">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><IconCheck size={15} className="mt-0.5 shrink-0 text-run" />{f}</li>
              ))}
            </ul>
            <BuyButton planId={p.id} perSeat={p.perSeat} minSeats={p.minSeats} priceCents={p.priceCents} organisation={p.audience !== "learner"} />
          </section>
        ))}
      </div>

      <section id="institutions" className="mt-10 grid gap-6 rounded-2xl border border-[#e4e6e9] bg-white p-6 md:grid-cols-[1fr_1.3fr]">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">Colleges and training centres</p>
          <h2 className="mt-1 font-display text-[26px] font-bold text-ink">Institutions</h2>
          <ul className="mt-4 flex flex-col gap-3 text-[13.5px] text-[#3d434a]">
            {institution.map((p) => (
              <li key={p.id}>
                <span className="font-semibold text-ink">{p.name}: </span>
                {rand(p.priceCents)} {p.perSeat ? `per student per year, from ${p.minSeats} seats` : "per year"}. {p.blurb}
              </li>
            ))}
            <li>Cohorts, a teacher dashboard, assignments, white label certificates and CSV import. Pay online or by invoice.</li>
          </ul>
        </div>
        <EnquiryForm />
      </section>

      <section className="mx-auto mt-10 max-w-[760px]">
        <h2 className="font-display text-[26px] font-bold text-ink">Questions</h2>
        <div className="mt-4 divide-y divide-[#eef0f2] rounded-2xl border border-[#e4e6e9] bg-white">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none text-[14.5px] font-semibold text-ink">{q}</summary>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-[#4b5058]">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
