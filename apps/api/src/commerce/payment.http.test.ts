import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { parseAppEnv } from "@comprausa/config";
import { Secret, TOTP } from "otpauth";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryAuthRepository } from "../auth/memory-auth.repository";
import { TokenService } from "../auth/token.service";
import { AuthModule } from "../auth/auth.module";
import { ZodExceptionFilter } from "../http/zod-exception.filter";
import { CommerceModule } from "./commerce.module";
import { MemoryCommerceRepository } from "./memory-commerce.repository";
import { STRIPE_CLIENT, STRIPE_WEBHOOK, type StripePaymentClient, type StripeWebhookVerifier } from "./stripe-client";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const address = { state: "Miranda", city: "Caracas", municipality: "Baruta", reference: "Frente a la plaza" };

const stripeClient: StripePaymentClient & { calls: number } = {
  calls: 0,
  async createPaymentIntent(input) {
    stripeClient.calls += 1;
    return { id: `pi_${input.idempotencyKey}`, clientSecret: "pi_secret_test" };
  },
};

const stripeWebhook: StripeWebhookVerifier = {
  verify(rawBody, signature) {
    if (signature !== "v1=test") {
      return null;
    }
    const body = JSON.parse(rawBody) as { id: string; type: string; data: { object: { id: string } } };
    return { eventId: body.id, type: body.type, paymentIntentId: body.data.object.id };
  },
};

async function post(base: string, path: string, body: unknown, token?: string, headers?: Record<string, string>) {
  const response = await fetch(new URL(path, base), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, json: text.length > 0 ? JSON.parse(text) : null };
}

async function register(base: string, destination: string, deviceId: string): Promise<string> {
  await post(base, "/v1/auth/otp/challenges", { channel: "email", destination, deviceId });
  const dev = await post(base, "/v1/auth/dev/otp-code", { channel: "email", destination });
  const code = (dev.json as { code: string }).code;
  const verified = await post(base, "/v1/auth/otp/verifications", {
    channel: "email",
    destination,
    code,
    deviceId,
    platform: "WEB",
  });
  const registrationToken = (verified.json as { registrationToken: string }).registrationToken;
  const registered = await post(base, "/v1/auth/registrations", {
    registrationToken,
    givenName: "Ana",
    familyName: "Pérez",
    deviceId,
    platform: "WEB",
  });
  return (registered.json as { accessToken: string }).accessToken;
}

