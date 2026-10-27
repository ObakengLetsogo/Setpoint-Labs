/** A lesson's video lecture. Videos are produced separately and uploaded; this is what the player needs. */
export interface LessonVideo {
  src: string;
  poster?: string;
  /** WebVTT captions, also used to build the transcript. */
  captions?: string;
  durationS?: number;
  chapters: { t: number; title: string }[];
}

/**
 * Uploaded videos, keyed by lesson id. Until the admin upload is connected to the database,
 * add entries here, or drop files in public/videos/<lessonId>.mp4 and .vtt and list them.
 */
export const VIDEOS: Record<string, LessonVideo> = {};

export const videoFor = (lessonId: string): LessonVideo | undefined => VIDEOS[lessonId];
