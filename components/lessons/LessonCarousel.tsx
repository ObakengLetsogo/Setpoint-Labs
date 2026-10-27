"use client";

import { useRef } from "react";
import type { Lesson } from "@/data/types";

export function LessonCarousel({
  lessons,
  activeId,
  onSelect,
}: {
  lessons: Lesson[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="mx-4 mt-4 flex items-center gap-2 sm:mx-6">
      <button
        type="button"
        aria-label="Previous lessons"
        onClick={() => scrollBy(-240)}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink sm:flex"
      >
        ‹
      </button>

      <div ref={scrollerRef} className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth py-1">
        {lessons.map((lesson) => {
          const active = lesson.id === activeId;
          return (
            <button
              key={lesson.id}
              type="button"
              onClick={() => onSelect(lesson.id)}
              className={`flex w-36 shrink-0 flex-col gap-2 rounded-xl border p-3 text-left transition ${
                active
                  ? "border-accent bg-surface shadow-card"
                  : "border-border bg-surface/60 hover:border-accent/50"
              } ${lesson.locked ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: active ? "var(--color-accent)" : "var(--color-primary)" }}
                >
                  {lesson.number}
                </div>
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                    lesson.completed
                      ? "border-energised bg-energised text-white"
                      : "border-border text-transparent"
                  }`}
                >
                  ✓
                </div>
              </div>
              <p className="line-clamp-2 text-xs font-semibold leading-snug text-ink">{lesson.title}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="More lessons"
        onClick={() => scrollBy(240)}
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink sm:flex"
      >
        ›
      </button>
    </div>
  );
}
