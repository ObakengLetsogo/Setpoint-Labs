// Seeds plans, the course structure and, if ADMIN_EMAIL and ADMIN_PASSWORD are set, a platform admin.
// Idempotent: run it after every migration.
import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as s from "../../db/schema";
import { PLANS } from "../../config/plans";
import { CURRICULUM } from "../../data/curriculum";
import { FREE_CHAPTERS } from "../../data/access";
import { RIGS } from "../../rigs";
import { newId } from "../../lib/server/ids";

const url = process.env.DATABASE_URL ?? "mysql://setpoint:devpass@localhost:3306/setpoint";
const conn = await mysql.createConnection({ uri: url });
const db = drizzle(conn, { schema: s, mode: "default" });

for (const p of PLANS) {
  const row = { id: p.id, name: p.name, audience: p.audience, priceCents: p.priceCents, periodMonths: p.periodMonths, perSeat: p.perSeat, minSeats: p.minSeats, active: true };
  await db.insert(s.plans).values(row).onDuplicateKeyUpdate({ set: row });
}

for (const [ti, t] of CURRICULUM.entries()) {
  await db.insert(s.tracks).values({ id: t.id, code: t.code, name: t.name, position: ti }).onDuplicateKeyUpdate({ set: { code: t.code, name: t.name, position: ti } });
  for (const [ci, c] of t.chapters.entries()) {
    const ch = { trackId: t.id, title: c.title, position: ci, free: FREE_CHAPTERS.has(c.id) };
    await db.insert(s.chapters).values({ id: c.id, ...ch }).onDuplicateKeyUpdate({ set: ch });
    for (const [li, l] of c.lessons.entries()) {
      const row = { chapterId: c.id, rigId: l.rig, title: l.title, position: li };
      await db.insert(s.lessons).values({ id: l.id, ...row }).onDuplicateKeyUpdate({ set: row });
    }
  }
}

for (const r of Object.values(RIGS)) if (r) await db.insert(s.rigs).values({ id: r.id, name: r.name }).onDuplicateKeyUpdate({ set: { name: r.name } });

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await db.select().from(s.users).where(eq(s.users.email, email));
  if (existing.length) await db.update(s.users).set({ role: "platform_admin" }).where(eq(s.users.email, email));
  else await db.insert(s.users).values({ id: newId(), email, name: "Admin", passwordHash: await hash(ADMIN_PASSWORD), role: "platform_admin", emailVerifiedAt: new Date() });
  console.log(`admin ready: ${email}`);
}

console.log("seed done");
await conn.end();
