/** A lesson's video lecture. Videos are produced separately and uploaded; this is what the player needs. */
export interface LessonVideo {
  src: string;
  poster?: string;
  /** WebVTT captions, also used to build the transcript. */
  captions?: string;
  durationS?: number;
  chapters: { t: number; title: string }[];
}
