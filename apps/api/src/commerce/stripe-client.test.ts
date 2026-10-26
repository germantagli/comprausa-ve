import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { createOfficialStripeClient, createOfficialWebhookVerifier } from "./stripe-client";

describe("official Stripe adapter", () => {
  it("refuses a live key before constructing a client", () => {
    expect(() => createOfficialStripeClient("sk_live_not_allowed")).toThrow(/live keys/);
  });

  it("checks the webhook signature locally", () => {
    const secret = "whsec_local_contract_secret";
    const payload = JSON.stringify({
      id: "evt_local",
      object: "event",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_local", object: "payment_intent" } },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const verifier = createOfficialWebhookVerifier(secret);
    expect(verifier.verify(payload, signature)).toMatchObject({ eventId: "evt_local", paymentIntentId: "pi_local" });
    expect(verifier.verify(payload, "t=1,v1=bad")).toBeNull();
  });
});
