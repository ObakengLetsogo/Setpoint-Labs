import Link from "next/link";
import { ENDORSEMENT_CENTS, EXAM_PRICES, FREE_RESIT_AFTER_DAYS, LEVEL_NAMES, LEVELS, PLANS, RESIT_CENTS, VOUCHER_MONTHS, rand, type PlanConfig } from "@/config/plans";
import { BuyButton } from "@/components/site/BuyButton";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { SiteShell } from "@/components/site/SiteShell";
import { IconCheck } from "@/components/ui/icons";

export const metadata = { title: "Pricing · Setpoint Labs" };

const FAQ: [string, string][] = [
  ["What is free?", "The first two Foundation chapters, seven lessons, with the full simulator, plus the sandbox on the motor starter. No card needed."],
  ["How do the levels work?", "Foundation, Professional and Expert. Each level ends in its own exam, and a learner passes one level before sitting the next. Training gives 12 months of access to that level."],
  ["What if I fail an exam?", `You get one free resit ${FREE_RESIT_AFTER_DAYS} days after the attempt. Later resits are ${rand(RESIT_CENTS)}.`],
  ["How do I pay?", "Through Stitch: instant EFT from your bank, card and the other methods Stitch supports. Companies and colleges can also pay by invoice and EFT."],
  ["When does access start?", "As soon as the payment is confirmed by the bank, usually within a minute. You will get a receipt by email."],
  ["Which PLCs does it cover?", "The skills are brand neutral, and every lesson shows its program the way Siemens, Allen Bradley, Schneider, Mitsubishi, Omron and Delta controllers write it. Brand names describe what we teach; we are not affiliated with these companies."],
  ["Is VAT included?", "These are the final prices. No VAT is charged until Setpoint Labs registers for VAT; after that the same prices include it, and receipts show the VAT part."],
];

const card = "flex flex-col rounded-2xl border border-[#e4e6e9] bg-white p-6";
const eyebrow = "font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]";

