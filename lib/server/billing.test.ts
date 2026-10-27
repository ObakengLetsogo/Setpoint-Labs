// Integration tests against a real MySQL database. Set TEST_DATABASE_URL to run them, e.g.
// TEST_DATABASE_URL=mysql://setpoint:devpass@localhost:3306/setpoint_test
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("billing and access", () => {
  let m: {
    billing: typeof import("./billing");
    access: typeof import("./access");
    db: typeof import("./db");
    schema: typeof import("@/db/schema");
    svix: typeof import("./payments/svix");
    dev: typeof import("./payments/dev");
    orm: typeof import("drizzle-orm");
    ids: typeof import("./ids");
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.PAYMENT_PROVIDER = "dev";
    const mysql = (await import("mysql2/promise")).default;
    const { drizzle } = await import("drizzle-orm/mysql2");
    const { migrate } = await import("drizzle-orm/mysql2/migrator");
    const conn = await mysql.createConnection({ uri: url!, multipleStatements: true });
    const [tables] = await conn.query("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()");
    for (const { t } of tables as { t: string }[]) await conn.query(`DROP TABLE \`${t}\``);
    await migrate(drizzle(conn), { migrationsFolder: "./db/migrations" });
    await conn.end();
    m = {
      billing: await import("./billing"),
      access: await import("./access"),
      db: await import("./db"),
      schema: await import("@/db/schema"),
      svix: await import("./payments/svix"),
      dev: await import("./payments/dev"),
      orm: await import("drizzle-orm"),
      ids: await import("./ids"),
    };
  });

  async function makeUser(verified = true) {
    const id = m.ids.newId();
    await m.db.db.insert(m.schema.users).values({ id, email: `${id}@test.local`, name: "Test", passwordHash: "x", emailVerifiedAt: verified ? new Date() : null });
    return { id, email: `${id}@test.local`, verified };
  }

  async function deliver(paymentId: string, status: string, eventId = m.ids.newId()) {
    const body = JSON.stringify({ paymentId, status });
    const headers = new Headers(m.svix.signSvix(m.dev.DEV_WEBHOOK_SECRET, eventId, body));
    return m.billing.receiveWebhook("dev", body, headers);
  }

  it("refuses checkout before the email is confirmed", async () => {
    const u = await makeUser(false);
    await expect(m.billing.startCheckout(u, "learner-month")).rejects.toThrow(/Confirm your email/);
  });

  it("grants access only from a verified webhook, once", async () => {
    const u = await makeUser();
    const { paymentId, redirectUrl } = await m.billing.startCheckout(u, "learner-month");
    expect(redirectUrl).toContain(`/dev/pay/${paymentId}`);
    expect((await m.access.accessFor(u.id)).paid).toBe(false);

    const eventId = "evt_1";
    expect((await deliver(paymentId, "paid", eventId)).outcome).toBe("updated");
    expect((await deliver(paymentId, "paid", eventId)).outcome).toBe("duplicate");
    const a = await m.access.accessFor(u.id);
    expect(a.paid).toBe(true);
    expect(await m.access.canOpenLesson(u.id, "m-lift")).toBe(true);
    const ents = await m.db.db.select().from(m.schema.entitlements).where(m.orm.eq(m.schema.entitlements.userId, u.id));
    expect(ents).toHaveLength(1);
  });

  it("rejects a forged webhook", async () => {
    const body = JSON.stringify({ paymentId: "x", status: "paid" });
    const headers = new Headers(m.svix.signSvix("whsec_" + Buffer.from("wrong").toString("base64"), "evt_forged", body));
    await expect(m.billing.receiveWebhook("dev", body, headers)).rejects.toThrow(/bad signature/);
  });

  it("stacks a renewal on the end of current access", async () => {
    const u = await makeUser();
    const first = await m.billing.startCheckout(u, "learner-month");
    await deliver(first.paymentId, "paid");
    const second = await m.billing.startCheckout(u, "learner-month");
    await deliver(second.paymentId, "paid");
    const ents = await m.db.db.select().from(m.schema.entitlements).where(m.orm.eq(m.schema.entitlements.userId, u.id)).orderBy(m.schema.entitlements.startsAt);
    expect(ents).toHaveLength(2);
    expect(ents[1].startsAt.getTime()).toBe(ents[0].endsAt.getTime());
  });

  it("a failed payment grants nothing", async () => {
    const u = await makeUser();
    const { paymentId } = await m.billing.startCheckout(u, "learner-year");
    await deliver(paymentId, "failed");
    expect((await m.access.accessFor(u.id)).paid).toBe(false);
    const p = await m.db.db.select().from(m.schema.payments).where(m.orm.eq(m.schema.payments.id, paymentId));
    expect(p[0].status).toBe("failed");
  });

  it("keeps access through the grace days, then locks", async () => {
    const u = await makeUser();
    const { paymentId } = await m.billing.startCheckout(u, "learner-month");
    await deliver(paymentId, "paid");
    const [e] = await m.db.db.select().from(m.schema.entitlements).where(m.orm.eq(m.schema.entitlements.userId, u.id));
    const day = 86_400_000;
    const inGrace = await m.access.accessFor(u.id, new Date(e.endsAt.getTime() + day));
    expect(inGrace.paid && inGrace.inGrace).toBe(true);
    expect((await m.access.accessFor(u.id, new Date(e.endsAt.getTime() + 4 * day))).paid).toBe(false);
  });

  it("employer seats give the buyer and assigned staff access, and renewals reuse the organisation", async () => {
    const boss = await makeUser();
    const { paymentId } = await m.billing.startCheckout(boss, "employer-seat-year", 10, "Acme Mining");
    await deliver(paymentId, "paid");
    expect((await m.access.accessFor(boss.id)).via).toBe("organisation");
    const [mem] = await m.db.db.select().from(m.schema.memberships).where(m.orm.eq(m.schema.memberships.userId, boss.id));
    const staff = await makeUser();
    await m.db.db.insert(m.schema.memberships).values({ userId: staff.id, organisationId: mem.organisationId, role: "learner" });
    expect((await m.access.accessFor(staff.id)).paid).toBe(false);
    expect(await m.billing.assignSeat(mem.organisationId, staff.id)).toBe(true);
    expect((await m.access.accessFor(staff.id)).paid).toBe(true);
    const renewal = await m.billing.startCheckout(boss, "employer-seat-year", 10);
    const [p] = await m.db.db.select().from(m.schema.payments).where(m.orm.eq(m.schema.payments.id, renewal.paymentId));
    expect(p.organisationId).toBe(mem.organisationId);
  });

  it("free lessons need no account", async () => {
    expect(await m.access.canOpenLesson(null, "foundations-1")).toBe(true);
    expect(await m.access.canOpenLesson(null, "f-ton")).toBe(false);
  });
});
