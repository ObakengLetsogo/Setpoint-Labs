"use client";

import { lessons } from "@/data/lessons";
import type { LessonIcon } from "@/data/types";
import { useSim } from "@/store/sim";
import { IconCheck } from "@/components/ui/icons";

export const LESSON_RENDER: Record<LessonIcon, string> = {
  contacts: "pushbuttons",
  seal: "contactor",
  overload: "overload",
  interlock: "contactor",
  reverse: "motor",
  timer: "plc",
  stardelta: "motor",
  counter: "plc",
  compare: "plc",
  edge: "plc",
  tank: "terminals",
  conveyor: "motor",
  latch: "contactor",
  lamp: "pushbuttons",
  safety: "estop",
  estop: "estop",
  jog: "pushbuttons",
  sequence: "plc",
  fault: "breaker",
};

type Status = "done" | "runs" | "built" | "planned";

const STATUS_LABEL: Record<Status, string> = {
  done: "done by you",
  runs: "runs on the sim",
  built: "built, not run",
  planned: "planned",
};

function StatusDot({ status }: { status: Status }) {
  if (status === "done")
    return (
      <span className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-run text-white ring-2 ring-white">
        <IconCheck size={10} strokeWidth={3} />
      </span>
    );
  if (status === "runs") return <span className="block h-[14px] w-[14px] rounded-full border-[3px] border-run bg-white ring-2 ring-white" />;
  if (status === "built") return <span className="block h-[14px] w-[14px] rounded-full border-[3px] border-[#e08a3c] bg-white ring-2 ring-white" />;
  return <span className="block h-[14px] w-[14px] rounded-full border-[1.5px] border-dashed border-[#a9afb6] bg-white ring-2 ring-white" />;
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10.5px] text-[#5b6068]">
      {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <StatusDot status={s} />
          {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

interface Node {
  id: string;
  code: string;
  title: string;
  icon: string;
  status: Status;
  open: boolean;
}

function Group({
  name,
  blurb,
  ring,
  nodes,
  activeId,
  onOpen,
}: {
  name: string;
  blurb: string;
  ring: string;
  nodes: Node[];
  activeId: string;
  onOpen: (id: string) => void;
}) {
  const working = nodes.filter((n) => n.status === "done" || n.status === "runs").length;
  const built = nodes.filter((n) => n.status !== "planned").length;
  const pct = built ? working / nodes.length : 0;
  const r = 19;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid gap-4 overflow-hidden rounded-2xl border border-[#e4e6e9] bg-white p-4 pl-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: ring }} />
      <div className="flex items-center gap-3">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
            <circle cx="22" cy="22" r={r} fill="none" stroke="#eceef0" strokeWidth="4" />
            <circle cx="22" cy="22" r={r} fill="none" stroke={ring} strokeWidth="4" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/parts/${nodes[0]?.icon ?? "plc"}.png`} alt="" width={26} height={26} className="h-[26px] w-[26px] object-contain" />
        </span>
        <div>
          <p className="font-display text-[17px] font-bold uppercase leading-none tracking-[0.06em] text-ink">{name}</p>
          <p className="mt-1 text-[12px] text-[#5b6068]">{blurb}</p>
          <p className="mt-1.5 font-mono text-[11px] text-muted-ink">
            <span className="font-display text-[17px] font-bold text-ink">{working}</span>/{nodes.length} working
          </p>
        </div>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2 pr-2 pt-1.5">
        {nodes.map((n) => {
          const active = n.id === activeId;
          return (
            <button
              key={n.id}
              type="button"
              disabled={!n.open}
              onClick={() => onOpen(n.id)}
              className="group flex w-[74px] shrink-0 flex-col items-center gap-1 disabled:cursor-default"
              title={`${n.code} ${n.title} · ${STATUS_LABEL[n.status]}`}
            >
              <span
                className={`relative flex h-[58px] w-[58px] items-center justify-center rounded-[14px] transition ${
                  n.status === "planned"
                    ? "border-[1.5px] border-dashed border-[#c5cad0] bg-[#fafbfb]"
                    : active
                      ? "border-2 border-run bg-[#e8f5ef] shadow-[0_0_0_3px_rgba(31,157,107,0.15)]"
                      : "border border-[#d9dde1] bg-[#f3f5f6] group-hover:-translate-y-0.5 group-hover:border-[#b9c0c7]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/parts/${n.icon}.png`} alt="" width={44} height={44} className={`h-11 w-11 object-contain ${n.status === "planned" ? "opacity-45 grayscale" : ""}`} />
                <span className="absolute -bottom-1.5 -right-1.5">
                  <StatusDot status={n.status} />
                </span>
              </span>
              <span className={`font-mono text-[10.5px] font-bold ${n.status === "planned" ? "text-muted-ink" : "text-[#d9591a]"}`}>{n.code}</span>
              <span className={`text-center text-[11px] leading-[1.25] ${n.status === "planned" ? "text-muted-ink" : "font-medium text-ink"}`}>{n.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const LATER: { name: string; blurb: string; ring: string; prefix: string; items: [string, string][] }[] = [
  {
    name: "Process control",
    blurb: "Level, flow, pumps and analog scaling",
    ring: "#2457a6",
    prefix: "P",
    items: [
      ["Tank level", "terminals"],
      ["Duplex pumps", "motor"],
      ["Analog scaling", "plc"],
      ["Alarms", "pushbuttons"],
      ["Motor protection and VSD", "overload"],
    ],
  },
  {
    name: "Wiring and commissioning",
    blurb: "Schematics, terminals, loop checks",
    ring: "#8a5cc2",
    prefix: "W",
    items: [
      ["Read a schematic", "terminals"],
      ["Terminal numbering", "terminals"],
      ["Continuity test", "breaker"],
      ["I/O loop check", "plc"],
      ["Commissioning sheet", "contactor"],
    ],
  },
];

export function LabTrack({ onOpen }: { onOpen: (id: string) => void }) {
  const completed = useSim((s) => s.completed);
  const ran = useSim((s) => s.ranLessons);
  const lessonId = useSim((s) => s.lessonId);

  const foundations: Node[] = lessons.map((l) => ({
    id: l.id,
    code: `F${l.number}`,
    title: l.title,
    icon: LESSON_RENDER[l.icon],
    open: !l.locked,
    status: l.locked ? "planned" : completed[l.id] ? "done" : ran[l.id] ? "runs" : "built",
  }));

  return (
    <section id="labs" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-[22px] font-bold uppercase tracking-[0.08em] text-ink">All labs</h2>
        <StatusLegend />
      </div>
      <Group name="Foundations" blurb="Contacts, seal-in, protection, timers" ring="#1f9d6b" nodes={foundations} activeId={lessonId} onOpen={onOpen} />
      {LATER.map((g) => (
        <Group
          key={g.name}
          name={g.name}
          blurb={g.blurb}
          ring={g.ring}
          activeId={lessonId}
          onOpen={onOpen}
          nodes={g.items.map(([title, icon], i) => ({ id: `${g.prefix}${i + 1}`, code: `${g.prefix}${i + 1}`, title, icon, open: false, status: "planned" }))}
        />
      ))}
    </section>
  );
}
