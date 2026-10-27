"use client";

import { useEffect } from "react";
import { IconX } from "@/components/ui/icons";

export function Sheet({
  title,
  subtitle,
  open,
  onClose,
  clear,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  /** Keep the page behind visible, e.g. a part the camera just zoomed to. */
  clear?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center lg:items-start lg:justify-end ${clear ? "bg-transparent" : "bg-ink/25 backdrop-blur-[2px] lg:bg-ink/10"}`} onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="sheet-panel w-full max-w-lg rounded-t-3xl border border-[#e4e6e9] bg-white p-5 shadow-[0_-12px_40px_-12px_rgba(27,36,48,0.3)] lg:mr-[max(24px,calc((100vw-1240px)/2+24px))] lg:mt-[76px] lg:w-[380px] lg:rounded-2xl lg:shadow-[0_24px_60px_-20px_rgba(27,36,48,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border lg:hidden" />
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-[20px] font-bold uppercase leading-none tracking-[0.06em] text-ink">{title}</h2>
            {subtitle && <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-ink">{subtitle}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-muted-ink hover:bg-background hover:text-ink">
            <IconX size={16} />
          </button>
        </div>
        <div className={`${clear ? "max-h-[46vh]" : "max-h-[62vh]"} overflow-y-auto`}>{children}</div>
      </div>
    </div>
  );
}
