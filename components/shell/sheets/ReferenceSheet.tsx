const CONTROLS: { keys: string; action: string }[] = [
  { keys: "Drag / WASD", action: "Pan the stage" },
  { keys: "Scroll", action: "Zoom in and out" },
  { keys: "Q / E", action: "Rotate 90°" },
  { keys: "Compass icon", action: "Reset view" },
  { keys: "Tap a part", action: "Zoom to that part" },
  { keys: "Esc / ✕", action: "Close the open part" },
  { keys: "Space", action: "Run or stop the scan" },
  { keys: "← / →", action: "Switch lesson" },
];

export function ReferenceSheetContent() {
  return (
    <ul className="divide-y divide-border">
      {CONTROLS.map((c) => (
        <li key={c.keys} className="flex items-center justify-between py-3 text-sm">
          <span className="text-ink">{c.action}</span>
          <kbd className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-muted-ink">
            {c.keys}
          </kbd>
        </li>
      ))}
    </ul>
  );
}
