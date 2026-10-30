// Everything about money lives here, in cents. Prices are final prices: no VAT is charged until the
// company registers for VAT, and from then on the same prices include it.

export const VAT_RATE = 0.15;
/** Set once registered for VAT; until then receipts say no VAT was charged. */
export const VAT_NUMBER = process.env.VAT_NUMBER ?? "";
export const GRACE_DAYS = 3;

/** The three levels of the ladder: Foundation, Professional, Expert. */
export type Level = "F" | "P" | "E";
export const LEVELS: Level[] = ["F", "P", "E"];
export const LEVEL_NAMES: Record<Level, string> = { F: "Foundation", P: "Professional", E: "Expert" };

export interface PlanConfig {
  id: string;
  name: string;
  audience: "learner" | "employer" | "institution";
  priceCents: number;
  periodMonths: number;
  perSeat: boolean;
  minSeats: number;
  /** The levels whose training this plan opens. */
  levels: Level[];
  /** Level exams included in the price. */
  exams: Level[];
  blurb: string;
  features: string[];
  /** Bought online through the payment provider; otherwise by invoice. */
  online: boolean;
  /** Shown on the pricing page. Retired plans stay here so old payments still resolve. */
  listed: boolean;
}

const ALL: Level[] = ["F", "P", "E"];

export const PLANS: PlanConfig[] = [
  {
    id: "level-f",
    name: "Level 1: Foundation",
    audience: "learner",
    priceCents: 250000,
    periodMonths: 12,
    perSeat: false,
    minSeats: 1,
    levels: ["F"],
    exams: [],
    blurb: "PLC basics, ladder logic, wiring and commissioning.",
    features: ["Stages 1 and 2", "All Foundation machines and labs", "12 months of access", "Exam sold separately, R1,200"],
    online: true,
    listed: true,
  },
  {
    id: "level-p",
    name: "Level 2: Professional",
    audience: "learner",
    priceCents: 350000,
    periodMonths: 12,
    perSeat: false,
    minSeats: 1,
    levels: ["P"],
    exams: [],
    blurb: "Process control, drives, motor protection and safety.",
    features: ["Stages 3, 4 and 7", "Brand platform tours", "12 months of access", "Exam sold separately, R1,800"],
    online: true,
    listed: true,
  },
  {
    id: "level-e",
    name: "Level 3: Expert",
    audience: "learner",
    priceCents: 450000,
    periodMonths: 12,
    perSeat: false,
    minSeats: 1,
    levels: ["E"],
    exams: [],
    blurb: "Advanced programming, plant systems and upgrades.",
    features: ["Stages 5 and 6", "Final plant project", "12 months of access", "Exam sold separately, R3,500"],
    online: true,
    listed: true,
  },
  {
    id: "bundle",
    name: "All three levels",
    audience: "learner",
    priceCents: 1390000,
    periodMonths: 12,
    perSeat: false,
    minSeats: 1,
    levels: ALL,
    exams: ALL,
    blurb: "Every level and every level exam, for R3,100 less than buying them one by one.",
    features: ["Foundation, Professional and Expert", "All three level exams included", "12 months of access", "Pay in up to six instalments by arrangement"],
    online: true,
    listed: true,
  },
  {
    id: "learner-month",
    name: "Monthly",
    audience: "learner",
    priceCents: 29900,
    periodMonths: 1,
    perSeat: false,
    minSeats: 1,
    levels: ALL,
    exams: [],
    blurb: "All training, month to month. Exams sold separately.",
    features: ["All three levels", "Every machine and controller family", "Cancel any time"],
    online: true,
    listed: true,
  },
  {
    id: "corp-f",
    name: "Corporate: Foundation",
    audience: "employer",
    priceCents: 750000,
    periodMonths: 12,
    perSeat: true,
    minSeats: 5,
    levels: ["F"],
    exams: [],
    blurb: "Per learner, five or more.",
    features: ["Manager dashboard and monthly reports", "Records for your WSP and ATR", "Invoice and EFT", "Transferable seats"],
    online: true,
    listed: true,
  },
  {
    id: "corp-p",
    name: "Corporate: Professional",
    audience: "employer",
    priceCents: 950000,
    periodMonths: 12,
    perSeat: true,
    minSeats: 5,
    levels: ["P"],
    exams: [],
    blurb: "Per learner, five or more.",
    features: ["Manager dashboard and monthly reports", "Records for your WSP and ATR", "Invoice and EFT", "Transferable seats"],
    online: true,
    listed: true,
  },
  {
    id: "corp-e",
    name: "Corporate: Expert",
    audience: "employer",
    priceCents: 1250000,
    periodMonths: 12,
    perSeat: true,
    minSeats: 5,
    levels: ["E"],
    exams: [],
    blurb: "Per learner, five or more.",
    features: ["Manager dashboard and monthly reports", "Records for your WSP and ATR", "Invoice and EFT", "Transferable seats"],
    online: true,
    listed: true,
  },
  {
    id: "corp-all",
    name: "Corporate: all three levels",
    audience: "employer",
    priceCents: 2650000,
    periodMonths: 12,
    perSeat: true,
    minSeats: 5,
    levels: ALL,
    exams: [],
    blurb: "Per learner, five or more.",
    features: ["Manager dashboard and monthly reports", "Records for your WSP and ATR", "Invoice and EFT", "Transferable seats"],
    online: true,
    listed: true,
  },
  {
    id: "college-f",
    name: "College group: Foundation",
    audience: "institution",
    priceCents: 200000,
    periodMonths: 12,
    perSeat: true,
    minSeats: 10,
    levels: ["F"],
    exams: [],
    blurb: "Per learner for TVET colleges and SETA funded groups, quoted per group.",
    features: ["Lecturer accounts, classes, assignments and grading", "Results reports for the college and its SETA", "Supervised exam sittings on campus"],
    online: false,
    listed: true,
  },
  // Retired plans, kept so earlier payments and entitlements still resolve.
  { id: "learner-year", name: "Learner, yearly (retired)", audience: "learner", priceCents: 149000, periodMonths: 12, perSeat: false, minSeats: 1, levels: ALL, exams: [], blurb: "", features: [], online: false, listed: false },
  { id: "employer-seat-year", name: "Employer seats (retired)", audience: "employer", priceCents: 90000, periodMonths: 12, perSeat: true, minSeats: 10, levels: ALL, exams: [], blurb: "", features: [], online: false, listed: false },
  { id: "institution-seat-year", name: "Institution seats (retired)", audience: "institution", priceCents: 90000, periodMonths: 12, perSeat: true, minSeats: 20, levels: ALL, exams: [], blurb: "", features: [], online: false, listed: false },
  { id: "institution-site-year", name: "Site licence (retired)", audience: "institution", priceCents: 4500000, periodMonths: 12, perSeat: false, minSeats: 1, levels: ALL, exams: [], blurb: "", features: [], online: false, listed: false },
];

