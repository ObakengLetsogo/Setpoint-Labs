import { CURRICULUM } from "@/data/curriculum";
import { currentUser } from "@/lib/server/auth";
import { canManage, csvCell, learners } from "@/lib/server/orgs";

/** The learner table as CSV, for reports. */
export async function GET(_req: Request, ctx: RouteContext<"/api/teach/[orgId]/learners">) {
  const { orgId } = await ctx.params;
  const user = await currentUser();
  if (!user || !(await canManage(user, orgId))) return new Response("forbidden", { status: 403 });
  const rows = await learners(orgId);
  const tracks = (ids: string[]) => ids.map((id) => CURRICULUM.find((t) => t.id === id)?.name ?? id).join("; ");
  const csv = [
    ["Name", "Email", "Role", "Seat", "Classes", "Lessons completed", "Quiz average %", "Certificates", "Last active"],
    ...rows.map((r) => [r.name, r.email, r.role, r.seated ? "yes" : "no", r.cohorts.join("; "), r.completed, r.quizAvg ?? "", tracks(r.certificates), r.lastActive ? r.lastActive.toISOString().slice(0, 10) : ""]),
  ]
    .map((line) => line.map(csvCell).join(","))
    .join("\r\n");
  return new Response(`﻿${csv}\r\n`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="learners-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" },
  });
}
