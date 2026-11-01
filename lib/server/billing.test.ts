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
    bank: typeof import("@/data/exam-bank");
    endorse: typeof import("./endorsements");
    eBank: typeof import("@/data/exam-bank/endorsements");
    projects: typeof import("./projects");
    practical: typeof import("./practical");
    recert: typeof import("./recert");
    certs: typeof import("./certificates");
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
      bank: await import("@/data/exam-bank"),
      endorse: await import("./endorsements"),
      eBank: await import("@/data/exam-bank/endorsements"),
      projects: await import("./projects"),
      practical: await import("./practical"),
      recert: await import("./recert"),
      certs: await import("./certificates"),
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
        if (p.ref.startsWith("bank:")) return p.order.indexOf(m.bank.bankQuestion(p.ref)!.answer);
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

    it("the Professional certificate waits for a platform endorsement, which also brings the Mining endorsement", async () => {
      const u = await makeUser();
      const user = { ...u, name: "Sipho" };
      const certs = async () => (await m.db.db.select().from(m.schema.certificates).where(m.orm.eq(m.schema.certificates.userId, u.id))).map((c) => c.trackId).sort();
      await buyExam(u.id, "F");
      await passPractical(u.id, ["foundations", "wiring"]);
      const f = await m.exams.startExam(u.id, "F");
      await m.exams.submitExam(user, f, await correctAnswers(f));
      await buyExam(u.id, "P");
      await passPractical(u.id, ["machines", "process", "platforms", "safety-systems", "mining"]);
      const admin = await makeUser();
      const centre = await m.centres.createCentre({ name: "Durban Centre", area: "Berea", address: "3 Musgrave Rd", code: "DBN-2027" }, admin.id);
      const [slot] = await m.centres.sessionsAt(centre);
      const booking = await m.centres.bookSitting(u.id, "P", centre, slot.at);
      const atCentre = new Date(slot.at.getTime() + 5 * 60_000);
      const attempt = await m.centres.openSitting(u.id, booking, "DBN-2027", atCentre);
      const r = await m.exams.submitExam(user, attempt, await correctAnswers(attempt), atCentre);
      expect(r.passed).toBe(true);
      expect(await certs()).toEqual(["level-F"]);
      expect((await m.exams.examStatus(u.id, "P", atCentre)).waitingFor).toMatch(/platform endorsement/);

      // No Professional training yet: the endorsement exam cannot start.
      await m.billing.grant({ userId: u.id, organisationId: null, planId: "endorse-siemens", seats: 1, source: "payment" });
      await expect(m.endorse.startEndorsement(u.id, "siemens")).rejects.toThrow(/Professional training/);
      await m.billing.grant({ userId: u.id, organisationId: null, planId: "level-P", seats: 1, source: "payment" });
      const e = await m.endorse.startEndorsement(u.id, "siemens");
      const [row] = await m.db.db.select().from(m.schema.endorsementAttempts).where(m.orm.eq(m.schema.endorsementAttempts.id, e));
      const bank = m.eBank.ENDORSE_BANKS.siemens;
      const answers = (row.paper as { i: number; order: number[] }[]).map((p) => p.order.indexOf(bank[p.i].answer));
      const out = await m.endorse.submitEndorsement(user, e, answers);
      expect(out.passed).toBe(true);
      expect(await certs()).toEqual(["endorse-siemens", "level-F", "level-P", "mining"]);
      expect((await m.endorse.endorsementStatus(u.id, "siemens")).blocked).toBe("Already passed.");
    });

    it("the Expert certificate needs the exam, two endorsements and the signed-off project", async () => {
      const u = await makeUser();
      const user = { ...u, name: "Thandi" };
      const certs = async () => (await m.db.db.select().from(m.schema.certificates).where(m.orm.eq(m.schema.certificates.userId, u.id))).map((c) => c.trackId).sort();
      const admin = await makeUser();
      const centre = await m.centres.createCentre({ name: "Joburg Centre", area: "Braamfontein", address: "9 Jorissen St", code: "JHB-2027" }, admin.id);
      const sitAt = async (level: "P" | "E") => {
        const slots = await m.centres.sessionsAt(centre);
        const slot = slots[level === "P" ? 0 : 1];
        const booking = await m.centres.bookSitting(u.id, level, centre, slot.at);
        const at = new Date(slot.at.getTime() + 5 * 60_000);
        const attempt = await m.centres.openSitting(u.id, booking, "JHB-2027", at);
        return m.exams.submitExam(user, attempt, await correctAnswers(attempt), at);
      };
      const endorse = async (brand: string) => {
        await m.billing.grant({ userId: u.id, organisationId: null, planId: `endorse-${brand}`, seats: 1, source: "payment" });
        const e = await m.endorse.startEndorsement(u.id, brand);
        const [row] = await m.db.db.select().from(m.schema.endorsementAttempts).where(m.orm.eq(m.schema.endorsementAttempts.id, e));
        const bank = m.eBank.ENDORSE_BANKS[brand];
        return m.endorse.submitEndorsement(user, e, (row.paper as { i: number; order: number[] }[]).map((p) => p.order.indexOf(bank[p.i].answer)));
      };
      await m.billing.grant({ userId: u.id, organisationId: null, planId: "bundle", seats: 1, source: "payment" });
      await passPractical(u.id, ["foundations", "wiring", "machines", "process", "platforms", "safety-systems", "advanced", "plant"]);
      const f = await m.exams.startExam(u.id, "F");
      await m.exams.submitExam(user, f, await correctAnswers(f));
      await sitAt("P");
      await endorse("siemens");
      expect(await certs()).toEqual(["endorse-siemens", "level-F", "level-P"]);
      expect((await sitAt("E")).passed).toBe(true);
      expect(await certs()).not.toContain("level-E");
      const project = await m.projects.projectFor(u.id);
      expect(project).not.toBeNull();

      await expect(m.projects.submitProject(u.id, "st", "x := 1;", "too short")).rejects.toThrow(/200 characters/);
      const note = "The station runs two pumps on duty and standby, alternating on every new demand. Each pump is proved by its delivery flow switch: no flow for eight seconds trips it and the other pump takes over. High-high sounds the horn until acknowledged. I tested every case on the simulator.";
      const bad = await m.projects.submitProject(u.id, "st", "P1_Run := Start_PB;", note);
      expect(bad.passed).toBe(false);
      expect(await m.projects.projectsToReview()).toHaveLength(0);
      const { readFileSync } = await import("node:fs");
      const ref = /const REF = `([\s\S]*?)`;/.exec(readFileSync("lib/server/project.test.ts", "utf8"))![1];
      expect((await m.projects.submitProject(u.id, "st", ref, note)).passed).toBe(true);
      const assessor = await makeUser();
      const [row] = (await m.projects.projectsToReview()).filter((r) => r.p.userId === u.id);
      await expect(m.projects.decideProject(row.p.id, assessor.id, true, "Clear, well tested design.")).rejects.toThrow(/Book and hold/);
      await m.projects.scheduleInterview(row.p.id, assessor.id, new Date(Date.now() + 86_400_000), "https://meet.example/abc");
      await expect(m.projects.submitProject(u.id, "st", ref, note)).rejects.toThrow(/locked/);
      // Signed off, but only one endorsement yet: the certificate still waits.
      await m.projects.decideProject(row.p.id, assessor.id, true, "Clear, well tested design and a confident interview.");
      expect(await certs()).not.toContain("level-E");
      await endorse("rockwell");
      expect(await certs()).toContain("level-E");
    });

    it("a wrong endorsement paper fails and uses the attempt", async () => {
      const u = await makeUser();
      await m.billing.grant({ userId: u.id, organisationId: null, planId: "level-P", seats: 1, source: "payment" });
      await m.billing.grant({ userId: u.id, organisationId: null, planId: "endorse-omron", seats: 1, source: "payment" });
      const e = await m.endorse.startEndorsement(u.id, "omron");
      const out = await m.endorse.submitEndorsement({ ...u, name: "T" }, e, []);
      expect(out.passed).toBe(false);
      expect((await m.endorse.endorsementStatus(u.id, "omron")).blocked).toMatch(/Buy/);
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

    it("practical days need the stage finished and a seat; cancelling returns it until 7 days before", async () => {
      const P = m.practical;
      const u = await makeUser();
      const admin = await makeUser();
      const DAY = 86_400_000;
      const day = await P.createDay(admin.id, { title: "Day 1: Motor starters", stage: 1, startsAt: new Date(Date.now() + 30 * DAY), venue: "27 Boxes, Melville", capacity: 1 });
      const open = await P.createDay(admin.id, { title: "Open day", stage: null, startsAt: new Date(Date.now() + 3 * DAY), venue: "27 Boxes, Melville", capacity: 10 });
      await expect(P.bookDay(u, day)).rejects.toThrow(/Finish the Stage 1/);
      await expect(P.bookDay(u, open)).rejects.toThrow(/Buy a practical day seat/);
      for (const lessonId of P.stageLessons(1)) await m.db.db.insert(m.schema.progress).values({ userId: u.id, lessonId, status: "completed" });
      const { paymentId } = await m.billing.startCheckout(u, "practical-day");
      await deliver(paymentId, "paid");
      expect(await P.practicalCredits(u.id)).toBe(1);
      const b = await P.bookDay(u, day);
      expect(await P.practicalCredits(u.id)).toBe(0);
      // The day is now full for anyone else.
      const other = await makeUser();
      expect((await P.practicalFor(other.id)).days.find((d) => d.id === day)?.blocked).toBe("Full.");
      await expect(P.cancelBooking(u.id, b, new Date(Date.now() + 25 * DAY))).rejects.toThrow(/7 days/);
      await P.cancelBooking(u.id, b);
      expect(await P.practicalCredits(u.id)).toBe(1);
      // Rebook, then the facilitator marks it on the day.
      const b2 = await P.bookDay(u, day);
      await expect(P.markAttendance(admin.id, b2, true, true, "")).rejects.toThrow(/on the day/);
      await P.markAttendance(admin.id, b2, true, true, "Wired DOL starter unaided", new Date(Date.now() + 30 * DAY));
      expect((await P.practicalSignOffs(u.id)).map((r) => r.stage)).toEqual([1]);
    });

    it("level certificates expire after 3 years and a recertification exam renews them", async () => {
      const R = m.recert;
      const u = { ...(await makeUser()), name: "Recert Learner" };
      const code = await m.certs.issueCertificate(u, "level-F");
      const [cert] = await m.db.db.select().from(m.schema.certificates).where(m.orm.eq(m.schema.certificates.code, code));
      const DAY = 86_400_000;
      expect(Math.round((cert.expiresAt!.getTime() - cert.issuedAt.getTime()) / DAY)).toBeGreaterThanOrEqual(365 * 3);
      // Closed until 90 days before expiry.
      expect((await R.recertStatuses(u.id))[0].blocked).toMatch(/opens 90 days/);
      const ends = new Date(Math.floor((Date.now() + 60 * DAY) / 1000) * 1000);
      await m.db.db.update(m.schema.certificates).set({ expiresAt: ends }).where(m.orm.eq(m.schema.certificates.code, code));
      const soon = new Date();
      // Reminders: 90 days out once, then nothing new until 30 days.
      expect((await R.runExpiryReminders(soon)).sent).toBeGreaterThanOrEqual(1);
      const again = await R.runExpiryReminders(soon);
      const [c1] = await m.db.db.select().from(m.schema.certificates).where(m.orm.eq(m.schema.certificates.code, code));
      expect(c1.remindedDays).toBe(90);
      expect(again.sent).toBe(0);
      await expect(R.startRecert(u.id, "F", soon)).rejects.toThrow(/Buy the recertification/);
      const { paymentId } = await m.billing.startCheckout(u, "recert-F");
      await deliver(paymentId, "paid");
      // A wrong paper fails and uses the credit.
      const a1 = await R.startRecert(u.id, "F", soon);
      expect((await R.submitRecert(u, a1, [], soon)).passed).toBe(false);
      expect((await R.recertStatuses(u.id, soon))[0].credits).toBe(0);
      const p2 = await m.billing.startCheckout(u, "recert-F");
      await deliver(p2.paymentId, "paid");
      const a2 = await R.startRecert(u.id, "F", soon);
      const [row] = await m.db.db.select().from(m.schema.recertAttempts).where(m.orm.eq(m.schema.recertAttempts.id, a2));
      const right = (row.paper as { ref: string; order: number[] }[]).map((p) => p.order.indexOf(m.bank.bankQuestion(p.ref)!.answer));
      const r = await R.submitRecert(u, a2, right, soon);
      expect(r.passed).toBe(true);
      expect(r.expiresAt!.getUTCFullYear()).toBe(ends.getUTCFullYear() + 3);
      const [after] = await m.db.db.select().from(m.schema.certificates).where(m.orm.eq(m.schema.certificates.code, code));
      expect(after.remindedDays).toBeNull();
      expect((await R.recertStatuses(u.id, soon))[0].open).toBe(false);
    });

    it("employers give practical day seats, and a cancelled day returns the credit", async () => {
      const P = m.practical;
      const boss = await makeUser();
      const { paymentId } = await m.billing.startCheckout(boss, "corp-practical-day", 2, "Practical Co");
      await deliver(paymentId, "paid");
      const [mem] = await m.db.db.select().from(m.schema.memberships).where(m.orm.eq(m.schema.memberships.userId, boss.id));
      const staff = await makeUser();
      expect(await m.billing.assignSeat(mem.organisationId, staff.id, "practical")).toBe(true);
      expect(await P.practicalCredits(staff.id)).toBe(1);
      const day = await P.createDay(boss.id, { title: "Open day", stage: null, startsAt: new Date(Date.now() + 10 * 86_400_000), venue: "27 Boxes", capacity: 12 });
      await P.bookDay(staff, day);
      expect(await P.practicalCredits(staff.id)).toBe(0);
      await P.cancelDay(boss.id, day);
      expect(await P.practicalCredits(staff.id)).toBe(1);
    });
  });

  it("free lessons need no account", async () => {
    expect(await m.access.canOpenLesson(null, "foundations-1")).toBe(true);
    expect(await m.access.canOpenLesson(null, "f-ton")).toBe(false);
  });
});
