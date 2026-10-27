import { createHmac, timingSafeEqual } from "node:crypto";
import { WebhookVerificationError } from "./types";

const TOLERANCE_S = 5 * 60;

/**
 * Verifies a Svix signed webhook, the scheme Stitch delivers with: HMAC-SHA256 over
 * "<svix-id>.<svix-timestamp>.<raw body>", keyed with the base64 part of the whsec_ secret,
 * compared with each "v1,<signature>" entry in the svix-signature header.
 */
export function verifySvix(secret: string, rawBody: string, headers: Headers, now = Date.now()) {
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sig = headers.get("svix-signature");
  if (!id || !ts || !sig) throw new WebhookVerificationError("missing svix headers");
  const age = Math.abs(now / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > TOLERANCE_S) throw new WebhookVerificationError("timestamp outside tolerance");
  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest();
  const ok = sig.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!ok) throw new WebhookVerificationError("bad signature");
  return id;
}

/** Signs a body the way Svix does; used by the dev simulator and the tests. */
export function signSvix(secret: string, id: string, rawBody: string, ts = Math.floor(Date.now() / 1000)) {
  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const signature = createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${signature}` };
}
