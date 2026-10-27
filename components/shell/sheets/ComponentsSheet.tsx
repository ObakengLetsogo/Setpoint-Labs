import type { CalloutLabel } from "@/data/types";

export function ComponentsSheetContent({ callouts }: { callouts: CalloutLabel[] }) {
  if (callouts.length === 0) {
    return <p className="py-4 text-sm text-muted-ink">No parts to show for this chapter yet.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {callouts.map((c) => (
        <li key={c.id} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="text-sm font-medium text-ink">{c.label}</span>
          </div>
          <button type="button" className="text-xs font-semibold text-primary hover:underline">
            Locate ⊙
          </button>
        </li>
      ))}
    </ul>
  );
}
