import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";

/** The frame for account, pricing and admin pages: logo, a few links, a centred column. */
export function SiteShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-[#f4f5f6] bg-[linear-gradient(#eceef0_1px,transparent_1px),linear-gradient(90deg,#eceef0_1px,transparent_1px)] bg-[size:28px_28px]">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e4e6e9] bg-white">
            <LogoMark className="h-7 w-7" />
          </span>
          <span className="font-display text-[20px] font-bold text-ink">Setpoint Labs</span>
        </Link>
        <nav className="flex items-center rounded-full border border-[#e4e6e9] bg-white p-1 text-[13px] font-medium">
          <Link href="/" className="rounded-full px-3 py-1.5 text-[#3d434a] hover:text-ink">Labs</Link>
          <Link href="/pricing" className="rounded-full px-3 py-1.5 text-[#3d434a] hover:text-ink">Pricing</Link>
          <Link href="/account" className="rounded-full bg-ink px-3 py-1.5 text-white">Account</Link>
        </nav>
      </header>
      <main className={`mx-auto px-4 pb-24 sm:px-6 ${wide ? "max-w-[1240px]" : "max-w-[560px]"}`}>{children}</main>
      <p className="pb-8 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-ink">Setpoint Labs is for education only. Not for use on live plant.</p>
    </div>
  );
}

export function Card({ title, kicker, children }: { title?: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e4e6e9] bg-white p-5 sm:p-6">
      {kicker && <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]">{kicker}</p>}
      {title && <h1 className="mt-1 font-display text-[26px] font-bold text-ink">{title}</h1>}
      <div className={title || kicker ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-[#e4e6e9] bg-white p-6">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="mb-3 h-4 animate-pulse rounded bg-[#eef0f2]" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

export const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#2c3644] disabled:opacity-50";
export const accentButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-50";
export const ghostButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe2e6] bg-white px-4 py-2.5 text-[14px] font-semibold text-ink transition hover:border-ink/30 disabled:opacity-50";