/** Level exams, resits and endorsements, the same price for individuals and employers. */
export const EXAM_PRICES: Record<Level, number> = { F: 120000, P: 180000, E: 350000 };
export const RESIT_CENTS = 50000;
export const ENDORSEMENT_CENTS = 75000;
/** A failed exam can be resat once for free, 14 days after the attempt. */
export const FREE_RESIT_AFTER_DAYS = 14;
/** Corporate and college vouchers stay valid this long. */
export const VOUCHER_MONTHS = 12;

export const planById = (id: string) => PLANS.find((p) => p.id === id);
/** Levels a plan opens. An unknown plan id opens everything, so no old payment loses access. */
export const levelsOf = (planId: string): Level[] => planById(planId)?.levels ?? ALL;

/** Volume discount on per seat plans: 10% from 20 seats, 15% from 50. */
export const seatDiscount = (seats: number) => (seats >= 50 ? 0.15 : seats >= 20 ? 0.1 : 0);

/** What a plan costs for a number of seats, discount included. */
export function priceFor(plan: PlanConfig, seats = 1) {
  if (!plan.perSeat) return plan.priceCents;
  const n = Math.max(plan.minSeats, Math.floor(seats));
  return Math.round(plan.priceCents * n * (1 - (plan.audience === "employer" ? seatDiscount(n) : 0)));
}

export const rand = (cents: number) => `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** The VAT part of an amount, or 0 while the company is not registered for VAT. */
export const vatOf = (cents: number) => (VAT_NUMBER ? Math.round(cents - cents / (1 + VAT_RATE)) : 0);
