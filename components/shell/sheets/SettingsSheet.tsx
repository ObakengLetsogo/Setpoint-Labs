"use client";

import { useSim, type Settings } from "@/store/sim";
import { Toggle } from "@/components/ui/controls";
import { PLATFORMS } from "@/engine/platforms";

const TOGGLES: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "calloutLabels", label: "Callout labels", hint: "Name and spec beside the selected part" },
  { key: "floorGrid", label: "Floor grid", hint: "Reference grid under the rig" },
  { key: "turntable", label: "Turntable", hint: "Slowly rotate the rig" },
  { key: "sound", label: "Sound", hint: "Clicks and motor hum, coming soon" },
  { key: "reduceMotion", label: "Reduce motion", hint: "Snap instead of animate" },
];

export function SettingsSheetContent() {
  const settings = useSim((s) => s.settings);
  const setSetting = useSim((s) => s.setSetting);
  const resetSettings = useSim((s) => s.resetSettings);
  const account = useSim((s) => s.account);
  const setPlatform = async (platform: string) => {
    const res = await fetch("/api/me/platform", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform }) });
    if (res.ok) await useSim.getState().loadAccount();
  };
  return (
    <div>
      {account?.user && (
        <label className="mb-2 flex items-center justify-between gap-4 border-b border-border pb-3">
          <span>
            <span className="block text-[13.5px] text-ink">Controller family</span>
            <span className="block text-[11.5px] text-muted-ink">{account.platformLock ? "Set by your class" : "Shown first in every lesson's translation"}</span>
          </span>
          <select
            value={account.platformLock ?? account.user.platform}
            disabled={Boolean(account.platformLock)}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-[13px] text-ink"
          >
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      )}
      <ul className="divide-y divide-border">
        {TOGGLES.map((t) => (
          <li key={t.key} className="flex items-center justify-between gap-4 py-3">
            <span>
              <span className="block text-[13.5px] text-ink">{t.label}</span>
              <span className="block text-[11.5px] text-muted-ink">{t.hint}</span>
            </span>
            <Toggle label={t.label} checked={settings[t.key]} onChange={(v) => setSetting(t.key, v)} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={resetSettings}
        className="mt-3 w-full rounded-xl border border-border py-2.5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-ink hover:border-ink/30 hover:text-ink"
      >
        Reset saved layout
      </button>
    </div>
  );
}
