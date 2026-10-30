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
    exams: typeof import("./exams");
    centres: typeof import("./centres");
    quizzes: typeof import("@/data/quizzes");
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
      exams: await import("./exams"),
      centres: await import("./centres"),
      quizzes: await import("@/data/quizzes"),
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
    const { paymentId } = await m.billing.startCheckout(u, "level-f");
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
    const { paymentId } = await m.billing.startCheckout(boss, "corp-f", 10, "Acme Mining");
    await deliver(paymentId, "paid");
    expect((await m.access.accessFor(boss.id)).via).toBe("organisation");
    const [mem] = await m.db.db.select().from(m.schema.memberships).where(m.orm.eq(m.schema.memberships.userId, boss.id));
    const staff = await makeUser();
    await m.db.db.insert(m.schema.memberships).values({ userId: staff.id, organisationId: mem.organisationId, role: "learner" });
    expect((await m.access.accessFor(staff.id)).paid).toBe(false);
    expect(await m.billing.assignSeat(mem.organisationId, staff.id)).toBe(true);
    expect((await m.access.accessFor(staff.id)).paid).toBe(true);
    const renewal = await m.billing.startCheckout(boss, "corp-f", 10);
    const [p] = await m.db.db.select().from(m.schema.payments).where(m.orm.eq(m.schema.payments.id, renewal.paymentId));
    expect(p.organisationId).toBe(mem.organisationId);
  });

  it("a level opens only its own lessons, and a second level starts now", async () => {
    const u = await makeUser();
    const f = await m.billing.startCheckout(u, "level-f");
    await deliver(f.paymentId, "paid");
    expect((await m.access.accessFor(u.id)).levels).toEqual(["F"]);
    expect(await m.access.canOpenLesson(u.id, "f-ton")).toBe(true);
    expect(await m.access.canOpenLesson(u.id, "m-lift")).toBe(false);
    const p = await m.billing.startCheckout(u, "level-p");
    await deliver(p.paymentId, "paid");
    expect((await m.access.accessFor(u.id)).levels).toEqual(["F", "P"]);
    expect(await m.access.canOpenLesson(u.id, "m-lift")).toBe(true);
    const ents = await m.db.db.select().from(m.schema.entitlements).where(m.orm.eq(m.schema.entitlements.userId, u.id)).orderBy(m.schema.entitlements.startsAt);
    expect(ents[1].startsAt.getTime()).toBeLessThan(ents[0].endsAt.getTime());
  });

  it("charges company seats with the volume discount", async () => {
    const boss = await makeUser();
    const { paymentId } = await m.billing.startCheckout(boss, "corp-f", 20, "Big Mine");
    const [p] = await m.db.db.select().from(m.schema.payments).where(m.orm.eq(m.schema.payments.id, paymentId));
    expect(p.amountCents).toBe(Math.round(750000 * 20 * 0.9));
  });

  it("company exam vouchers go to chosen staff, and training seats move between staff", async () => {
    const boss = await makeUser();
    const train = await m.billing.startCheckout(boss, "corp-f", 5, "Voucher Mine");
    await deliver(train.paymentId, "paid");
    const [mem] = await m.db.db.select().from(m.schema.memberships).where(m.orm.eq(m.schema.memberships.userId, boss.id));
    const ex = await m.billing.startCheckout(boss, "corp-exam-F", 3);
    const [pay] = await m.db.db.select().from(m.schema.payments).where(m.orm.eq(m.schema.payments.id, ex.paymentId));
    expect(pay.amountCents).toBe(120000 * 3);
    await deliver(ex.paymentId, "paid");
    expect((await m.exams.examStatus(boss.id, "F")).credits).toBe(0);

    const a = await makeUser();
    const b = await makeUser();
    for (const u of [a, b]) await m.db.db.insert(m.schema.memberships).values({ userId: u.id, organisationId: mem.organisationId, role: "learner" });
    expect(await m.billing.assignSeat(mem.organisationId, a.id)).toBe(true);
    expect((await m.access.accessFor(a.id)).levels).toEqual(["F"]);
    expect((await m.exams.examStatus(a.id, "F")).credits).toBe(0);
    expect(await m.billing.assignSeat(mem.organisationId, a.id, "F")).toBe(true);
    expect((await m.exams.examStatus(a.id, "F")).credits).toBe(1);

    expect(await m.billing.releaseSeat(mem.organisationId, a.id, boss.id)).toBe(true);
    expect((await m.access.accessFor(a.id)).paid).toBe(false);
    expect((await m.exams.examStatus(a.id, "F")).credits).toBe(1);
    expect(await m.billing.assignSeat(mem.organisationId, b.id)).toBe(true);
    expect((await m.access.accessFor(b.id)).levels).toEqual(["F"]);
  });

  describe("level exams", () => {
    const now = () => new Date();
    async function buyExam(userId: string, level: "F" | "P" | "E") {
      await m.billing.grant({ userId, organisationId: null, planId: `exam-${level}`, seats: 1, source: "payment" });
    }
    async function passPractical(userId: string, tracks: string[]) {
      for (const t of tracks) await m.db.db.insert(m.schema.assessmentRuns).values({ id: m.ids.newId(), userId, assessmentId: t, source: "x", language: "ladder", passed: true, results: [] });
    }
    async function correctAnswers(attemptId: string) {
      const [a] = await m.db.db.select().from(m.schema.examAttempts).where(m.orm.eq(m.schema.examAttempts.id, attemptId));
      return (a.paper as { ref: string; order: number[] }[]).map((p) => {
        const [lesson, i] = p.ref.split(":");
        return p.order.indexOf(m.quizzes.QUIZZES[lesson][Number(i)].answer);
      });
    }

    it("draws enough questions for every level", () => {
      for (const l of ["F", "P", "E"] as const) expect(m.exams.questionBank(l).length).toBeGreaterThanOrEqual(m.exams.EXAM_SPEC[l].questions);
    });

    it("needs a credit, does not open training, and issues a certificate on a pass", async () => {
      const u = await makeUser();
      const user = { ...u, name: "Thandi" };
      expect((await m.exams.examStatus(u.id, "F")).blocked).toMatch(/Buy this exam/);
      await buyExam(u.id, "F");
      expect((await m.access.accessFor(u.id)).paid).toBe(false);
      await passPractical(u.id, ["foundations", "wiring"]);
      const id = await m.exams.startExam(u.id, "F");
      const learner = await m.exams.attemptForLearner(u.id, id);
      expect(learner!.questions).toHaveLength(40);
      expect(JSON.stringify(learner)).not.toContain('"answer"');
      const r = await m.exams.submitExam(user, id, await correctAnswers(id));
      expect(r).toMatchObject({ theoryPct: 100, practical: true, passed: true });
      const certs = await m.db.db.select().from(m.schema.certificates).where(m.orm.eq(m.schema.certificates.userId, u.id));
      expect(certs.map((c) => c.trackId)).toContain("level-F");
      await expect(m.exams.startExam(u.id, "F")).rejects.toThrow(/Already passed/);
    });

    it("fails without the practical, then gives one free resit after 14 days", async () => {
      const u = await makeUser();
      const user = { ...u, name: "Sipho" };
      await buyExam(u.id, "F");
      const id = await m.exams.startExam(u.id, "F");
      const r = await m.exams.submitExam(user, id, await correctAnswers(id));
      expect(r).toMatchObject({ theoryPct: 100, practical: false, passed: false });
      const st = await m.exams.examStatus(u.id, "F");
      expect(st.canStart).toBe(false);
      const later = new Date(Date.now() + 15 * 86_400_000);
      expect((await m.exams.examStatus(u.id, "F", later)).canStart).toBe(true);
      const id2 = await m.exams.startExam(u.id, "F", later);
      await m.exams.submitExam(user, id2, [], new Date(later.getTime() + 1000));
      expect((await m.exams.examStatus(u.id, "F", new Date(later.getTime() + 30 * 86_400_000))).canStart).toBe(false);
    });

    it("keeps the levels in order and ignores answers sent after the deadline", async () => {
      const u = await makeUser();
      await buyExam(u.id, "P");
      expect((await m.exams.examStatus(u.id, "P")).blocked).toMatch(/Foundation exam first/);
      await buyExam(u.id, "F");
      await passPractical(u.id, ["foundations", "wiring"]);
      const id = await m.exams.startExam(u.id, "F");
      const r = await m.exams.submitExam({ ...u, name: "Late" }, id, await correctAnswers(id), new Date(now().getTime() + 63 * 60_000));
      expect(r).toMatchObject({ late: true, theoryPct: 0, passed: false });
    });
    it("professional exams are booked at a centre and opened only with the invigilator code", async () => {
      const u = await makeUser();
      const user = { ...u, name: "Lerato" };
      await buyExam(u.id, "F");
      await passPractical(u.id, ["foundations", "wiring"]);
      const f = await m.exams.startExam(u.id, "F");
      await m.exams.submitExam(user, f, await correctAnswers(f));
      await buyExam(u.id, "P");
      await expect(m.exams.startExam(u.id, "P")).rejects.toThrow(/exam centre/);

      const admin = await makeUser();
      const centre = await m.centres.createCentre({ name: "Village Tech", area: "Marshalltown", address: "1 Main St", code: "INV-2027" }, admin.id);
      const [slot] = await m.centres.sessionsAt(centre);
      const booking = await m.centres.bookSitting(u.id, "P", centre, slot.at);
      await expect(m.centres.bookSitting(u.id, "P", centre, slot.at)).rejects.toThrow(/already have a sitting/);
      await expect(m.centres.openSitting(u.id, booking, "INV-2027")).rejects.toThrow(/only be opened at the centre/);
      const atCentre = new Date(slot.at.getTime() + 5 * 60_000);
      await expect(m.centres.openSitting(u.id, booking, "wrong", atCentre)).rejects.toThrow(/not right/);
      const attempt = await m.centres.openSitting(u.id, booking, "INV-2027", atCentre);
      expect((await m.exams.attemptForLearner(u.id, attempt))!.atCentre).toBe(true);
      await m.exams.logIncident(u.id, attempt, "left full screen", atCentre);
      const [row] = await m.db.db.select().from(m.schema.examAttempts).where(m.orm.eq(m.schema.examAttempts.id, attempt));
      expect(row.incidents).toHaveLength(1);
    });

    it("a missed sitting uses the credit, and changes close 48 hours before", async () => {
      const u = await makeUser();
      const admin = await makeUser();
      await buyExam(u.id, "F");
      const centre = await m.centres.createCentre({ name: "Randburg Test Centre", area: "Randburg", address: "2 Oak Ave", code: "RAND-2027" }, admin.id);
      const slots = await m.centres.sessionsAt(centre);
      const late = slots.find((x) => x.at.getTime() - Date.now() > 3 * 86_400_000)!;
      const b = await m.centres.bookSitting(u.id, "F", centre, late.at);
      await expect(m.centres.cancelSitting(u.id, b, new Date(late.at.getTime() - 86_400_000))).rejects.toThrow(/48 hours/);
      const after = new Date(late.at.getTime() + 3 * 3_600_000);
      expect((await m.exams.examStatus(u.id, "F", after)).credits).toBe(0);
    });
  });

  it("free lessons need no account", async () => {
    expect(await m.access.canOpenLesson(null, "foundations-1")).toBe(true);
    expect(await m.access.canOpenLesson(null, "f-ton")).toBe(false);
  });
});
