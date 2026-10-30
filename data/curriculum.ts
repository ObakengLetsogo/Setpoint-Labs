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
  /** The stage of the ladder this chapter teaches, 1 to 7. */
  stage: StageNumber;
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

export type StageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Stage {
  n: StageNumber;
  name: string;
  level: Level;
  /** Still to build: shown on the ladder so learners see what is coming. */
  planned?: boolean;
}

/** The seven stages of the ladder, as set in the Curriculum and Lecture Guide. */
export const STAGES: Stage[] = [
  { n: 1, name: "Fundamentals and SCADA", level: "F" },
  { n: 2, name: "Installation and Commissioning", level: "F" },
  { n: 3, name: "Machines, Process Control and PID", level: "P" },
  { n: 4, name: "Motor Management and Drives", level: "P" },
  { n: 7, name: "Safety Systems", level: "P", planned: true },
  { n: 5, name: "Advanced Programming", level: "E" },
  { n: 6, name: "Plant Systems, DCS and Upgrades", level: "E", planned: true },
];

const L = (id: string, title: string, icon: LessonIcon, rig: RigId = "motor-starter"): LessonRef => ({ id, title, icon, rig });

/**
 * The whole course, in teaching order. Lesson content lives in data/lessons, keyed by id;
 * a lesson without content shows as planned.
 */
export const CURRICULUM: Track[] = [
  {
    id: "foundations",
    level: "F",
    code: "F1",
    name: "Fundamentals",
    blurb: "How a PLC scans, ladder logic, motor control, timers, counters and safety basics.",
    ring: "#1f9d6b",
    chapters: [
      {
        id: "plc-basics",
        stage: 1,
        title: "What a PLC is",
        blurb: "Why machines need controllers, and what is inside one",
        lessons: [L("f-why", "Why machines need controllers", "contacts"), L("f-inside", "Inside the PLC: CPU, power and I/O", "lamp")],
      },
      {
        id: "reading-ladder",
        stage: 1,
        title: "Reading ladder",
        blurb: "Symbols, rungs and the scan cycle",
        lessons: [
          L("f-symbols", "Ladder symbols", "contacts"),
          L("foundations-1", "Contacts and coils", "contacts"),
          L("f-scan", "Inputs, outputs and the scan", "sequence"),
        ],
      },
      {
        id: "data-tags",
        stage: 1,
        title: "Numbers, data and tags",
        blurb: "Bits, words, data types, addresses and memory",
        lessons: [L("f-bits", "Bits, bytes and words", "compare"), L("f-types", "Data types", "compare"), L("f-tags", "Tags, addresses and memory", "seal")],
      },
      {
        id: "motor-control",
        stage: 1,
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
        id: "field-devices",
        stage: 1,
        title: "Field devices",
        blurb: "Buttons, sensors, relays, contactors and valves",
        lessons: [
          L("f-buttons", "Buttons, selector switches and limit switches", "contacts"),
          L("f-sensors", "Proximity and photoelectric sensors", "conveyor", "conveyor"),
          L("f-relays", "Relays, contactors and solenoid valves", "overload"),
        ],
      },
      {
        id: "timers",
        stage: 1,
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
        stage: 1,
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
        stage: 1,
        title: "Safety",
        blurb: "E-stops and fail-safe wiring",
        lessons: [L("f-estop", "E-stop circuits", "estop"), L("f-safe-stop", "Safe stop design", "safety")],
      },
    ],
  },
  {
    id: "wiring",
    level: "F",
    code: "F2",
    name: "Installation and Commissioning",
    blurb: "Drawings, power and control circuits, terminals, meters, loop checks and sign off.",
    ring: "#8a5cc2",
    chapters: [
      {
        id: "drawings",
        stage: 2,
        title: "Drawings and panels",
        blurb: "Schematics, power and control, terminals",
        lessons: [
          L("w-schematics", "Reading a schematic", "contacts"),
          L("w-power-control", "Power and control circuits", "overload"),
          L("w-terminals", "Terminal numbering", "fault"),
        ],
      },
      {
        id: "electrical-safety",
        stage: 2,
        title: "Electrical safety at work",
        blurb: "Isolation, protection devices, earthing and cables",
        lessons: [
          L("w-isolation", "Isolation, lockout and testing for dead", "estop"),
          L("w-protection", "Protection devices and earthing", "overload"),
          L("w-cables", "Cables, glands and wiring standards", "fault"),
        ],
      },
      {
        id: "testing",
        stage: 2,
        title: "Testing and commissioning",
        blurb: "Meters, loop checks and sign-off",
        lessons: [
          L("w-wiring-io", "Wiring PLC inputs and outputs", "lamp"),
          L("w-multimeter", "Testing with a multimeter", "fault"),
          L("w-loop-check", "I/O loop checks", "sequence"),
          L("w-commissioning", "Commissioning checklist", "safety"),
        ],
      },
      {
        id: "software",
        stage: 2,
        title: "Software and changes",
        blurb: "Projects, download, online monitoring, backups and versions",
        lessons: [L("w-projects", "Projects, download and online monitoring", "sequence"), L("w-backups", "Backups, versions and change control", "safety")],
      },
    ],
  },
  {
    id: "machines",
    level: "P",
    code: "P3",
    name: "Machines and Sequences",
    blurb: "Star-delta, reversing, conveyors, sorting, bottling and step sequences.",
    ring: "#f26b1d",
    chapters: [
      {
        id: "starters",
        stage: 3,
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
        stage: 3,
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
        stage: 3,
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
    code: "P4",
    name: "Process Control and Drives",
    blurb: "Levels, pumps, analogue scaling and alarms, then variable speed drives and their faults.",
    ring: "#2457a6",
    chapters: [
      {
        id: "level",
        stage: 3,
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
        stage: 4,
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
    id: "platforms",
    level: "P",
    code: "PT",
    name: "Controller Platforms",
    blurb: "The same programs on Siemens, Allen Bradley, Schneider, Mitsubishi, Omron and Delta.",
    ring: "#0f766e",
    chapters: [
      {
        id: "tours",
        stage: 4,
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
  {
    id: "advanced",
    level: "E",
    code: "E5",
    name: "Advanced Programming",
    blurb: "Structured text, function blocks, networks, HMI, fault finding and handover.",
    ring: "#c2410c",
    chapters: [
      {
        id: "programming",
        stage: 5,
        title: "Programming",
        blurb: "Beyond ladder",
        lessons: [L("a-structured-text", "Structured text", "sequence"), L("a-function-blocks", "Function blocks", "sequence")],
      },
      {
        id: "systems",
        stage: 5,
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
];

export interface LessonPlace {
  ref: LessonRef;
  track: Track;
  chapter: Chapter;
  /** 1 based position within the track. */
  number: number;
  /** Track code plus number, e.g. F1.4. */
  code: string;
}

export const LESSON_ORDER: LessonPlace[] = CURRICULUM.flatMap((track) => {
  let n = 0;
  return track.chapters.flatMap((chapter) =>
    chapter.lessons.map((ref) => {
      n += 1;
      return { ref, track, chapter, number: n, code: `${track.code}.${n}` };
    }),
  );
});

export const placeOf = (id: string) => LESSON_ORDER.find((p) => p.ref.id === id);
