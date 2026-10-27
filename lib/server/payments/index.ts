import { DevProvider } from "./dev";
import { StitchProvider } from "./stitch";
import type { PaymentProvider } from "./types";

const providers: Record<string, () => PaymentProvider> = {
  stitch: () => new StitchProvider(),
  dev: () => new DevProvider(),
};

const cache = new Map<string, PaymentProvider>();

export function providerById(id: string): PaymentProvider | null {
  const make = providers[id];
  if (!make) return null;
  if (!cache.has(id)) cache.set(id, make());
  return cache.get(id)!;
}

/** The provider new payments use. Set PAYMENT_PROVIDER=stitch in production. */
export const activeProvider = () => providerById(process.env.PAYMENT_PROVIDER ?? (process.env.NODE_ENV === "production" ? "stitch" : "dev"))!;

export type { PaymentProvider } from "./types";
