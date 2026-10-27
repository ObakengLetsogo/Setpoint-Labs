import { timingSafeEqual } from "node:crypto";
import { runRenewals } from "@/lib/server/renewals";

/** Called once a day by cron on the server: curl -X POST -H "Authorization: Bearer $CRON_SECRET" .../api/jobs/renewals */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return new Response("forbidden", { status: 403 });
  return Response.json(await runRenewals());
}
