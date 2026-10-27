// A stand in for Stitch in development. The "payment page" is /dev/pay/<id>, where buttons send a
// Svix signed webhook to /api/webhooks/dev, so success, failure and cancel all run the real
// webhook handler.

import { verifySvix } from "./svix";
import type { CreatePaymentInput, CreatedPayment, PaymentProvider, ProviderStatus, WebhookEvent } from "./types";

export const DEV_WEBHOOK_SECRET = process.env.DEV_WEBHOOK_SECRET ?? "whsec_ZGV2LXdlYmhvb2stc2VjcmV0LWZvci1zZXRwb2ludA==";

export class DevProvider implements PaymentProvider {
  id = "dev";

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const base = new URL(input.returnUrl).origin;
    return { providerPaymentId: `dev_${input.paymentId}`, redirectUrl: `${base}/dev/pay/${input.paymentId}?return=${encodeURIComponent(input.returnUrl)}` };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent> {
    const eventId = verifySvix(DEV_WEBHOOK_SECRET, rawBody, headers);
    const body = JSON.parse(rawBody) as { paymentId: string; status: ProviderStatus };
    return { eventId, type: "payment", providerPaymentId: `dev_${body.paymentId}`, externalReference: body.paymentId, status: body.status, payload: body };
  }

  async fetchStatus(): Promise<ProviderStatus> {
    return "pending";
  }
}
