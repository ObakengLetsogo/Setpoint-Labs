// MySQL 8.4 schema. InnoDB and utf8mb4 throughout; money in cents; ids are random 26 character
// strings so they can be made before an insert and never leak a row count.

import { sql } from "drizzle-orm";
import { boolean, char, datetime, index, int, json, mysqlEnum, mysqlTable, primaryKey, text, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

const id = () => char("id", { length: 26 }).primaryKey();
const ref = (name: string) => char(name, { length: 26 });
const created = () => datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);
const at = (name: string) => datetime(name);

export const ROLES = ["learner", "teacher", "employer_admin", "institution_admin", "platform_admin"] as const;

// ── People and access ───────────────────────────────────────────────────────

export const users = mysqlTable(
  "users",
  {
    id: id(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    googleId: varchar("google_id", { length: 64 }),
    emailVerifiedAt: at("email_verified_at"),
    role: mysqlEnum("role", ROLES).notNull().default("learner"),
    platform: varchar("platform", { length: 16 }).notNull().default("iec"),
    createdAt: created(),
  },
  (t) => [uniqueIndex("users_email").on(t.email), uniqueIndex("users_google").on(t.googleId)],
);

export const sessions = mysqlTable(
  "sessions",
  {
    /** sha256 of the cookie token, so a database leak cannot be replayed. */
    id: char("id", { length: 64 }).primaryKey(),
    userId: ref("user_id").notNull(),
    expiresAt: datetime("expires_at").notNull(),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: created(),
  },
  (t) => [index("sessions_user").on(t.userId)],
);

export const emailVerifications = mysqlTable("email_verifications", {
  tokenHash: char("token_hash", { length: 64 }).primaryKey(),
  userId: ref("user_id").notNull(),
  expiresAt: datetime("expires_at").notNull(),
  usedAt: at("used_at"),
  createdAt: created(),
});

export const passwordResets = mysqlTable("password_resets", {
  tokenHash: char("token_hash", { length: 64 }).primaryKey(),
  userId: ref("user_id").notNull(),
  expiresAt: datetime("expires_at").notNull(),
  usedAt: at("used_at"),
  createdAt: created(),
});

export const organisations = mysqlTable("organisations", {
  id: id(),
  name: varchar("name", { length: 160 }).notNull(),
  kind: mysqlEnum("kind", ["employer", "institution"]).notNull(),
  /** Locks every cohort member to one controller family, e.g. "siemens". */
  platformLock: varchar("platform_lock", { length: 16 }),
  /** Shown on white label certificates. */
  certificateName: varchar("certificate_name", { length: 160 }),
  createdAt: created(),
});

export const memberships = mysqlTable(
  "memberships",
  {
    userId: ref("user_id").notNull(),
    organisationId: ref("organisation_id").notNull(),
    role: mysqlEnum("role", ROLES).notNull().default("learner"),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.organisationId] }), index("memberships_org").on(t.organisationId)],
);

export const seats = mysqlTable(
  "seats",
  {
    id: id(),
    organisationId: ref("organisation_id").notNull(),
    entitlementId: ref("entitlement_id").notNull(),
    userId: ref("user_id"),
    assignedAt: at("assigned_at"),
  },
  (t) => [index("seats_org").on(t.organisationId), index("seats_user").on(t.userId)],
);

// ── Plans, payments and entitlements ────────────────────────────────────────

export const plans = mysqlTable("plans", {
  id: varchar("id", { length: 40 }).primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  audience: mysqlEnum("audience", ["learner", "employer", "institution"]).notNull(),
  priceCents: int("price_cents").notNull(),
  /** Months of access one payment buys; 0 for a manually priced plan. */
  periodMonths: int("period_months").notNull(),
  perSeat: boolean("per_seat").notNull().default(false),
  minSeats: int("min_seats").notNull().default(1),
  active: boolean("active").notNull().default(true),
});

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: id(),
    userId: ref("user_id"),
    organisationId: ref("organisation_id"),
    planId: varchar("plan_id", { length: 40 }).notNull(),
    status: mysqlEnum("status", ["active", "past_due", "cancelled"]).notNull().default("active"),
    currentPeriodEnd: datetime("current_period_end").notNull(),
    renewalReminderAt: at("renewal_reminder_at"),
    createdAt: created(),
  },
  (t) => [index("subscriptions_user").on(t.userId), index("subscriptions_org").on(t.organisationId)],
);

