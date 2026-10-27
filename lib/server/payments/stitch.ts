// Stitch Pay By Bank. Docs: https://docs.stitch.money (client tokens, payment requests, webhooks).
// Credentials live only in the environment: STITCH_CLIENT_ID, STITCH_CLIENT_SECRET, STITCH_WEBHOOK_SECRET.

import { verifySvix } from "./svix";
import type { CreatePaymentInput, CreatedPayment, PaymentProvider, ProviderStatus, WebhookEvent } from "./types";

const TOKEN_URL = "https://secure.stitch.money/connect/token";
const API_URL = "https://api.stitch.money/graphql";

const CREATE = `mutation CreatePaymentRequest($amount: MoneyInput!, $payerReference: String!, $beneficiaryReference: String!, $externalReference: String) {
  clientPaymentInitiationRequestCreate(input: { amount: $amount, payerReference: $payerReference, beneficiaryReference: $beneficiaryReference, externalReference: $externalReference }) {
    paymentInitiationRequest { id url }
  }
}`;

const STATUS = `query GetPaymentRequestStatus($paymentRequestId: ID!) {
  node(id: $paymentRequestId) { ... on PaymentInitiationRequest { id state { __typename } } }
}`;

/** Maps a Stitch payment request state to ours. */
export function stitchStatus(typename: string | undefined): ProviderStatus {
  switch (typename) {
    case "PaymentInitiationRequestCompleted":
      return "paid";
    case "PaymentInitiationRequestCancelled":
      return "cancelled";
    case "PaymentInitiationRequestExpired":
      return "expired";
    case "PaymentInitiationRequestFailed":
      return "failed";
    default:
      return "pending";
  }
}

interface StitchNode {
  id?: string;
  externalReference?: string;
  state?: { __typename?: string };
}

/** Pulls the payment request out of a webhook body, wherever Stitch nests it. */
export function parseStitchWebhook(body: unknown): StitchNode | null {
  const b = body as { data?: { client?: { paymentInitiationRequests?: { node?: StitchNode } } } } & StitchNode;
  return b?.data?.client?.paymentInitiationRequests?.node ?? (b?.id ? b : null);
}

export class StitchProvider implements PaymentProvider {
  id = "stitch";
  private token: { value: string; expires: number } | null = null;

  constructor(
    private clientId = process.env.STITCH_CLIENT_ID ?? "",
    private clientSecret = process.env.STITCH_CLIENT_SECRET ?? "",
    private webhookSecret = process.env.STITCH_WEBHOOK_SECRET ?? "",
  ) {}

  private async clientToken() {
    if (this.token && this.token.expires > Date.now() + 60_000) return this.token.value;
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: this.clientId, client_secret: this.clientSecret, scope: "client_paymentrequest", audience: TOKEN_URL }),
    });
    if (!res.ok) throw new Error(`Stitch token request failed: ${res.status}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
    return this.token.value;
  }

  private async gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await this.clientToken()}` },
      body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (!res.ok || json.errors?.length) throw new Error(`Stitch API error: ${json.errors?.map((e) => e.message).join("; ") ?? res.status}`);
    return json.data!;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const data = await this.gql<{ clientPaymentInitiationRequestCreate: { paymentInitiationRequest: { id: string; url: string } } }>(CREATE, {
      amount: { quantity: (input.amountCents / 100).toFixed(2), currency: "ZAR" },
      payerReference: input.payerReference.slice(0, 12),
      beneficiaryReference: input.beneficiaryReference.slice(0, 20),
      externalReference: input.paymentId,
    });
    const { id, url } = data.clientPaymentInitiationRequestCreate.paymentInitiationRequest;
    return { providerPaymentId: id, redirectUrl: `${url}?redirect_uri=${encodeURIComponent(input.returnUrl)}` };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent> {
    const eventId = verifySvix(this.webhookSecret, rawBody, headers);
    const body = JSON.parse(rawBody) as unknown;
    const node = parseStitchWebhook(body);
    return {
      eventId,
      type: headers.get("svix-event-type") ?? (body as { type?: string })?.type ?? "payment",
      providerPaymentId: node?.id ?? null,
      externalReference: node?.externalReference ?? null,
      status: stitchStatus(node?.state?.__typename),
      payload: body,
    };
  }

  async fetchStatus(providerPaymentId: string): Promise<ProviderStatus> {
    const data = await this.gql<{ node: StitchNode | null }>(STATUS, { paymentRequestId: providerPaymentId });
    return stitchStatus(data.node?.state?.__typename);
  }
}
