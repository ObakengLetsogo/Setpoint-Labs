// Every payment provider looks the same to the rest of the app. Stitch is the live one; the dev
// simulator exercises the same webhook path without real money.

export type ProviderStatus = "pending" | "paid" | "failed" | "cancelled" | "expired";

export interface CreatePaymentInput {
  /** Our payment id, sent as the external reference so webhooks can be matched to it. */
  paymentId: string;
  amountCents: number;
  /** Up to 12 characters, shown on the payer's statement. */
  payerReference: string;
  /** Up to 20 characters, shown on our statement. */
  beneficiaryReference: string;
  /** Where the payer comes back to after paying. */
  returnUrl: string;
}

export interface CreatedPayment {
  providerPaymentId: string;
  redirectUrl: string;
}

export interface WebhookEvent {
  /** Unique per delivery attempt chain, used to ignore repeats. */
  eventId: string;
  type: string;
  providerPaymentId: string | null;
  /** Our payment id, if the provider echoes it back. */
  externalReference: string | null;
  status: ProviderStatus;
  payload: unknown;
}

export class WebhookVerificationError extends Error {}

export interface PaymentProvider {
  id: string;
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  /** Throws WebhookVerificationError unless the signature is valid. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent>;
  fetchStatus(providerPaymentId: string): Promise<ProviderStatus>;
}
