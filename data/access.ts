// Which lessons anyone can open without paying. Shared by the client, the server and the tests.

import { LESSON_ORDER } from "./curriculum";

/** The first two chapters of Foundations are free. */
export const FREE_CHAPTERS = new Set(["reading-ladder", "motor-control"]);

export const FREE_LESSONS = new Set(LESSON_ORDER.filter((p) => FREE_CHAPTERS.has(p.chapter.id)).map((p) => p.ref.id));

export const isFreeLesson = (id: string) => FREE_LESSONS.has(id);

/** The ladder level a lesson belongs to, from its track. */
export const levelOfLesson = (id: string) => LESSON_ORDER.find((p) => p.ref.id === id)?.track.level;

/** The ladder level of a track, for certificates and assessments. */
export const levelOfTrack = (trackId: string) => LESSON_ORDER.find((p) => p.track.id === trackId)?.track.level;
