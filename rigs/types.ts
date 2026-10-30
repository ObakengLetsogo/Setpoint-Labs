import type { Memory } from "@/engine/scan";
import type { RigId } from "@/data/curriculum";

export type Vec3 = [number, number, number];

/** A rig's physical state: button positions, speeds, levels, positions of parts. */
export type PhysicalState = Record<string, number | boolean>;
export type FaultState = Record<string, boolean>;

export interface RigTag {
  tag: string;
  address: string;
  kind: "input" | "output" | "marker";
  color: string;
  connectsTo: string;
  /** Carries a number rather than a bit. */
  analog?: boolean;
}

export interface RigPart {
  id: string;
  name: string;
  kicker: string;
  spec: string;
  description: string;
  anchor: Vec3;
  explode: number;
}

export interface Annotation {
  n: number;
  part: string;
  title: string;
  text: string;
  /** Lesson ids of the labs that use this part. */
  labs: string[];
  more: number;
  side: "left" | "right";
  icon: string;
}

export interface FaultDef {
  key: string;
  label: string;
  part: string;
}

/** Hands-on controls shown in a part's popover. All of them change the physical state. */
export type Control =
  | { kind: "hold"; part: string; label: string; key: string; tone: string }
  | { kind: "toggle"; part: string; label: string; key: string; on: string; off: string; logOn?: string; logOff?: string }
  | { kind: "slider"; part: string; label: string; key: string; min: number; max: number; step: number; unit: string }
  | { kind: "meter"; part: string; label: string; key: string; max: number; unit: string; scale?: number; tone: string }
  | { kind: "action"; part: string; label: string; patch: (p: PhysicalState) => PhysicalState; log?: string; danger?: boolean }
  | { kind: "status"; part: string; label: string; value: (p: PhysicalState, m: Memory, running: boolean) => { text: string; on: boolean } };

export type TerminalKind = "power" | "ground" | "input" | "output";

export interface PlcTerminal {
  id: string;
  label: string;
  kind: TerminalKind;
}

export interface FieldDevice {
  id: string;
  name: string;
  terminals: string[];
  tone: string;
}

export interface WireDef {
  n: number;
  plc: string;
  device: string;
  terminal: string;
  color: string;
  title: string;
  caption: string;
  role: string;
  signal?: string;
}

export interface Wiring {
  /** Terminals that should not be used, e.g. a damaged output. */
  avoid?: string[];
  terminals: PlcTerminal[];
  devices: FieldDevice[];
  wires: WireDef[];
}

/** Lesson specific wiring changes, e.g. a normally closed stop button. */
export type RigOptions = Record<string, boolean | number | string | undefined>;

export interface LiveReadout {
  text: string | null;
  ring: "run" | "warn" | "fault" | "idle" | null;
}

export interface RigDef {
  id: RigId;
  name: string;
  /** Big hero words, the second one in orange. */
  headline: [string, string];
  tagline: string;
  /** Camera home: where it looks and how far back, relative to the motor starter bench. */
  view?: { target?: Vec3; scale?: number };
  tags: RigTag[];
  parts: RigPart[];
  annotations: Annotation[];
  initial: PhysicalState;
  faults: FaultDef[];
  controls: Control[];
  wiring: Wiring;
  readInputs: (p: PhysicalState, f: FaultState, o: RigOptions) => Memory;
  step: (p: PhysicalState, f: FaultState, memory: Memory, dtMs: number) => PhysicalState;
  /** Log lines for notable physical changes between two ticks, e.g. an overload tripping. */
  events?: (before: PhysicalState, after: PhysicalState) => [string, "info" | "fault"][];
  /** Live text and status ring for a part's annotation card. */
  live: (part: string, p: PhysicalState, memory: Memory, running: boolean) => LiveReadout;
}
