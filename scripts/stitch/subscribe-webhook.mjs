// Registers the payment webhook with Stitch and prints the signing secret to put in
// STITCH_WEBHOOK_SECRET. Run once per environment:
//   STITCH_CLIENT_ID=... STITCH_CLIENT_SECRET=... APP_URL=https://setpointlabs.co.za node scripts/stitch/subscribe-webhook.mjs
// Check the mutation against the current Stitch docs (Webhooks, Using Webhooks) before running.
const TOKEN_URL = "https://secure.stitch.money/connect/token";
const { STITCH_CLIENT_ID, STITCH_CLIENT_SECRET, APP_URL } = process.env;
if (!STITCH_CLIENT_ID || !STITCH_CLIENT_SECRET || !APP_URL) throw new Error("Set STITCH_CLIENT_ID, STITCH_CLIENT_SECRET and APP_URL");

const tok = await fetch(TOKEN_URL, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "client_credentials", client_id: STITCH_CLIENT_ID, client_secret: STITCH_CLIENT_SECRET, scope: "client_webhook_manage", audience: TOKEN_URL }),
}).then((r) => r.json());

const res = await fetch("https://api.stitch.money/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok.access_token}` },
  body: JSON.stringify({
    query: `mutation AddWebhook($url: URL!, $filterTypes: [String!]) { clientWebhookAdd(input: { url: $url, filterTypes: $filterTypes }) { url secret } }`,
    variables: { url: `${APP_URL.replace(/\/$/, "")}/api/webhooks/stitch`, filterTypes: ["payment"] },
  }),
}).then((r) => r.json());

console.log(JSON.stringify(res, null, 2));
console.log("\nPut the returned secret (whsec_...) in STITCH_WEBHOOK_SECRET in /etc/setpoint/env, then reload the app.");
