export function ScanMonitor({ running, log }: { running: boolean; log: string[] }) {
  return (
    <div className="mx-4 mt-4 mb-6 rounded-2xl border border-border bg-surface shadow-card sm:mx-6">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-sm font-semibold text-ink">Scan monitor</p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
            running ? "bg-energised/10 text-energised" : "bg-muted-ink/10 text-muted-ink"
          }`}
        >
          {running ? "Running" : "Stopped"}
        </span>
      </div>
      <div className="h-32 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed text-ink">
        {log.length === 0 ? (
          <p className="text-muted-ink">Press Run to start the scan.</p>
        ) : (
          log.map((line, i) => <p key={i}>{line}</p>)
        )}
      </div>
    </div>
  );
}
