import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { parseAppEnv } from "@comprausa/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthModule } from "../auth/auth.module";
import type { RoleCode } from "../auth/roles";
import { MemoryAuthRepository } from "../auth/memory-auth.repository";
import { TokenService } from "../auth/token.service";
import { ZodExceptionFilter } from "../http/zod-exception.filter";
import { CommerceModule } from "./commerce.module";
import { MemoryCommerceRepository } from "./memory-commerce.repository";

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
  return { status: response.status, json: text.length > 0 ? JSON.parse(text) : null, text };
}

async function get(base: string, path: string, token: string) {
  const response = await fetch(new URL(path, base), { headers: { authorization: `Bearer ${token}` } });
  const text = await response.text();
  return { status: response.status, json: text.length > 0 ? JSON.parse(text) : null, text };
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
    familyName: "Perez",
    deviceId,
    platform: "WEB",
  });
  return (registered.json as { accessToken: string }).accessToken;
}

describe("manual order tracking", () => {
  let app: INestApplication;
  let base: string;
  let customer: string;
  let other: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule.registerFrom(parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "simulated", ALLOW_IN_MEMORY_PERSISTENCE: "true" })), CommerceModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalFilters(new ZodExceptionFilter());
    await app.init();
    await app.listen(0, "127.0.0.1");
    const info = app.getHttpServer().address();
    const port = typeof info === "object" && info ? info.port : 0;
    base = `http://127.0.0.1:${port}`;
    customer = await register(base, "seguimiento@example.com", "00000000-0000-4000-8000-0000000000d1");
    other = await register(base, "ajeno@example.com", "00000000-0000-4000-8000-0000000000d2");
  });

  afterAll(async () => {
    await app?.close();
  });

  it("blocks a jump to delivered and a client move, then records the store purchase as the operator", async () => {
    await post(base, "/v1/cart/items", { productId: "demo-norte", quantity: 1 }, customer);
    const created = await post(base, "/v1/quotes", { address }, customer);
    const quoteId = (created.json as { id: string }).id;

    const auth = app.get(MemoryAuthRepository);
    const tokens = app.get(TokenService);
    const operator = await auth.createCustomer({
      channel: "email",
      destination: "logistica@example.com",
      givenName: "Lia",
      familyName: "Rojas",
    });
    auth.setRole(operator.id, "LOGISTICS_AGENT");
    const support = await auth.createCustomer({
      channel: "email",
      destination: "ayuda@example.com",
      givenName: "Sol",
      familyName: "Mesa",
    });
    auth.setRole(support.id, "SUPPORT_AGENT");
    const expiresAt = new Date(Date.now() + 60_000);
    async function session(userId: string, role: RoleCode, mfa: boolean): Promise<string> {
      const id = randomUUID();
      await auth.saveSession({
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
    const finance = await auth.createCustomer({
      channel: "email",
      destination: "caja@example.com",
      givenName: "Carmen",
      familyName: "Rivas",
    });
    auth.setRole(finance.id, "FINANCE_AGENT");
    const financeMfa = await session(finance.id, "FINANCE_AGENT", true);
    const withoutMfa = await session(operator.id, "LOGISTICS_AGENT", false);
    const withMfa = await session(operator.id, "LOGISTICS_AGENT", true);
    const supportMfa = await session(support.id, "SUPPORT_AGENT", true);

    const published = await post(base, `/v1/operator/quotes/${quoteId}/publish`, { amountMinor: 2500 }, financeMfa);
    expect(published.status).toBe(200);
    const accepted = await post(base, `/v1/quotes/${quoteId}/accept`, {}, customer);
    const orderId = (accepted.json as { order: { id: string } }).order.id;
    const commerce = app.get(MemoryCommerceRepository);
    const current = commerce.readOrder(orderId);
    expect(current?.purchasedFromStore).toBe(false);
    commerce.saveOrder({ ...current!, status: "PAID", procurementStatus: "NOT_STARTED", purchasedFromStore: false });

    const skipped = await post(base, `/v1/operator/orders/${orderId}/events`, { status: "DELIVERED", note: "Ya llegó" }, withMfa);
    expect(skipped.status).toBe(409);
    expect(skipped.json).toEqual({ error: "invalid_transition" });
    expect(commerce.readOrder(orderId)).toMatchObject({ status: "PAID", purchasedFromStore: false, procurementStatus: "NOT_STARTED" });

    expect((await post(base, `/v1/orders/${orderId}/events`, { status: "PURCHASED_FROM_STORE", note: "Yo lo compro" }, customer)).status).toBe(403);
    expect((await post(base, `/v1/operator/orders/${orderId}/events`, { status: "PROCUREMENT_PENDING", note: "Siguiente" }, customer)).status).toBe(403);
    expect((await post(base, `/v1/operator/orders/${orderId}/events`, { status: "PROCUREMENT_PENDING", note: "Siguiente" }, withoutMfa)).status).toBe(403);
    expect((await post(base, `/v1/operator/orders/${orderId}/events`, { status: "PROCUREMENT_PENDING", note: "Siguiente" }, supportMfa)).status).toBe(403);

    const pending = await post(base, `/v1/operator/orders/${orderId}/events`, { status: "PROCUREMENT_PENDING", note: "Compra por hacer" }, withMfa);
    expect(pending.status).toBe(200);
    expect(pending.json).toMatchObject({ status: "PROCUREMENT_PENDING", purchasedFromStore: false, procurementStatus: "PENDING" });

    const purchased = await post(
      base,
      `/v1/operator/orders/${orderId}/events`,
      { status: "PURCHASED_FROM_STORE", note: "Quedó comprado en la tienda" },
      withMfa,
    );
    expect(purchased.status).toBe(200);
    expect(purchased.json).toMatchObject({
      status: "PURCHASED_FROM_STORE",
      purchasedFromStore: true,
      procurementStatus: "ORDERED_AT_STORE",
    });
    expect(purchased.json.timeline.at(-1)).toMatchObject({ status: "PURCHASED_FROM_STORE", actorId: operator.id, note: "Quedó comprado en la tienda" });
    expect(purchased.json.timeline.at(-1).occurredAt).toEqual(expect.any(String));
    expect(purchased.json).not.toHaveProperty("promisedAt");
    expect(commerce.listAudit(orderId)).toContainEqual(
      expect.objectContaining({
        actorId: operator.id,
        action: "order.purchased_from_store",
        entityType: "order",
        entityId: orderId,
      }),
    );

    expect((await get(base, `/v1/orders/${orderId}`, other)).status).toBe(404);
    const seen = await get(base, `/v1/orders/${orderId}`, customer);
    expect(seen.status).toBe(200);
    expect(seen.json.timeline.map((event: { status: string }) => event.status)).toEqual(["PROCUREMENT_PENDING", "PURCHASED_FROM_STORE"]);
    expect(seen.json.notices.map((notice: { message: string }) => notice.message)).toEqual([
      "Tu pedido cambió: Compra pendiente.",
      "Tu pedido cambió: Comprado en la tienda.",
    ]);
    expect(seen.text).not.toContain(operator.id);
    expect(seen.text).not.toContain("promisedAt");
    expect(seen.text).not.toContain("EMAIL");
    expect(seen.text).not.toContain("PUSH");
  });
});
