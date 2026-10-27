const CONTROLS: { keys: string[]; action: string }[] = [
  { keys: ["Drag", "W A S D"], action: "Pan the stage" },
  { keys: ["Scroll", "Pinch"], action: "Zoom in and out" },
  { keys: ["Q", "E"], action: "Turn the rig 90°" },
  { keys: ["R"], action: "Reset the view" },
  { keys: ["X"], action: "Exploded view" },
  { keys: ["Click"], action: "Select a part, zoom to it from its card" },
  { keys: ["Esc"], action: "Close the part card" },
  { keys: ["Space"], action: "Run or stop the PLC" },
  { keys: ["."], action: "Step one scan" },
  { keys: ["[", "]"], action: "Previous or next lesson" },
];

export function ReferenceSheetContent() {
  return (
    <ul className="divide-y divide-border">
      {CONTROLS.map((c) => (
        <li key={c.action} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
          <span className="text-ink">{c.action}</span>
          <span className="flex shrink-0 gap-1">
            {c.keys.map((k) => (
              <kbd key={k} className="rounded-md border border-b-2 border-border bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-ink">
                {k}
              </kbd>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
