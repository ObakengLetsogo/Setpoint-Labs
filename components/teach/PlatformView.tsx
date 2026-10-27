"use client";

import { useMemo, useState } from "react";
import { PLATFORMS, translateProgram, type PlatformId } from "@/engine/platforms";
import { useRig, useSim } from "@/store/sim";
import { IconLock } from "@/components/ui/icons";

/** The lesson's ladder program as each controller family would write it. */
export function PlatformView({ initial }: { initial?: PlatformId }) {
  const account = useSim((s) => s.account);
  const lock = account?.platformLock as PlatformId | null | undefined;
  const mine = (lock ?? account?.user?.platform ?? "siemens") as PlatformId;
  // Free accounts read the IEC standard plus one family of their choice; a plan opens them all.
  const open = (p: PlatformId) => p === "iec" || p === mine || p === initial || Boolean(account?.paid);
  const [picked, setId] = useState<PlatformId | null>(null);
  const id: PlatformId = picked ?? (initial && open(initial) ? initial : mine);
  const rig = useRig();
  const program = useSim((s) => s.program);
  const platform = PLATFORMS.find((p) => p.id === id)!;
  const t = useMemo(() => (program ? translateProgram(id, program, rig.tags) : null), [id, program, rig.tags]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4e6e9] bg-white">
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[#eef0f2] p-1.5">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={!open(p.id)}
            title={open(p.id) ? undefined : "Every controller family comes with a plan"}
            onClick={() => setId(p.id)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition disabled:cursor-not-allowed disabled:text-[#a9afb6] ${p.id === id ? "bg-ink text-white" : "text-[#3d434a] hover:bg-[#f3f4f5]"}`}
          >
            {!open(p.id) && <IconLock size={10} />}
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid gap-px bg-[#eef0f2] sm:grid-cols-3">
        {[
          ["Controllers", platform.family],
          ["Software", platform.software],
          ["Addressing", platform.addressing],
        ].map(([k, v]) => (
          <div key={k} className="bg-white px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-ink">{k}</p>
            <p className="mt-1 text-[13px] leading-[1.5] text-ink">{v}</p>
          </div>
        ))}
      </div>

      {!t ? (
        <p className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-ink">Fix the ladder program to see it translated</p>
      ) : (
        <div className="grid lg:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0 border-b border-[#eef0f2] lg:border-b-0 lg:border-r">
            <p className="px-4 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#d9591a]">{platform.notation}</p>
            <pre className="max-h-[420px] overflow-auto px-4 py-3 font-mono text-[12px] leading-[1.7] text-ink">
              {t.lines.map((l, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-6 shrink-0 select-none text-right text-[#b3b8be]">{i + 1}</span>
                  <span className={/^(;|'|\/\/|\(\*|NETWORK)/.test(l) ? "text-[#8f949b]" : ""}>{l}</span>
                </div>
              ))}
            </pre>
          </div>
          <div className="min-w-0">
            <p className="px-4 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-ink">Tag map</p>
            <div className="max-h-[420px] overflow-auto px-2 pb-2 pt-1">
              <table className="w-full text-left text-[12px]">
                <tbody>
                  {t.map.map((r) => (
                    <tr key={r.tag} className="border-t border-[#f1f2f4] first:border-t-0">
                      <td className="px-2 py-1.5 font-mono text-ink">{r.tag}</td>
                      <td className="px-2 py-1.5 font-mono text-[#d9591a]">{r.address}</td>
                      <td className="px-2 py-1.5 text-[#5b6068]">{r.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <p className="border-t border-[#eef0f2] px-4 py-2.5 text-[11.5px] leading-[1.5] text-muted-ink">
        A study guide. Instruction names are the common ones for each family; check them against the manual for your exact controller.
      </p>
    </div>
  );
}
