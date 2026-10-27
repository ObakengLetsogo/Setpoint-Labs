import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

/** A random 26 character id in Crockford base 32, 130 bits. */
export function newId() {
  const bytes = randomBytes(26);
  let out = "";
  for (const b of bytes) out += ALPHABET[b & 31];
  return out;
}

/** A url safe secret for links in emails and session cookies. */
export const newToken = () => randomBytes(32).toString("base64url");

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Short, readable certificate code like SPL-7K2M-QX4D, without 0/O or 1/I. */
export function certificateCode() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(8);
  const part = (o: number) => Array.from(bytes.subarray(o, o + 4), (b) => chars[b % chars.length]).join("");
  return `SPL-${part(0)}-${part(4)}`;
}
