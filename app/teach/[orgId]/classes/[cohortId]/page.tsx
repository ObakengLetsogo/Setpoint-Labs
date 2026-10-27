import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { gradeAssignment } from "@/app/actions/teach";
import { cohorts } from "@/db/schema";
import { catalog } from "@/data/catalog";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { assignmentBoard, canManage } from "@/lib/server/orgs";
import { AssignmentForm } from "@/components/site/TeachForms";
import { SiteShell, Skeleton } from "@/components/site/SiteShell";

export const metadata = { title: "Class · Setpoint Labs", robots: { index: false } };

async function Board({ params }: { params: Promise<{ orgId: string; cohortId: string }> }) {
  const { orgId, cohortId } = await params;
  const user = await requireUser(`/teach/${orgId}/classes/${cohortId}`);
  if (!(await canManage(user, orgId))) notFound();
  const cohort = (await db.select().from(cohorts).where(and(eq(cohorts.id, cohortId), eq(cohorts.organisationId, orgId))).limit(1))[0];
  if (!cohort) notFound();
  const board = await assignmentBoard(cohortId);
  const lessons = catalog.filter((l) => !l.locked).map((l) => ({ id: l.id, label: `${l.chip} ${l.title}` }));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[#e4e6e9] bg-white p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#d9591a]"><Link href={`/teach/${orgId}`} className="hover:underline">Dashboard</Link> · class</p>
        <h1 className="mt-1 font-display text-[28px] font-bold text-ink">{cohort.name}</h1>
        <p className="mt-1 text-[13px] text-muted-ink">{board.members.length} learners · {board.assignments.length} assignments</p>
        <div className="mt-4"><AssignmentForm cohortId={cohortId} lessons={lessons} /></div>
      </div>

      {board.assignments.map((a) => (
        <section key={a.id} className="overflow-hidden rounded-2xl border border-[#e4e6e9] bg-white">
          <h2 className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#eef0f2] px-4 py-3 text-[14.5px] font-semibold text-ink">
            <span><span className="font-mono text-[12px] text-[#d9591a]">{a.chip}</span> {a.title}</span>
            <span className="font-mono text-[11px] font-normal text-muted-ink">
              {Object.values(a.status).filter((s) => s.completed).length} of {board.members.length} done{a.dueAt ? ` · due ${a.dueAt.toISOString().slice(0, 10)}` : ""}
            </span>
          </h2>
          <table className="w-full text-left">
            <tbody>
              {board.members.map((m) => {
                const s = a.status[m.id];
                return (
                  <tr key={m.id} className="border-t border-[#f1f2f4] first:border-t-0">
                    <td className="px-4 py-2 text-[13px] text-ink">{m.name}</td>
                    <td className="px-4 py-2 text-[12.5px]">
                      {s.completed ? <span className="text-[#1b6b4a]">completed{s.late ? ", late" : ""}</span> : <span className="text-muted-ink">not yet</span>}
                    </td>
                    <td className="px-4 py-2">
                      <form action={gradeAssignment} className="flex items-center gap-2">
                        <input type="hidden" name="assignmentId" value={a.id} />
                        <input type="hidden" name="userId" value={m.id} />
                        <input name="grade" type="number" min={0} max={100} defaultValue={s.grade ?? ""} placeholder="%" className="w-16 rounded-lg border border-[#dfe2e6] px-2 py-1 font-mono text-[12.5px]" aria-label={`Grade for ${m.name}`} />
                        <input name="feedback" defaultValue={s.feedback ?? ""} placeholder="Feedback" className="w-56 rounded-lg border border-[#dfe2e6] px-2 py-1 text-[12.5px]" aria-label={`Feedback for ${m.name}`} />
                        <button type="submit" className="rounded-lg bg-[#f3f4f5] px-2.5 py-1 text-[12px] font-medium text-ink">Save</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

export default function ClassPage({ params }: PageProps<"/teach/[orgId]/classes/[cohortId]">) {
  return (
    <SiteShell wide>
      <Suspense fallback={<Skeleton lines={6} />}>
        <Board params={params} />
      </Suspense>
    </SiteShell>
  );
}
