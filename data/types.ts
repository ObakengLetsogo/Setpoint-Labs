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

export interface Lesson {
  id: string;
  trackId: string;
  number: number;
  title: string;
  icon: LessonIcon;
  difficulty: Difficulty;
  completed: boolean;
  locked?: boolean;
  summary: string;
  facts: { icon: "press" | "watch" | "bolt" | "shield" | "info"; text: string }[];
  io: IoPoint[];
  steps: ExampleStep[];
  code: string[];
  specs: SpecItem[];
}