function Features({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 flex flex-1 flex-col gap-2 text-[13.5px] text-[#3d434a]">
      {items.map((f) => (
        <li key={f} className="flex gap-2"><IconCheck size={15} className="mt-0.5 shrink-0 text-run" />{f}</li>
      ))}
    </ul>
  );
}

function PlanCard({ p, highlight, unit }: { p: PlanConfig; highlight?: string; unit: string }) {
  return (
    <section className={`${card} ${highlight ? "border-accent/60 shadow-[0_0_0_4px_rgba(242,107,29,0.08)]" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[17px] font-semibold text-ink">{p.name}</h3>
        {highlight && <span className="rounded-full bg-[#fff1e8] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#d9591a]">{highlight}</span>}
      </div>
      <p className="mt-1 text-[13px] text-muted-ink">{p.blurb}</p>
      <p className="mt-5 font-display text-[34px] font-bold text-ink">
        {rand(p.priceCents)}
        <span className="ml-1 font-sans text-[13px] font-normal text-muted-ink">{unit}</span>
      </p>
      <Features items={p.features} />
      <BuyButton planId={p.id} perSeat={p.perSeat} minSeats={p.minSeats} priceCents={p.priceCents} organisation={p.audience !== "learner"} label={`Buy ${p.name.replace(/^Level \d: /, "")}`} />
    </section>
  );
}

export default function PricingPage() {
  const listed = PLANS.filter((p) => p.listed);
  const levels = listed.filter((p) => p.id.startsWith("level-"));
  const bundle = listed.find((p) => p.id === "bundle")!;
  const monthly = listed.find((p) => p.id === "learner-month")!;
  const corporate = listed.filter((p) => p.audience === "employer");
  const college = listed.filter((p) => p.audience === "institution");
  return (
    <SiteShell wide>
      <div className="mx-auto max-w-[760px] text-center">
        <p className={eyebrow}>Pricing</p>
        <h1 className="mt-2 font-display text-[40px] font-bold leading-[1.05] text-ink">Three levels, one standard</h1>
        <p className="mt-3 text-[15.5px] leading-[1.6] text-[#4b5058]">Start free. Buy a level when you are ready, sit its exam, then climb to the next. Prices in rand.</p>
      </div>

      <h2 className="mt-12 font-display text-[26px] font-bold text-ink">Individuals</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className={card}>
          <h3 className="text-[17px] font-semibold text-ink">Free taster</h3>
          <p className="mt-1 text-[13px] text-muted-ink">No account needed to start.</p>
          <p className="mt-5 font-display text-[34px] font-bold text-ink">R0</p>
          <Features items={["Foundation chapters 1 and 2", "The full 3D simulator", "Sandbox on the motor starter"]} />
          <Link href="/" className="mt-5 inline-flex justify-center rounded-xl border border-[#dfe2e6] px-4 py-2.5 text-[14px] font-semibold text-ink hover:border-ink/30">Start learning</Link>
        </section>
        {levels.map((p) => <PlanCard key={p.id} p={p} unit="12 months" />)}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <PlanCard p={bundle} unit="12 months" highlight="Best value" />
        <PlanCard p={monthly} unit="per month" />
      </div>

      <section className={`${card} mt-4`}>
        <h3 className="text-[17px] font-semibold text-ink">Exams and endorsements</h3>
        <p className="mt-1 text-[13px] text-muted-ink">The same price for individuals and companies. Exams open with each level.</p>
        <div className="mt-4 grid gap-3 text-[14px] sm:grid-cols-3 lg:grid-cols-5">
          {LEVELS.map((l) => (
            <div key={l} className="rounded-xl border border-[#eef0f2] p-3"><p className="text-muted-ink">{LEVEL_NAMES[l]} exam</p><p className="mt-1 font-semibold text-ink">{rand(EXAM_PRICES[l])}</p></div>
          ))}
          <div className="rounded-xl border border-[#eef0f2] p-3"><p className="text-muted-ink">Resit</p><p className="mt-1 font-semibold text-ink">{rand(RESIT_CENTS)}</p><p className="mt-1 text-[12px] text-muted-ink">First resit free after {FREE_RESIT_AFTER_DAYS} days</p></div>
          <div className="rounded-xl border border-[#eef0f2] p-3"><p className="text-muted-ink">Brand endorsement</p><p className="mt-1 font-semibold text-ink">{rand(ENDORSEMENT_CENTS)}</p></div>
        </div>
      </section>

      <h2 id="companies" className="mt-12 font-display text-[26px] font-bold text-ink">Companies</h2>
      <p className="mt-2 max-w-[760px] text-[14.5px] leading-[1.6] text-[#4b5058]">Per learner, from five learners. 10% off from 20 learners and 15% off from 50. Training and exam vouchers stay valid for {VOUCHER_MONTHS} months.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {corporate.map((p) => <PlanCard key={p.id} p={p} unit="per learner" highlight={p.id === "corp-all" ? "All levels" : undefined} />)}
      </div>

      <section id="institutions" className="mt-12 grid gap-6 rounded-2xl border border-[#e4e6e9] bg-white p-6 md:grid-cols-[1fr_1.3fr]">
        <div>
          <p className={eyebrow}>Colleges and SETA funded groups</p>
          <h2 className="mt-1 font-display text-[26px] font-bold text-ink">Colleges</h2>
          <ul className="mt-4 flex flex-col gap-3 text-[13.5px] text-[#3d434a]">
            {college.map((p) => (
              <li key={p.id}><span className="font-semibold text-ink">{p.name}: </span>about {rand(p.priceCents)} per learner, from {p.minSeats} learners. {p.blurb}</li>
            ))}
            <li>Lecturer accounts, classes, assignments and grading, results reports for your SETA, and supervised exam sittings on campus. Invoice and EFT.</li>
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
