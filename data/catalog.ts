// What the browser knows about lessons before it is allowed to open them: titles, places and
// machines, never content. Lesson content comes from /api/lessons/<id> after an access check.

import { LESSON_ORDER, type RigId } from "./curriculum";
import { isFreeLesson } from "./access";
import type { LessonIcon } from "./types";
import { WRITTEN } from "./written";

export interface LessonMeta {
  id: string;
  trackId: string;
  chapterId: string;
  /** 1 based position within the track. */
  number: number;
  /** Track code plus number, e.g. F4. */
  chip: string;
  rig: RigId;
  title: string;
  icon: LessonIcon;
  /** Open to everyone, signed in or not. */
  free: boolean;
  /** Not written yet. */
  locked: boolean;
}

export const catalog: LessonMeta[] = LESSON_ORDER.map(({ ref, track, chapter, number, code }) => ({
  id: ref.id,
  trackId: track.id,
  chapterId: chapter.id,
  number,
  chip: code,
  rig: ref.rig,
  title: ref.title,
  icon: ref.icon,
  free: isFreeLesson(ref.id),
  locked: !WRITTEN.has(ref.id),
}));

export const metaOf = (id: string) => catalog.find((l) => l.id === id);
