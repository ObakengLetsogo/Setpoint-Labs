import { receiveWebhook } from "@/lib/server/billing";
import { WebhookVerificationError } from "@/lib/server/payments/types";

/**
 * Payment provider webhooks, e.g. /api/webhooks/stitch. The raw body is verified before anything
 * is parsed; a bad signature gets 400 and a repeat delivery is acknowledged without effect.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/webhooks/[provider]">) {
  const { provider } = await ctx.params;
  if (provider === "dev" && process.env.NODE_ENV === "production" && process.env.PAYMENT_PROVIDER !== "dev") return new Response("not found", { status: 404 });
  const raw = await req.text();
  try {
    const r = await receiveWebhook(provider, raw, req.headers);
    return Response.json({ outcome: r.outcome }, { status: r.status });
  } catch (e) {
    if (e instanceof WebhookVerificationError) return Response.json({ error: e.message }, { status: 400 });
    console.error("webhook failed", e);
    // A 500 makes the provider retry later, which is what we want for a transient database error.
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
