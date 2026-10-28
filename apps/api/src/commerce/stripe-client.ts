import Stripe from "stripe";

export interface StripePaymentIntent {
  id: string;
  clientSecret: string | null;
}

export interface StripePaymentClient {
  createPaymentIntent(input: {
    amountMinor: number;
    currency: "USD";
    idempotencyKey: string;
  }): Promise<StripePaymentIntent>;
}

export interface StripeWebhookEvent {
  eventId: string;
  type: string;
  paymentIntentId: string | null;
}

export interface StripeWebhookVerifier {
  verify(rawBody: string, signature: string | undefined): StripeWebhookEvent | null;
}

export const STRIPE_CLIENT = Symbol("STRIPE_CLIENT");
export const STRIPE_WEBHOOK = Symbol("STRIPE_WEBHOOK");

/** Official Stripe SDK. Refuses any key that is not sk_test_. Does not store a PAN. */
export function createOfficialStripeClient(secretKey: string): StripePaymentClient {
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Stripe live keys are refused");
  }
  const stripe = new Stripe(secretKey);
  return {
    async createPaymentIntent(input) {
      const intent = await stripe.paymentIntents.create(
        {
          amount: input.amountMinor,
          currency: "usd",
          automatic_payment_methods: { enabled: true },
        },
        { idempotencyKey: input.idempotencyKey },
      );
      return { id: intent.id, clientSecret: intent.client_secret };
    },
  };
}

/** Signature check via the official SDK. The API key on this instance is not used for a network call. */
export function createOfficialWebhookVerifier(webhookSecret: string): StripeWebhookVerifier {
  if (!webhookSecret.startsWith("whsec_")) {
    throw new Error("Stripe webhook secret is refused");
  }
  const stripe = new Stripe("sk_test_webhook_verifier_does_not_call_network");
  return {
    verify(rawBody, signature) {
      if (!signature) {
        return null;
      }
      try {
        const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        const object = event.data.object as { id?: unknown };
        const paymentIntentId = event.type.startsWith("payment_intent.") && typeof object.id === "string" ? object.id : null;
        return { eventId: event.id, type: event.type, paymentIntentId };
      } catch {
        return null;
      }
    },
  };
}
