"use client";

export interface SettingsState {
  calloutLabels: boolean;
  floorGrid: boolean;
  turntable: boolean;
  sound: boolean;
  reduceMotion: boolean;
}

export function SettingsSheetContent({
  settings,
  onChange,
  onResetLayout,
}: {
  settings: SettingsState;
  onChange: (key: keyof SettingsState, value: boolean) => void;
  onResetLayout: () => void;
}) {
  const toggles: { key: keyof SettingsState; label: string }[] = [
    { key: "calloutLabels", label: "Callout labels" },
    { key: "floorGrid", label: "Floor grid" },
    { key: "turntable", label: "Turntable" },
    { key: "sound", label: "Sound" },
    { key: "reduceMotion", label: "Reduce motion" },
  ];

  return (
    <div>
      <ul className="divide-y divide-border">
        {toggles.map((t) => (
          <li key={t.key} className="flex items-center justify-between py-3">
            <span className="text-sm text-ink">{t.label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings[t.key]}
              onClick={() => onChange(t.key, !settings[t.key])}
              className={`h-6 w-11 rounded-full p-0.5 transition ${
                settings[t.key] ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition ${
                  settings[t.key] ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onResetLayout}
        className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-fault hover:bg-fault/5"
      >
        Reset saved layout
      </button>
    </div>
  );
}
