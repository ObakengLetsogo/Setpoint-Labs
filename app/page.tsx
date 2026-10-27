"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Header } from "@/components/shell/Header";
import { ProgressCard } from "@/components/shell/ProgressCard";
import { Stage } from "@/components/stage/Stage";
import { LessonCarousel } from "@/components/lessons/LessonCarousel";
import { LessonPanel } from "@/components/lessons/LessonPanel";
import { CodeCard } from "@/components/code/CodeCard";
import { SchematicCard } from "@/components/schematic/SchematicCard";
import { ScanMonitor } from "@/components/monitor/ScanMonitor";
import { BottomTabBar, type BottomTab } from "@/components/shell/BottomTabBar";
import { Sheet } from "@/components/shell/Sheet";
import { ComponentsSheetContent } from "@/components/shell/sheets/ComponentsSheet";
import { ReferenceSheetContent } from "@/components/shell/sheets/ReferenceSheet";
import { SettingsSheetContent, type SettingsState } from "@/components/shell/sheets/SettingsSheet";
import { LanguageSheetContent } from "@/components/shell/sheets/LanguageSheet";
import { lessons } from "@/data/lessons";
import { tracks } from "@/data/tracks";

const DEFAULT_SETTINGS: SettingsState = {
  calloutLabels: true,
  floorGrid: true,
  turntable: false,
  sound: false,
  reduceMotion: false,
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [lessonId, setLessonId] = useState(lessons[0].id);
  const [sheet, setSheet] = useState<BottomTab | null>(null);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [language, setLanguage] = useState("EN");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const lesson = lessons.find((l) => l.id === lessonId) ?? lessons[0];
  const track = tracks.find((t) => t.id === lesson.trackId)!;
  const completedCount = lessons.filter((l) => l.trackId === lesson.trackId && l.completed).length;

  const handleRun = useCallback(() => {
    setRunning((r) => {
      const next = !r;
      setLog((prev) => [
        ...prev,
        next
          ? `Scan 1, ${lesson.title}: logic evaluated, 0 faults`
          : "Scan stopped by user",
      ]);
      return next;
    });
  }, [lesson.title]);

  function goToLesson(offset: number) {
    const idx = lessons.findIndex((l) => l.id === lessonId);
    const next = lessons[Math.min(lessons.length - 1, Math.max(0, idx + offset))];
    if (next) setLessonId(next.id);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleRun();
      } else if (e.key === "ArrowRight") {
        goToLesson(1);
      } else if (e.key === "ArrowLeft") {
        goToLesson(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleRun, lessonId]);

  if (loading) {
    return <LoadingScreen onDone={() => setLoading(false)} />;
  }

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <Header />
        <ProgressCard trackName={track.name} completed={completedCount} total={track.totalLessons} />

        <Stage
          lessonTitle={lesson.title}
          callouts={lesson.callouts}
          showCallouts={settings.calloutLabels}
          showGrid={settings.floorGrid}
          reduceMotion={settings.reduceMotion}
        />

        <LessonCarousel lessons={lessons} activeId={lessonId} onSelect={setLessonId} />
        <LessonPanel lesson={lesson} />

        {!lesson.locked && (
          <>
            <CodeCard code={lesson.code} onRun={handleRun} />
            <SchematicCard />
            <ScanMonitor running={running} log={log} />
          </>
        )}

        <p className="mt-auto px-6 pb-4 text-center text-xs text-muted-ink">
          Setpoint Labs is for education only. Not for use on live plant. © Setpoint Labs.
        </p>
      </div>

      <BottomTabBar
        active={sheet ?? "home"}
        onSelect={(tab) => {
          if (tab === "home") {
            setSheet(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else if (tab === "lessons") {
            setSheet(null);
            document.getElementById("lesson-panel")?.scrollIntoView({ behavior: "smooth" });
          } else {
            setSheet(tab);
          }
        }}
      />

      <Sheet title="Components" open={sheet === "components"} onClose={() => setSheet(null)}>
        <ComponentsSheetContent callouts={lesson.callouts} />
      </Sheet>

      <Sheet title="Reference" open={sheet === "reference"} onClose={() => setSheet(null)}>
        <ReferenceSheetContent />
      </Sheet>

      <Sheet title="Settings" open={sheet === "settings"} onClose={() => setSheet(null)}>
        <SettingsSheetContent
          settings={settings}
          onChange={(key, value) => setSettings((s) => ({ ...s, [key]: value }))}
          onResetLayout={() => setSettings(DEFAULT_SETTINGS)}
        />
      </Sheet>

      <Sheet title="Language" open={sheet === "language"} onClose={() => setSheet(null)}>
        <LanguageSheetContent active={language} onSelect={setLanguage} />
      </Sheet>
    </div>
  );
}
