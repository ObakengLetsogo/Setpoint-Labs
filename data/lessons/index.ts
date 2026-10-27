import { LESSON_ORDER } from "../curriculum";
import type { Lesson, LessonContent } from "../types";
import { FOUNDATIONS } from "./foundations";
import { FOUNDATIONS_MORE } from "./foundations-more";
import { MACHINES } from "./machines";

const CONTENT: Record<string, LessonContent> = { ...FOUNDATIONS, ...FOUNDATIONS_MORE, ...MACHINES };

const PLANNED: LessonContent = {
  difficulty: "beginner",
  summary: "This lesson is being written. Open lessons are marked on the track.",
  facts: [],
  io: [],
  steps: [],
  code: ["// Coming soon"],
  specs: [],
};

/** Every lesson in course order. Lessons without written content are locked. */
export const lessons: Lesson[] = LESSON_ORDER.map(({ ref, track, chapter, number, code }) => {
  const content = CONTENT[ref.id];
  return {
    id: ref.id,
    trackId: track.id,
    chapterId: chapter.id,
    number,
    chip: code,
    rig: ref.rig,
    title: ref.title,
    icon: ref.icon,
    completed: false,
    locked: !content,
    ...(content ?? PLANNED),
  };
});

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
