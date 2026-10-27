export type Difficulty = "beginner" | "intermediate" | "advanced";

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

export interface CalloutLabel {
  id: string;
  label: string;
  color: string;
  top: string;
  left: string;
}

export interface Lesson {
  id: string;
  trackId: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  completed: boolean;
  locked?: boolean;
  summary: string;
  facts: string[];
  io: IoPoint[];
  steps: ExampleStep[];
  code: string[];
  specs: SpecItem[];
  callouts: CalloutLabel[];
}
