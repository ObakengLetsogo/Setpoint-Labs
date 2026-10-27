import { LogoMark, Wordmark } from "@/components/Logo";

export function Header() {
  return (
    <header className="flex items-center gap-3 px-4 pt-5 sm:px-6">
      <LogoMark className="h-9 w-9 shrink-0" />
      <div className="flex flex-col leading-tight">
        <Wordmark className="text-2xl sm:text-3xl" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-ink">
          Learn PLC logic by running it.
        </span>
      </div>
    </header>
  );
}
