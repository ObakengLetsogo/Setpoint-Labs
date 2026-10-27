export function LogoMark({ className = "h-8 w-8", animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <line x1="6" y1="40" x2="94" y2="40" stroke="var(--color-accent)" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M6 84 L22 84 C30 84 32 22 44 22 C54 22 56 48 64 46 C70 44 72 40 80 40"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          animate
            ? {
                strokeDasharray: 160,
                strokeDashoffset: 160,
                animation: "draw-curve 1.1s ease-out 0.15s forwards",
              }
            : undefined
        }
      />
      <circle cx="84" cy="40" r="7" fill="var(--color-accent)" style={animate ? { animation: "pop-dot 0.3s ease-out 1.15s forwards", transformOrigin: "84px 40px" } : undefined} />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold uppercase tracking-tight ${className}`}>
      <span className="text-ink">SETPOINT</span> <span className="text-accent">LABS</span>
    </span>
  );
}
