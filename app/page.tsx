"use client";

import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AutomationApi } from "@/components/AutomationApi";
import { TopBar, TrackPills, Hero } from "@/components/shell/TopBar";
import { MeetTheRig } from "@/components/stage/Stage";
import { LabTrack } from "@/components/teach/LabTrack";
import { LessonView } from "@/components/teach/LessonView";
import { SandboxPicker, SandboxView } from "@/components/teach/Sandbox";
import { isSandbox } from "@/data/sandbox";
import { Sheet } from "@/components/shell/Sheet";
import { ComponentsSheetContent } from "@/components/shell/sheets/ComponentsSheet";
import { ReferenceSheetContent } from "@/components/shell/sheets/ReferenceSheet";
import { SettingsSheetContent } from "@/components/shell/sheets/SettingsSheet";
import { LanguageSheetContent } from "@/components/shell/sheets/LanguageSheet";
import { lessons } from "@/data/lessons";
import { useSim } from "@/store/sim";

type SheetId = "components" | "reference" | "settings" | "language";

const SHEETS: Record<SheetId, { title: string; subtitle: string }> = {
  components: { title: "Components", subtitle: "Every part on the rig" },
  reference: { title: "Controls", subtitle: "Keyboard and gestures" },
  settings: { title: "Settings", subtitle: "Stage and comfort" },
  language: { title: "Language", subtitle: "More on the way" },
};

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]")) return;
      const s = useSim.getState();
      const idx = lessons.findIndex((l) => l.id === s.lessonId);
      switch (e.key) {
        case " ":
          e.preventDefault();
          s.toggleRun();
          break;
        case ".":
          s.stepScan();
          break;
        case "q":
        case "Q":
          s.rotate(-1);
          break;
        case "e":
        case "E":
          s.rotate(1);
          break;
        case "r":
        case "R":
          s.resetView();
          break;
        case "x":
        case "X":
          s.toggleExplode();
          break;
        case "Escape":
          s.select(null);
          break;
        case "[":
          if (lessons[idx - 1]) s.setLesson(lessons[idx - 1].id);
          break;
        case "]":
          if (lessons[idx + 1]) s.setLesson(lessons[idx + 1].id);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const lessonId = useSim((s) => s.lessonId);
  const lesson = lessons.find((l) => l.id === lessonId) ?? lessons[0];
  useShortcuts();
  useEffect(() => {
    void useSim.persist.rehydrate();
  }, []);

  if (loading) return <LoadingScreen onDone={() => setLoading(false)} />;

  return (
    <div className="min-h-dvh bg-[#f4f5f6] bg-[linear-gradient(#eceef0_1px,transparent_1px),linear-gradient(90deg,#eceef0_1px,transparent_1px)] bg-[size:28px_28px]">
      <AutomationApi />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 pb-24 pt-5 sm:px-6">
        <TopBar onOpen={setSheet} />
        <TrackPills />
        <Hero onReadCode={() => document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth" })} />
        <MeetTheRig />

        <LabTrack
          onOpen={(id) => {
            useSim.getState().setLesson(id);
            setTimeout(() => document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth" }), 50);
          }}
        />
        <SandboxPicker onOpen={() => setTimeout(() => document.getElementById("lesson")?.scrollIntoView({ behavior: "smooth" }), 50)} />
        {isSandbox(lessonId) ? <SandboxView /> : <LessonView key={lesson.id} lesson={lesson} />}

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-ink">
          Setpoint Labs is for education only. Not for use on live plant.
        </p>
      </div>

      {(Object.keys(SHEETS) as SheetId[]).map((id) => (
        <Sheet key={id} title={SHEETS[id].title} subtitle={SHEETS[id].subtitle} open={sheet === id} onClose={() => setSheet(null)}>
          {id === "components" && <ComponentsSheetContent onDone={() => setSheet(null)} />}
          {id === "reference" && <ReferenceSheetContent />}
          {id === "settings" && <SettingsSheetContent />}
          {id === "language" && <LanguageSheetContent />}
        </Sheet>
      ))}
    </div>
  );
}
