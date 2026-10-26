import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { parseAppEnv } from "@comprausa/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryAuthRepository } from "../auth/memory-auth.repository";
import { TokenService } from "../auth/token.service";
import { AuthModule } from "../auth/auth.module";
import { CatalogModule } from "../catalog/catalog.module";
import { ZodExceptionFilter } from "../http/zod-exception.filter";
import { CommerceModule } from "./commerce.module";
import { MemoryCommerceRepository } from "./memory-commerce.repository";
import { MAX_PROOF_BYTES } from "./proof-bytes";

/**
 * OTP reuse, expiry, the five-attempt cap, and anti-enumeration already fail in:
 * - apps/api/src/auth/simulated-otp.provider.test.ts (reuse after approval, expiry at 121s, five failures, unknown destination)
 * - apps/api/src/auth/auth.service.test.ts (same rejection whether the account exists; expiry and five failures)
 * - apps/api/src/auth/auth.http.test.ts (identical HTTP bodies for a known and an unknown destination)
 * This file only adds the HTTP reuse of a code that was already accepted.
 */

const address = { state: "Miranda", city: "Caracas", municipality: "Baruta", reference: "Frente a la plaza" };

async function post(base: string, path: string, body: unknown, token?: string) {
  const response = await fetch(new URL(path, base), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
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

describe("security boundaries", () => {
  let app: NestExpressApplication;
  let base: string;
  let customer: string;
  let other: string;
  let finance: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule.registerFrom(parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "simulated" })), CatalogModule, CommerceModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false, rawBody: true, bodyParser: false });
    app.useBodyParser("json", { limit: "4mb" });
    app.useGlobalFilters(new ZodExceptionFilter());
    await app.init();
    await app.listen(0, "127.0.0.1");
    const info = app.getHttpServer().address();
    const port = typeof info === "object" && info ? info.port : 0;
    base = `http://127.0.0.1:${port}`;
    customer = await register(base, "seguridad@example.com", "00000000-0000-4000-8000-0000000000d1");
    other = await register(base, "ajeno@example.com", "00000000-0000-4000-8000-0000000000d2");

    const repository = app.get(MemoryAuthRepository);
    const tokens = app.get(TokenService);
    const operator = await repository.createCustomer({
      channel: "email",
      destination: "finanzas-seguridad@example.com",
      givenName: "Fin",
      familyName: "Segura",
    });
    repository.setRole(operator.id, "FINANCE_AGENT");
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
    finance = await tokens.signAccess({ sub: operator.id, sid: sessionId, role: "FINANCE_AGENT", mfa: true }, 900);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("rejects a consumed OTP over HTTP", async () => {
    const destination = "reuso-otp@example.com";
    const deviceId = "00000000-0000-4000-8000-0000000000d3";
    await post(base, "/v1/auth/otp/challenges", { channel: "email", destination, deviceId });
    const dev = await post(base, "/v1/auth/dev/otp-code", { channel: "email", destination });
    const code = (dev.json as { code: string }).code;
    const first = await post(base, "/v1/auth/otp/verifications", {
      channel: "email",
      destination,
      code,
      deviceId,
      platform: "WEB",
    });
    expect(first.json).toMatchObject({ status: "profile_required" });
    const second = await post(base, "/v1/auth/otp/verifications", {
      channel: "email",
      destination,
      code,
      deviceId,
      platform: "WEB",
    });
    expect(second.status).toBe(200);
    expect(second.json).toEqual({ status: "rejected" });
  });

  it("hides another customer's quote, payment, and order, and blocks logistics and verification", async () => {
    await post(base, "/v1/cart/items", { productId: "demo-norte", quantity: 1 }, customer);
    const created = await post(base, "/v1/quotes", { address }, customer);
    const quoteId = (created.json as { id: string }).id;
    expect((await fetch(new URL(`/v1/quotes/${quoteId}`, base), { headers: { authorization: `Bearer ${other}` } })).status).toBe(404);
    expect((await post(base, `/v1/quotes/${quoteId}/accept`, {}, other)).status).toBe(404);
    expect((await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 1 }, other)).status).toBe(403);

    await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 1800 }, finance);
    const accepted = await post(base, `/v1/quotes/${quoteId}/accept`, {}, customer);
    const orderId = (accepted.json as { order: { id: string } }).order.id;
    const pago = await post(
      base,
      `/v1/quotes/${quoteId}/payments`,
      { method: "PAGO_MOVIL", bank: "Banco de prueba", phone: "04141234567", reference: "SEC1001", amountMinor: 1800 },
      customer,
    );
    const paymentId = (pago.json as { payment: { id: string } }).payment.id;

    expect((await fetch(new URL(`/v1/quotes/${quoteId}`, base), { headers: { authorization: `Bearer ${other}` } })).status).toBe(404);
    expect((await post(base, `/v1/quotes/${quoteId}/payments`, { method: "PAYPAL" }, other)).status).toBe(404);
    expect((await fetch(new URL(`/v1/payments/${paymentId}`, base), { headers: { authorization: `Bearer ${other}` } })).status).toBe(404);
    expect(
      (
        await post(
          base,
          `/v1/payments/${paymentId}/proof`,
          { contentType: "image/png", dataBase64: Buffer.from("not-an-image").toString("base64") },
          other,
        )
      ).status,
    ).toBe(404);
    expect((await fetch(new URL(`/v1/orders/${orderId}`, base), { headers: { authorization: `Bearer ${other}` } })).status).toBe(404);
    const foreignList = await fetch(new URL("/v1/orders", base), { headers: { authorization: `Bearer ${other}` } });
    expect(JSON.stringify(await foreignList.json())).not.toContain(orderId);

    expect((await post(base, `/v1/operator/payments/${paymentId}/verify`, {}, customer)).status).toBe(403);
    expect((await post(base, `/v1/orders/${orderId}/events`, { status: "DELIVERED", note: "listo" }, customer)).status).toBe(403);
    expect((await post(base, `/v1/operator/orders/${orderId}/events`, { status: "PROCUREMENT_PENDING", note: "compra" }, customer)).status).toBe(403);

    const commerce = app.get(MemoryCommerceRepository);
    expect(commerce.readPayment(paymentId)?.status).toBe("PENDING");
    expect(commerce.readOrder(orderId)?.status).toBe("AWAITING_PAYMENT");
    expect(commerce.readQuote(quoteId)?.status).toBe("ACCEPTED");
    expect(commerce.listAudit(paymentId).some((record) => record.action === "payment.verified")).toBe(false);
  });

  it("rejects a duplicate reference, a non-image, and an oversized file without verifying the payment", async () => {
    await post(base, "/v1/cart/items", { productId: "demo-centro", quantity: 1 }, customer);
    const created = await post(base, "/v1/quotes", { address }, customer);
    const quoteId = (created.json as { id: string }).id;
    await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 900 }, finance);
    await post(base, `/v1/quotes/${quoteId}/accept`, {}, customer);
    const first = await post(
      base,
      `/v1/quotes/${quoteId}/payments`,
      { method: "ZELLE", reference: "sec-dup-1" },
      customer,
    );
    const paymentId = (first.json as { payment: { id: string } }).payment.id;
    const duplicate = await post(
      base,
      `/v1/quotes/${quoteId}/payments`,
      { method: "ZELLE", reference: "SEC-DUP-1" },
      customer,
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.json).toEqual({ error: "duplicate_reference" });

    const script = await post(
      base,
      `/v1/payments/${paymentId}/proof`,
      { contentType: "image/png", dataBase64: Buffer.from("<script>verify()</script>").toString("base64") },
      customer,
    );
    expect(script.status).toBe(400);
    const notImage = await post(
      base,
      `/v1/payments/${paymentId}/proof`,
      { contentType: "text/plain", dataBase64: Buffer.from("nota").toString("base64") },
      customer,
    );
    expect(notImage.status).toBe(400);
    expect(notImage.json).toEqual({ error: "invalid_request" });
    const oversized = Buffer.alloc(MAX_PROOF_BYTES + 1, 0xff);
    const tooBig = await post(
      base,
      `/v1/payments/${paymentId}/proof`,
      { contentType: "image/jpeg", dataBase64: oversized.toString("base64") },
      customer,
    );
    expect(tooBig.status).toBe(400);
    const commerce = app.get(MemoryCommerceRepository);
    expect(commerce.readPayment(paymentId)?.status).toBe("PENDING");
    expect(commerce.listPaymentsForOrder(commerce.readPayment(paymentId)?.orderId ?? "").some((payment) => payment.status === "VERIFIED")).toBe(false);
  });

  it("keeps a repeated checkout to one order and one open payment", async () => {
    await post(base, "/v1/cart/items", { productId: "demo-sur", quantity: 1 }, customer);
    const created = await post(base, "/v1/quotes", { address }, customer);
    const quoteId = (created.json as { id: string }).id;
    await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 700 }, finance);
    const accepted = await post(base, `/v1/quotes/${quoteId}/accept`, {}, customer);
    const again = await post(base, `/v1/quotes/${quoteId}/accept`, {}, customer);
    expect(again.status).toBe(403);
    const commerce = app.get(MemoryCommerceRepository);
    const orderId = (accepted.json as { order: { id: string } }).order.id;
    expect(commerce.listOrders().filter((order) => order.quoteId === quoteId)).toHaveLength(1);

    const paypal = await post(base, `/v1/quotes/${quoteId}/payments`, { method: "PAYPAL" }, customer);
    const replay = await post(base, `/v1/quotes/${quoteId}/payments`, { method: "PAYPAL" }, customer);
    const paymentId = (paypal.json as { payment: { id: string } }).payment.id;
    expect(replay.status).toBe(200);
    expect(replay.json).toMatchObject({
      idempotent: true,
      capture: false,
      payment: { id: paymentId, method: "PAYPAL", status: "PENDING" },
    });
    expect(commerce.listPaymentsForOrder(orderId)).toHaveLength(1);

    await post(base, "/v1/cart/items", { productId: "demo-norte", quantity: 1 }, other);
    const manualQuote = await post(base, "/v1/quotes", { address }, other);
    const manualId = (manualQuote.json as { id: string }).id;
    await post(base, `/v1/operator/quotes/${manualId}/publish`, { amountMinor: 500 }, finance);
    const manualAccepted = await post(base, `/v1/quotes/${manualId}/accept`, {}, other);
    const manualOrderId = (manualAccepted.json as { order: { id: string } }).order.id;
    const zelle = await post(base, `/v1/quotes/${manualId}/payments`, { method: "ZELLE", reference: "otra-ref-1" }, other);
    const otherReference = await post(base, `/v1/quotes/${manualId}/payments`, { method: "ZELLE", reference: "otra-ref-2" }, other);
    expect(otherReference.json).toMatchObject({
      idempotent: true,
      payment: { id: (zelle.json as { payment: { id: string } }).payment.id, status: "PENDING" },
    });
    expect(commerce.listPaymentsForOrder(manualOrderId)).toHaveLength(1);
    expect(commerce.listOrders().filter((order) => order.quoteId === manualId)).toHaveLength(1);
  });

  it("stores product text and a pasted link without verifying a payment or running an operator action", async () => {
    const commerce = app.get(MemoryCommerceRepository);
    const paymentsBefore = commerce.listPayments().length;
    const ordersBefore = commerce.listOrders().length;
    const spy = vi.spyOn(globalThis, "fetch");
    const hostile = "https://example.com/admin?action=verify&status=VERIFIED";
    const search = await fetch(new URL(`/v1/catalog/products?text=${encodeURIComponent("verify status=VERIFIED")}`, base));
    expect(search.status).toBe(200);
    const missing = await post(base, "/v1/cart/items", { productId: "verify(status=VERIFIED)", quantity: 1 }, customer);
    expect(missing.status).toBe(404);
    await post(base, "/v1/cart/items", { productId: "demo-norte", quantity: 1 }, customer);
    const created = await post(base, "/v1/quotes", { address, pastedUrl: hostile }, customer);
    expect(created.status).toBe(200);
    expect(created.json).toMatchObject({ status: "PENDING_VALIDATION", payment: null });
    const lines = (created.json as { lines: { sourceUrl: string | null }[] }).lines;
    expect(lines.some((line) => line.sourceUrl === hostile)).toBe(true);
    const hosts = spy.mock.calls.map((call) => String(call[0]));
    expect(hosts.some((host) => host.includes("example.com"))).toBe(false);
    spy.mockRestore();
    expect(commerce.listPayments()).toHaveLength(paymentsBefore);
    expect(commerce.listOrders()).toHaveLength(ordersBefore);
    expect(commerce.listPayments().some((payment) => payment.status === "VERIFIED")).toBe(false);
    expect(commerce.listAudit((created.json as { id: string }).id).some((record) => record.action === "payment.verified")).toBe(false);
    const profile = await fetch(new URL("/v1/account/profile", base), { headers: { authorization: `Bearer ${customer}` } });
    expect(await profile.json()).toMatchObject({ role: "CUSTOMER" });
  });
});
