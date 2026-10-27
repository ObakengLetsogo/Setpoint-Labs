export type Difficulty = "beginner" | "intermediate" | "advanced";

export type LessonIcon =
  | "contacts"
  | "seal"
  | "overload"
  | "interlock"
  | "reverse"
  | "timer"
  | "stardelta"
  | "counter"
  | "compare"
  | "edge"
  | "tank"
  | "conveyor"
  | "latch"
  | "lamp"
  | "safety"
  | "estop"
  | "jog"
  | "sequence"
  | "fault";

export interface TrackSummary {
  id: string;
  name: string;
  totalLessons: number;
}

export interface IoPoint {
  address: string;
  tagName: string;
  color: string;
  connectsTo: string;
  description: string;
}

export interface ExampleStep {
  line: number;
  text: string;
}

export interface SpecItem {
  label: string;
  value: string;
}

/** What a lesson author writes. Title, icon, track, number and rig come from data/curriculum.ts. */
export interface LessonContent {
  difficulty: Difficulty;
  /** Wiring changes the lesson makes on its rig. */
  rigOptions?: import("@/rigs/motorStarter").RigOptions;
  summary: string;
  facts: { icon: "press" | "watch" | "bolt" | "shield" | "info"; text: string }[];
  io: IoPoint[];
  steps: ExampleStep[];
  code: string[];
  specs: SpecItem[];
}

export interface Lesson {
  id: string;
  trackId: string;
  chapterId: string;
  /** 1 based position within the track. */
  number: number;
  /** Track code plus number, e.g. F4. */
  chip: string;
  rig: import("./curriculum").RigId;
  title: string;
  icon: LessonIcon;
  difficulty: Difficulty;
  completed: boolean;
  locked?: boolean;
  rigOptions?: import("@/rigs/motorStarter").RigOptions;
  summary: string;
  facts: { icon: "press" | "watch" | "bolt" | "shield" | "info"; text: string }[];
  io: IoPoint[];
  steps: ExampleStep[];
  code: string[];
  specs: SpecItem[];
}
