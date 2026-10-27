"use client";

import { create } from "zustand";

export interface RecordLabel {
  kicker?: string;
  title: string;
}

/** On-screen state for /record that lesson videos drive through window.setpointLabs. */
export const useRecord = create<{ label: RecordLabel | null; showLabel: (label: RecordLabel | null) => void }>((set) => ({
  label: null,
  showLabel: (label) => set({ label }),
}));
