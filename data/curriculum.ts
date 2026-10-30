import type { Level } from "@/config/plans";
import type { LessonIcon } from "./types";

/** Machines a lesson can run on. Each one is a 3D rig with its own I/O and physics. */
export type RigId =
  | "motor-starter"
  | "star-delta"
  | "reversing"
  | "conveyor"
  | "sorting"
  | "bottling"
  | "traffic"
  | "lift"
  | "mixer"
  | "tank"
  | "pumps"
  | "vsd";

export interface LessonRef {
  id: string;
  title: string;
  icon: LessonIcon;
  rig: RigId;
}

export interface Chapter {
  id: string;
  title: string;
  blurb: string;
  lessons: LessonRef[];
}

export interface Track {
  id: string;
  /** Short code shown on lesson chips, e.g. F3. */
  code: string;
  /** The ladder level whose training opens this track. */
  level: Level;
  name: string;
  blurb: string;
  ring: string;
  chapters: Chapter[];
}

const L = (id: string, title: string, icon: LessonIcon, rig: RigId = "motor-starter"): LessonRef => ({ id, title, icon, rig });

/**
 * The whole course, in teaching order. Lesson content lives in data/lessons, keyed by id;
 * a lesson without content shows as planned.
 */
export const CURRICULUM: Track[] = [
  {
    id: "foundations",
    level: "F",
    code: "F",
    name: "Foundations",
    blurb: "Ladder logic from the first contact to safe stop design, all on the motor starter bench.",
    ring: "#1f9d6b",
    chapters: [
      {
        id: "reading-ladder",
        title: "Reading ladder",
        blurb: "Symbols, rungs and the scan cycle",
        lessons: [
          L("f-symbols", "Ladder symbols", "contacts"),
          L("foundations-1", "Contacts and coils", "contacts"),
          L("f-scan", "Inputs, outputs and the scan", "sequence"),
        ],
      },
      {
        id: "motor-control",
        title: "Motor control",
        blurb: "Seal-in, latching, jog and protection",
        lessons: [
          L("foundations-2", "The seal-in circuit", "seal"),
          L("f-latch", "Latch and unlatch", "latch"),
          L("f-jog", "Jog and run", "jog"),
          L("foundations-3", "Overload protection", "overload"),
        ],
      },
      {
        id: "timers",
        title: "Timers",
        blurb: "On-delay, off-delay and flashing alarms",
        lessons: [
          L("f-ton", "On-delay timers", "timer"),
          L("f-tof", "Off-delay timers", "timer"),
          L("f-flasher", "Pilot lamps and alarms", "lamp"),
        ],
      },
      {
        id: "counting",
        title: "Counting and comparing",
        blurb: "Counters, comparisons, math and edges",
        lessons: [
          L("f-counters", "Counters", "counter"),
          L("f-compare", "Comparisons and math", "compare"),
          L("f-edge", "Edge detection", "edge"),
        ],
      },
      {
        id: "safety",
        title: "Safety",
        blurb: "E-stops and fail-safe wiring",
        lessons: [L("f-estop", "E-stop circuits", "estop"), L("f-safe-stop", "Safe stop design", "safety")],
      },
    ],
  },
  {
    id: "machines",
    level: "P",
    code: "M",
    name: "Machines",
    blurb: "Real machines: starters, conveyors, sorting, traffic lights, lifts and batching.",
    ring: "#f26b1d",
    chapters: [
      {
        id: "starters",
        title: "Motor starters",
        blurb: "Star-delta, interlocks and reversing",
        lessons: [
          L("m-star-delta", "Star-delta starter", "stardelta", "star-delta"),
          L("m-interlock", "Interlocks", "interlock", "star-delta"),
          L("m-reversing", "Forward and reverse", "reverse", "reversing"),
        ],
      },
      {
        id: "handling",
        title: "Conveyors and sorting",
        blurb: "Moving, sorting and counting product",
        lessons: [
          L("m-conveyor", "Conveyor control", "conveyor", "conveyor"),
          L("m-sorting", "Sorting station", "conveyor", "sorting"),
          L("m-bottling", "Bottling line", "counter", "bottling"),
        ],
      },
      {
        id: "sequences",
        title: "Sequences",
        blurb: "Step by step machines and state",
        lessons: [
          L("m-traffic", "Traffic lights", "sequence", "traffic"),
          L("m-lift", "Lift control", "sequence", "lift"),
          L("m-mixer", "Batch mixer", "sequence", "mixer"),
        ],
      },
    ],
  },
  {
    id: "process",
    level: "P",
    code: "P",
    name: "Process Control",
    blurb: "Level, pumps, analog signals, alarms and variable speed drives.",
    ring: "#2457a6",
    chapters: [
      {
        id: "level",
        title: "Level and pumps",
        blurb: "Tanks, transmitters and duty pumps",
        lessons: [
          L("p-tank-level", "Tank level control", "tank", "tank"),
          L("p-analog", "Analog scaling", "compare", "tank"),
          L("p-duplex", "Duplex pumps, lead and lag", "tank", "pumps"),
          L("p-alarms", "Process alarms", "lamp", "pumps"),
        ],
      },
      {
        id: "drives",
        title: "Motor protection and VSD",
        blurb: "Drives, ramps and speed references",
        lessons: [
          L("p-vsd", "Variable speed drives", "reverse", "vsd"),
          L("p-vsd-faults", "Drive faults and protection", "fault", "vsd"),
        ],
      },
    ],
  },
  {
    id: "wiring",
    level: "F",
    code: "W",
    name: "Wiring and Commissioning",
    blurb: "Read the drawings, wire the panel, prove every loop before power on.",
    ring: "#8a5cc2",
    chapters: [
      {
        id: "drawings",
        title: "Drawings and panels",
        blurb: "Schematics, power and control, terminals",
        lessons: [
          L("w-schematics", "Reading a schematic", "contacts"),
          L("w-power-control", "Power and control circuits", "overload"),
          L("w-terminals", "Terminal numbering", "fault"),
        ],
      },
      {
        id: "testing",
        title: "Testing and commissioning",
        blurb: "Meters, loop checks and sign-off",
        lessons: [
          L("w-multimeter", "Testing with a multimeter", "fault"),
          L("w-loop-check", "I/O loop checks", "sequence"),
          L("w-commissioning", "Commissioning checklist", "safety"),
        ],
      },
    ],
  },
  {
    id: "advanced",
    level: "E",
    code: "A",
    name: "Advanced",
    blurb: "Structured text, function blocks, networks, HMI and fault finding.",
    ring: "#c2410c",
    chapters: [
      {
        id: "programming",
        title: "Programming",
        blurb: "Beyond ladder",
        lessons: [L("a-structured-text", "Structured text", "sequence"), L("a-function-blocks", "Function blocks", "sequence")],
      },
      {
        id: "systems",
        title: "Systems",
        blurb: "Networks, screens and keeping plant running",
        lessons: [
          L("a-comms", "Industrial networks", "sequence", "vsd"),
          L("a-hmi", "HMI and SCADA basics", "lamp", "tank"),
          L("a-fault-finding", "Fault finding", "fault"),
          L("a-documentation", "Documentation and handover", "safety"),
        ],
      },
    ],
  },
  {
    id: "platforms",
    level: "P",
    code: "T",
    name: "Platform tours",
    blurb: "The same logic on every major controller family.",
    ring: "#0f766e",
    chapters: [
      {
        id: "tours",
        title: "Controller families",
        blurb: "Hardware, addressing and program structure",
        lessons: [
          L("t-iec", "IEC 61131 generic", "contacts"),
          L("t-siemens", "Siemens S7 style", "contacts"),
          L("t-rockwell", "Allen Bradley style", "contacts"),
          L("t-schneider", "Schneider Modicon style", "contacts"),
          L("t-mitsubishi", "Mitsubishi FX style", "contacts"),
          L("t-omron", "Omron style", "contacts"),
          L("t-delta", "Delta DVP style", "contacts"),
        ],
      },
    ],
  },
];

export interface LessonPlace {
  ref: LessonRef;
  track: Track;
  chapter: Chapter;
  /** 1 based position within the track. */
  number: number;
  /** Track code plus number, e.g. F4. */
  code: string;
}

export const LESSON_ORDER: LessonPlace[] = CURRICULUM.flatMap((track) => {
  let n = 0;
  return track.chapters.flatMap((chapter) =>
    chapter.lessons.map((ref) => {
      n += 1;
      return { ref, track, chapter, number: n, code: `${track.code}${n}` };
    }),
  );
});

export const placeOf = (id: string) => LESSON_ORDER.find((p) => p.ref.id === id);
