// Prices are starting points to test. Everything about money lives here, in cents, VAT inclusive.

export const VAT_RATE = 0.15;
/** Shown on receipts once registered for VAT. */
export const VAT_NUMBER = process.env.VAT_NUMBER ?? "";
export const GRACE_DAYS = 3;

export interface PlanConfig {
  id: string;
  name: string;
  audience: "learner" | "employer" | "institution";
  priceCents: number;
  periodMonths: number;
  perSeat: boolean;
  minSeats: number;
  blurb: string;
  features: string[];
  /** Bought online through the payment provider; otherwise by invoice. */
  online: boolean;
}

export const PLANS: PlanConfig[] = [
  {
    id: "learner-month",
    name: "Learner, monthly",
    audience: "learner",
    priceCents: 19900,
    periodMonths: 1,
    perSeat: false,
    minSeats: 1,
    blurb: "Everything, month to month.",
    features: ["All tracks and machines", "Editable code and saved programs", "Quizzes and certificates", "Every controller family"],
    online: true,
  },
  {
    id: "learner-year",
    name: "Learner, yearly",
    audience: "learner",
    priceCents: 149000,
    periodMonths: 12,
    perSeat: false,
    minSeats: 1,
    blurb: "Everything for a year, about R124 a month.",
    features: ["All tracks and machines", "Editable code and saved programs", "Quizzes and certificates", "Every controller family"],
    online: true,
  },
  {
    id: "employer-seat-year",
    name: "Employer seats",
    audience: "employer",
    priceCents: 90000,
    periodMonths: 12,
    perSeat: true,
    minSeats: 10,
    blurb: "Per seat per year, ten seats or more.",
    features: ["Everything in Learner", "Manager dashboard", "Progress reports and CSV export"],
    online: true,
  },
  {
    id: "institution-seat-year",
    name: "Institution seats",
    audience: "institution",
    priceCents: 90000,
    periodMonths: 12,
    perSeat: true,
    minSeats: 20,
    blurb: "Per student per year, twenty seats or more.",
    features: ["Everything in Learner", "Cohorts and teacher dashboard", "Assignments and grading", "White label certificates", "CSV student import"],
    online: false,
  },
  {
    id: "institution-site-year",
    name: "Site licence",
    audience: "institution",
    priceCents: 4500000,
    periodMonths: 12,
    perSeat: false,
    minSeats: 1,
    blurb: "Unlimited students on one campus.",
    features: ["Everything in Institution seats", "Unlimited students"],
    online: false,
  },
];

export const planById = (id: string) => PLANS.find((p) => p.id === id);

export const rand = (cents: number) => `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** The VAT part of a VAT inclusive amount. */
export const vatOf = (cents: number) => Math.round(cents - cents / (1 + VAT_RATE));
