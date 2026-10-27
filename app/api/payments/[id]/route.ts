import { and, eq } from "drizzle-orm";
import { payments } from "@/db/schema";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

/** The status of one of the signed in user's payments, for the confirming page to poll. */
export async function GET(_req: Request, ctx: RouteContext<"/api/payments/[id]">) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorised" }, { status: 401 });
  const rows = await db.select({ status: payments.status }).from(payments).where(and(eq(payments.id, id), eq(payments.userId, user.id))).limit(1);
  if (!rows[0]) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ status: rows[0].status }, { headers: { "Cache-Control": "no-store" } });
}