export const payments = mysqlTable(
  "payments",
  {
    id: id(),
    userId: ref("user_id").notNull(),
    organisationId: ref("organisation_id"),
    planId: varchar("plan_id", { length: 40 }).notNull(),
    seats: int("seats").notNull().default(1),
    provider: varchar("provider", { length: 20 }).notNull(),
    providerPaymentId: varchar("provider_payment_id", { length: 191 }),
    amountCents: int("amount_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("ZAR"),
    status: mysqlEnum("status", ["pending", "paid", "failed", "cancelled", "expired"]).notNull().default("pending"),
    rawPayload: json("raw_payload"),
    paidAt: at("paid_at"),
    createdAt: created(),
  },
  (t) => [uniqueIndex("payments_provider_id").on(t.provider, t.providerPaymentId), index("payments_user").on(t.userId)],
);

export const paymentEvents = mysqlTable("payment_events", {
  /** The provider's message id; a repeat delivery hits this key and is ignored. */
  id: varchar("id", { length: 191 }).primaryKey(),
  provider: varchar("provider", { length: 20 }).notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  paymentId: ref("payment_id"),
  payload: json("payload").notNull(),
  receivedAt: created(),
});

export const entitlements = mysqlTable(
  "entitlements",
  {
    id: id(),
    userId: ref("user_id"),
    organisationId: ref("organisation_id"),
    planId: varchar("plan_id", { length: 40 }).notNull(),
    seats: int("seats").notNull().default(1),
    startsAt: datetime("starts_at").notNull(),
    endsAt: datetime("ends_at").notNull(),
    status: mysqlEnum("status", ["active", "revoked"]).notNull().default("active"),
    source: mysqlEnum("source", ["payment", "invoice", "admin"]).notNull(),
    note: varchar("note", { length: 255 }),
    createdAt: created(),
  },
  (t) => [index("entitlements_user").on(t.userId), index("entitlements_org").on(t.organisationId)],
);

export const invoices = mysqlTable("invoices", {
  id: id(),
  number: varchar("number", { length: 32 }).notNull().unique(),
  organisationId: ref("organisation_id").notNull(),
  planId: varchar("plan_id", { length: 40 }).notNull(),
  seats: int("seats").notNull(),
  amountCents: int("amount_cents").notNull(),
  status: mysqlEnum("status", ["open", "paid", "void"]).notNull().default("open"),
  paidAt: at("paid_at"),
  markedPaidBy: ref("marked_paid_by"),
  createdAt: created(),
});

// ── Course structure (mirrors data/curriculum.ts, seeded) ───────────────────

export const tracks = mysqlTable("tracks", {
  id: varchar("id", { length: 40 }).primaryKey(),
  code: varchar("code", { length: 4 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  position: int("position").notNull(),
});

export const chapters = mysqlTable("chapters", {
  id: varchar("id", { length: 60 }).primaryKey(),
  trackId: varchar("track_id", { length: 40 }).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  position: int("position").notNull(),
  free: boolean("free").notNull().default(false),
});

export const lessons = mysqlTable("lessons", {
  id: varchar("id", { length: 60 }).primaryKey(),
  chapterId: varchar("chapter_id", { length: 60 }).notNull(),
  rigId: varchar("rig_id", { length: 40 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  position: int("position").notNull(),
});

export const rigs = mysqlTable("rigs", {
  id: varchar("id", { length: 40 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
});

// ── Learning records ────────────────────────────────────────────────────────

export const progress = mysqlTable(
  "progress",
  {
    userId: ref("user_id").notNull(),
    lessonId: varchar("lesson_id", { length: 60 }).notNull(),
    status: mysqlEnum("status", ["started", "ran", "completed"]).notNull(),
    score: int("score"),
    completedAt: at("completed_at"),
    updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

export const savedPrograms = mysqlTable(
  "saved_programs",
  {
    id: id(),
    userId: ref("user_id").notNull(),
    /** A lesson id or "sandbox:<rig>". */
    slot: varchar("slot", { length: 80 }).notNull(),
    rigId: varchar("rig_id", { length: 40 }).notNull(),
    language: mysqlEnum("language", ["ladder", "st"]).notNull(),
    source: text("source").notNull(),
    version: int("version").notNull().default(1),
    updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [uniqueIndex("saved_programs_slot").on(t.userId, t.slot, t.language)],
);

export const quizAttempts = mysqlTable(
  "quiz_attempts",
  {
    id: id(),
    userId: ref("user_id").notNull(),
    lessonId: varchar("lesson_id", { length: 60 }).notNull(),
    score: int("score").notNull(),
    total: int("total").notNull(),
    createdAt: created(),
  },
  (t) => [index("quiz_attempts_user").on(t.userId, t.lessonId)],
);

export const assessments = mysqlTable("assessments", {
  id: varchar("id", { length: 60 }).primaryKey(),
  trackId: varchar("track_id", { length: 40 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  rigId: varchar("rig_id", { length: 40 }).notNull(),
});

export const assessmentRuns = mysqlTable(
  "assessment_runs",
  {
    id: id(),
    userId: ref("user_id").notNull(),
    assessmentId: varchar("assessment_id", { length: 60 }).notNull(),
    source: text("source").notNull(),
    language: mysqlEnum("language", ["ladder", "st"]).notNull(),
    passed: boolean("passed").notNull(),
    results: json("results").notNull(),
    createdAt: created(),
  },
  (t) => [index("assessment_runs_user").on(t.userId, t.assessmentId)],
);

// ── Level exams ─────────────────────────────────────────────────────────────

export const examAttempts = mysqlTable(
  "exam_attempts",
  {
    id: id(),
    userId: ref("user_id").notNull(),
    /** F, P or E. */
    level: char("level", { length: 1 }).notNull(),
    /** How the attempt was paid for: an exam credit, a paid resit or the free resit. */
    kind: mysqlEnum("kind", ["credit", "free_resit"]).notNull(),
    /** The drawn questions as lessonId:index, with each question's option order. */
    paper: json("paper").notNull(),
    answers: json("answers"),
    startedAt: datetime("started_at").notNull(),
    deadlineAt: datetime("deadline_at").notNull(),
    submittedAt: at("submitted_at"),
    theoryPct: int("theory_pct"),
    practicalPassed: boolean("practical_passed"),
    passed: boolean("passed"),
  },
  (t) => [index("exam_attempts_user").on(t.userId, t.level)],
);

export const certificates = mysqlTable(
  "certificates",
  {
    id: id(),
    code: varchar("code", { length: 16 }).notNull(),
    userId: ref("user_id").notNull(),
    trackId: varchar("track_id", { length: 40 }).notNull(),
    nameOnCertificate: varchar("name_on_certificate", { length: 120 }).notNull(),
    organisationId: ref("organisation_id"),
    issuedAt: datetime("issued_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    revokedAt: at("revoked_at"),
  },
  (t) => [uniqueIndex("certificates_code").on(t.code), uniqueIndex("certificates_user_track").on(t.userId, t.trackId)],
);

// ── Classes ─────────────────────────────────────────────────────────────────

export const cohorts = mysqlTable(
  "cohorts",
  {
    id: id(),
    organisationId: ref("organisation_id").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    teacherId: ref("teacher_id"),
    platformLock: varchar("platform_lock", { length: 16 }),
    createdAt: created(),
  },
  (t) => [index("cohorts_org").on(t.organisationId)],
);

export const cohortMembers = mysqlTable(
  "cohort_members",
  {
    cohortId: ref("cohort_id").notNull(),
    userId: ref("user_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.cohortId, t.userId] })],
);

export const assignments = mysqlTable(
  "assignments",
  {
    id: id(),
    cohortId: ref("cohort_id").notNull(),
    lessonId: varchar("lesson_id", { length: 60 }).notNull(),
    dueAt: at("due_at"),
    createdAt: created(),
  },
  (t) => [index("assignments_cohort").on(t.cohortId)],
);

export const submissions = mysqlTable(
  "submissions",
  {
    id: id(),
    assignmentId: ref("assignment_id").notNull(),
    userId: ref("user_id").notNull(),
    source: text("source").notNull(),
    language: mysqlEnum("language", ["ladder", "st"]).notNull(),
    passed: boolean("passed").notNull(),
    grade: int("grade"),
    feedback: text("feedback"),
    createdAt: created(),
  },
  (t) => [index("submissions_assignment").on(t.assignmentId, t.userId)],
);

export const enquiries = mysqlTable("enquiries", {
  id: id(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  organisation: varchar("organisation", { length: 160 }).notNull(),
  seats: int("seats"),
  message: text("message"),
  createdAt: created(),
});

export const auditLog = mysqlTable(
  "audit_log",
  {
    id: id(),
    actorId: ref("actor_id"),
    action: varchar("action", { length: 80 }).notNull(),
    subject: varchar("subject", { length: 120 }),
    detail: json("detail"),
    createdAt: created(),
  },
  (t) => [index("audit_log_action").on(t.action, t.createdAt)],
);

// ── Lesson videos (files live outside the web root, see lib/server/videos.ts) ──

export const lessonVideos = mysqlTable("lesson_videos", {
  lessonId: varchar("lesson_id", { length: 60 }).primaryKey(),
  videoFile: varchar("video_file", { length: 120 }),
  posterFile: varchar("poster_file", { length: 120 }),
  captionsFile: varchar("captions_file", { length: 120 }),
  durationS: int("duration_s"),
  chapters: json("chapters").$type<{ t: number; title: string }[]>(),
  published: boolean("published").notNull().default(false),
  updatedBy: ref("updated_by"),
  updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
