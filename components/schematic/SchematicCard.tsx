export function SchematicCard() {
  return (
    <div className="mx-4 mt-4 rounded-2xl border border-border bg-surface p-4 shadow-card sm:mx-6">
      <p className="mb-3 text-sm font-semibold text-ink">Schematic</p>
      <svg viewBox="0 0 320 120" className="mx-auto w-full max-w-sm" aria-label="Seal-in circuit schematic">
        <g stroke="var(--color-ink)" strokeWidth="2" fill="none">
          {/* Left and right rails */}
          <line x1="20" y1="10" x2="20" y2="110" />
          <line x1="300" y1="10" x2="300" y2="110" />
          {/* Rung */}
          <line x1="20" y1="35" x2="70" y2="35" />
          <line x1="70" y1="20" x2="70" y2="50" />
          <line x1="80" y1="20" x2="80" y2="50" />
          <line x1="80" y1="35" x2="140" y2="35" />
          <line x1="140" y1="20" x2="140" y2="50" />
          <line x1="150" y1="20" x2="150" y2="50" />
          <line x1="150" y1="35" x2="300" y2="35" />
          {/* Seal-in branch */}
          <line x1="70" y1="35" x2="70" y2="70" />
          <line x1="70" y1="70" x2="100" y2="70" />
          <line x1="100" y1="55" x2="100" y2="85" />
          <line x1="110" y1="55" x2="110" y2="85" />
          <line x1="110" y1="70" x2="150" y2="70" />
          <line x1="150" y1="35" x2="150" y2="70" />
          {/* Coil on right */}
          <circle cx="280" cy="35" r="12" />
        </g>
        <text x="60" y="15" fontSize="9" fill="var(--color-muted-ink)">Start</text>
        <text x="130" y="15" fontSize="9" fill="var(--color-muted-ink)">Stop</text>
        <text x="90" y="82" fontSize="9" fill="var(--color-muted-ink)">Seal</text>
        <text x="263" y="58" fontSize="9" fill="var(--color-muted-ink)">Run</text>
      </svg>
    </div>
  );
}
