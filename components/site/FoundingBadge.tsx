/** The founding member badge: a numbered seal for the first 100 learners. */
export function FoundingBadge({ n, size = "md" }: { n: number; size?: "sm" | "md" }) {
  const d = size === "sm" ? 34 : 54;
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-[#f3d2bd] bg-[#fff6f0] py-1 pl-1 pr-4" title={`One of the first 100 Setpoint Labs learners`}>
      <svg width={d} height={d} viewBox="0 0 54 54" aria-hidden>
        <circle cx="27" cy="27" r="26" fill="#f26b1d" />
        <circle cx="27" cy="27" r="21.5" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="2 2.6" />
        <path d="M14 30.5h7l3-9 6 15 3.5-8.5H40" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="flex flex-col leading-tight">
        <span className={`font-mono uppercase tracking-[0.16em] text-[#d9591a] ${size === "sm" ? "text-[9.5px]" : "text-[10.5px]"}`}>Founding member</span>
        <span className={`font-display font-bold text-ink ${size === "sm" ? "text-[15px]" : "text-[20px]"}`}>#{n} of 100</span>
      </span>
    </span>
  );
}
