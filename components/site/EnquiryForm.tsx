"use client";

import { useActionState } from "react";
import { sendEnquiry } from "@/app/actions/billing";
import { buttonClass } from "./SiteShell";

const input = "rounded-xl border border-[#dfe2e6] bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink/40";

export function EnquiryForm() {
  const [state, run, pending] = useActionState(sendEnquiry, {});
  return (
    <form action={run} className="grid gap-3 sm:grid-cols-2">
      <input name="name" required placeholder="Your name" className={input} />
      <input name="email" type="email" required placeholder="Work email" className={input} />
      <input name="organisation" required placeholder="College, company or training centre" className={input} />
      <input name="seats" type="number" min={0} placeholder="Number of students or staff" className={input} />
      <textarea name="message" rows={3} placeholder="Anything we should know: courses, controller brands in your workshop, start date" className={`${input} sm:col-span-2`} />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Sending" : "Ask for a quote"}</button>
        {state.error && <span role="alert" className="text-[13px] text-[#9b2c2c]">{state.error}</span>}
        {state.ok && <span role="status" className="text-[13px] text-[#1b6b4a]">{state.ok}</span>}
      </div>
    </form>
  );
}