describe("payment review HTTP", () => {
  let app: INestApplication;
  let base: string;
  let customer: string;
  let other: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule.registerFrom(parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "simulated", ALLOW_IN_MEMORY_PERSISTENCE: "true" })), CommerceModule],
    })
      .overrideProvider(STRIPE_CLIENT)
      .useValue(stripeClient)
      .overrideProvider(STRIPE_WEBHOOK)
      .useValue(stripeWebhook)
      .compile();
    app = moduleRef.createNestApplication({ logger: false, rawBody: true });
    app.useGlobalFilters(new ZodExceptionFilter());
    await app.init();
    await app.listen(0, "127.0.0.1");
    const info = app.getHttpServer().address();
    const port = typeof info === "object" && info ? info.port : 0;
    base = `http://127.0.0.1:${port}`;
    customer = await register(base, "pago@example.com", "00000000-0000-4000-8000-0000000000c1");
    other = await register(base, "otro@example.com", "00000000-0000-4000-8000-0000000000c2");
  });

  afterAll(async () => {
    await app?.close();
  });

  it("blocks a client and an operator without MFA, then reviews a proof without buying from the store", async () => {
    const missing = await fetch(new URL("/v1/auth/dev/mfa", base), { method: "POST" });
    expect(missing.status).toBe(404);

    await post(base, "/v1/cart/items", { productId: "demo-norte", quantity: 1 }, customer);
    const created = await post(base, "/v1/quotes", { address }, customer);
    const quoteId = (created.json as { id: string }).id;
    const blockedPay = await post(base, `/v1/quotes/${quoteId}/pay`, {}, customer);
    expect(blockedPay.status).toBe(403);

    const repository = app.get(MemoryAuthRepository);
    const tokens = app.get(TokenService);
    const operator = await repository.createCustomer({
      channel: "email",
      destination: "operador@example.com",
      givenName: "Ora",
      familyName: "Finanzas",
    });
    repository.setRole(operator.id, "FINANCE_AGENT");
    const procurement = await repository.createCustomer({
      channel: "email",
      destination: "compras@example.com",
      givenName: "Pro",
      familyName: "Curas",
    });
    repository.setRole(procurement.id, "PROCUREMENT_AGENT");
    const expiresAt = new Date(Date.now() + 60_000);
    async function session(userId: string, role: "FINANCE_AGENT" | "PROCUREMENT_AGENT", mfa: boolean): Promise<string> {
      const id = randomUUID();
      await repository.saveSession({
        id,
        userId,
        familyId: randomUUID(),
        deviceId: null,
        refreshTokenHash: tokens.issueRefresh().hash,
        rotatedFromId: null,
        roleCode: role,
        mfaSatisfied: mfa,
        expiresAt,
        revokedAt: null,
        rotatedAt: null,
      });
      return tokens.signAccess({ sub: userId, sid: id, role, mfa }, 900);
    }
    const withoutMfa = await session(operator.id, "FINANCE_AGENT", false);
    const withMfa = await session(operator.id, "FINANCE_AGENT", true);
    const procurementToken = await session(procurement.id, "PROCUREMENT_AGENT", true);

    expect((await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 2500 }, customer)).status).toBe(403);
    expect((await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 2500 }, withoutMfa)).status).toBe(403);
    expect((await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 2500 }, procurementToken)).status).toBe(403);

    const published = await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 2500 }, withMfa);
    expect(published.status).toBe(200);
    expect(published.json).toMatchObject({
      status: "FINAL",
      snapshot: { status: "FINAL", knownMinor: 2500 },
    });
    const line = (published.json as { lines: { unitAmountMinor: number | null }[] }).lines[0];
    expect(line?.unitAmountMinor).toBeNull();
    const overwritten = await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 1 }, withMfa);
    expect(overwritten.status).toBe(409);

    const accepted = await post(base, `/v1/quotes/${quoteId}/accept`, {}, customer);
    expect(accepted.status).toBe(200);
    expect(accepted.json).toMatchObject({
      status: "ACCEPTED",
      order: { status: "AWAITING_PAYMENT", procurementStatus: "NOT_STARTED", purchasedFromStore: false, grandTotalMinor: 2500 },
    });

    const forged = await post(base, `/v1/quotes/${quoteId}/payments`, { method: "ZELLE", reference: "REF1001", status: "VERIFIED" }, customer);
    expect(forged.status).toBe(400);
    const wrongAmount = await post(
      base,
      `/v1/quotes/${quoteId}/payments`,
      { method: "PAGO_MOVIL", bank: "Banco de prueba", phone: "04141234567", reference: "PM1001", amountMinor: 1 },
      customer,
    );
    expect(wrongAmount.status).toBe(400);

    const pago = await post(
      base,
      `/v1/quotes/${quoteId}/payments`,
      { method: "PAGO_MOVIL", bank: "Banco de prueba", phone: "04141234567", reference: "pm1001", amountMinor: 2500 },
      customer,
    );
    expect(pago.status).toBe(200);
    expect(pago.json).toMatchObject({
      payment: { method: "PAGO_MOVIL", status: "PENDING", amountMinor: 2500, reference: "PM1001", payerPhone: "04141234567" },
    });
    const paymentId = (pago.json as { payment: { id: string } }).payment.id;
    const duplicate = await post(
      base,
      `/v1/quotes/${quoteId}/payments`,
      { method: "PAGO_MOVIL", bank: "Banco de prueba", phone: "04141234567", reference: "PM1001", amountMinor: 2500 },
      customer,
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.json).toEqual({ error: "duplicate_reference" });

    const idor = await fetch(new URL(`/v1/payments/${paymentId}`, base), { headers: { authorization: `Bearer ${other}` } });
    expect(idor.status).toBe(404);

    const badFile = await post(base, `/v1/payments/${paymentId}/proof`, { contentType: "image/png", dataBase64: Buffer.from("<html></html>").toString("base64") }, customer);
    expect(badFile.status).toBe(400);
    const proof = await post(
      base,
      `/v1/payments/${paymentId}/proof`,
      { contentType: "image/png", dataBase64: png.toString("base64") },
      customer,
    );
    expect(proof.status).toBe(200);
    expect(proof.json).toMatchObject({
      status: "PROOF_SUBMITTED",
      order: { status: "PAYMENT_UNDER_REVIEW", purchasedFromStore: false },
    });
    expect(proof.json).not.toMatchObject({ status: "VERIFIED" });
    const commerce = app.get(MemoryCommerceRepository);
    expect(commerce.listAudit(paymentId).some((record) => record.action === "payment.verified")).toBe(false);
    expect(commerce.readOrder((accepted.json as { order: { id: string } }).order.id)?.status).toBe("PAYMENT_UNDER_REVIEW");

    expect((await post(base, `/v1/operator/payments/${paymentId}/verify`, {}, customer)).status).toBe(403);
    expect((await post(base, `/v1/operator/payments/${paymentId}/verify`, {}, withoutMfa)).status).toBe(403);
    const verified = await post(base, `/v1/operator/payments/${paymentId}/verify`, {}, withMfa);
    expect(verified.status).toBe(200);
    expect(verified.json).toMatchObject({
      payment: { status: "VERIFIED" },
      order: { status: "PAID", procurementStatus: "NOT_STARTED", purchasedFromStore: false },
    });
    expect(JSON.stringify(verified.json)).not.toContain("PURCHASED_FROM_STORE");
  });

  it("keeps Stripe on a fake client and does not capture PayPal", async () => {
    stripeClient.calls = 0;
    const spy = vi.spyOn(globalThis, "fetch");
    await post(base, "/v1/cart/items", { productId: "demo-norte", quantity: 1 }, customer);
    const created = await post(base, "/v1/quotes", { address }, customer);
    const quoteId = (created.json as { id: string }).id;
    const repository = app.get(MemoryAuthRepository);
    const tokens = app.get(TokenService);
    const operator = await repository.findUserByDestination("email", "operador@example.com");
    if (!operator) {
      throw new Error("missing operator");
    }
    const sessionId = randomUUID();
    await repository.saveSession({
      id: sessionId,
      userId: operator.id,
      familyId: randomUUID(),
      deviceId: null,
      refreshTokenHash: tokens.issueRefresh().hash,
      rotatedFromId: null,
      roleCode: "FINANCE_AGENT",
      mfaSatisfied: true,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      rotatedAt: null,
    });
    const finance = await tokens.signAccess({ sub: operator.id, sid: sessionId, role: "FINANCE_AGENT", mfa: true }, 900);
    await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 900 }, finance);
    await post(base, `/v1/quotes/${quoteId}/accept`, {}, customer);

    const methods = await fetch(new URL("/v1/payments/methods", base), { headers: { authorization: `Bearer ${customer}` } });
    expect(await methods.json()).toMatchObject({
      stripe: { configured: true },
      paypal: { capture: false },
    });

    const first = await post(base, `/v1/quotes/${quoteId}/payments`, { method: "STRIPE", idempotencyKey: "idem-stripe-01" }, customer);
    const second = await post(base, `/v1/quotes/${quoteId}/payments`, { method: "STRIPE", idempotencyKey: "idem-stripe-01" }, customer);
    expect(first.status).toBe(200);
    expect(second.json).toMatchObject({ idempotent: true, clientSecret: null });
    expect(stripeClient.calls).toBe(1);
    expect(JSON.stringify(first.json)).not.toMatch(/\b\d{13,19}\b/);

    const intentId = (first.json as { payment: { id: string } }).payment.id;
    const stored = app.get(MemoryCommerceRepository).readPayment(intentId);
    const providerReference = stored?.providerReference;
    const event = { id: "evt_test_1", type: "payment_intent.succeeded", data: { object: { id: providerReference } } };
    const unsigned = await post(base, "/v1/payments/stripe/webhook", event, undefined, { "stripe-signature": "nope" });
    expect(unsigned.status).toBe(400);
    const signed = await post(base, "/v1/payments/stripe/webhook", event, undefined, { "stripe-signature": "v1=test" });
    expect(signed.json).toMatchObject({ status: "recorded", payment: { status: "UNDER_REVIEW" } });
    expect(signed.json).not.toMatchObject({ payment: { status: "VERIFIED" } });
    const again = await post(base, "/v1/payments/stripe/webhook", event, undefined, { "stripe-signature": "v1=test" });
    expect(again.json).toEqual({ status: "duplicate" });
    const order = app.get(MemoryCommerceRepository).readOrder(stored?.orderId ?? "");
    expect(order?.status).not.toBe("PAID");

    await post(base, "/v1/cart/items", { productId: "demo-centro", quantity: 1 }, other);
    const otherQuote = await post(base, "/v1/quotes", { address }, other);
    const otherId = (otherQuote.json as { id: string }).id;
    await post(base, `/v1/operator/quotes/${otherId}/publish`, { amountMinor: 400 }, finance);
    await post(base, `/v1/quotes/${otherId}/accept`, {}, other);
    const paypal = await post(base, `/v1/quotes/${otherId}/payments`, { method: "PAYPAL" }, other);
    expect(paypal.json).toMatchObject({
      capture: false,
      payment: { method: "PAYPAL", status: "PENDING" },
      detail: "PayPal no captura el pago en este corte.",
    });
    expect(paypal.json).toMatchObject({ payment: { order: { status: "AWAITING_PAYMENT", purchasedFromStore: false } } });
    const hosts = spy.mock.calls.map((call) => String(call[0]));
    expect(hosts.some((host) => host.includes("api.stripe.com") || host.includes("paypal.com"))).toBe(false);
    spy.mockRestore();
  });

  it("elevates an operator only after a valid TOTP", async () => {
    const token = await register(base, "finanzas@comprausa.test", "00000000-0000-4000-8000-0000000000c3");
    const profile = await fetch(new URL("/v1/account/profile", base), { headers: { authorization: `Bearer ${token}` } });
    expect(await profile.json()).toMatchObject({ role: "FINANCE_AGENT", mfaSatisfied: false });
    const customerPublish = await post(base, "/v1/operator/quotes/missing/publish", { amountMinor: 100 }, token);
    expect(customerPublish.status).toBe(403);
    const enrolled = await post(base, "/v1/auth/totp/enrollments", {}, token);
    expect(enrolled.status).toBe(200);
    const secret = (enrolled.json as { secret: string }).secret;
    const totp = new TOTP({ issuer: "TraeLo", label: "operador", algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secret) });
    const verified = await post(base, "/v1/auth/totp/verifications", { code: totp.generate() }, token);
    expect(verified.status).toBe(200);
    expect(verified.json).toMatchObject({ status: "authenticated" });
    const elevated = (verified.json as { accessToken: string }).accessToken;
    const after = await fetch(new URL("/v1/account/profile", base), { headers: { authorization: `Bearer ${elevated}` } });
    expect(await after.json()).toMatchObject({ role: "FINANCE_AGENT", mfaSatisfied: true });
    const denied = await fetch(new URL("/v1/account/profile", base), { headers: { authorization: `Bearer ${token}` } });
    expect(denied.status).toBe(401);
  });
});
