"use client";

import { useActionState } from "react";
import { resendVerification, type FormState } from "@/app/actions/auth";

export function ResendButton() {
  const [state, run, pending] = useActionState<FormState>(resendVerification, {});
  return (
    <form action={run} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="rounded-lg bg-[#1b2430] px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50">
        {pending ? "Sending" : "Send a new link"}
      </button>
      {state.ok && <span className="text-[12.5px] text-[#1b6b4a]">{state.ok}</span>}
      {state.error && <span className="text-[12.5px] text-[#9b2c2c]">{state.error}</span>}
    </form>
  );
}
