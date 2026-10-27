import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";

/** For uptime monitors and the deploy script: 200 when the app and its database answer. */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
