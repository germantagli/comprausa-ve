import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { parseAppEnv } from "@comprausa/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthModule } from "../auth/auth.module";
import { MemoryAuthRepository } from "../auth/memory-auth.repository";
import { TokenService } from "../auth/token.service";
import { ZodExceptionFilter } from "../http/zod-exception.filter";
import { MemoryProductRequestRepository } from "./memory-product-request.repository";
import { ProductRequestModule } from "./product-request.module";

const deviceId = "00000000-0000-4000-8000-0000000000cc";

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

async function get(base: string, path: string, token?: string) {
  const response = await fetch(new URL(path, base), {
    headers: {
      accept: "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await response.text();
  return { status: response.status, json: text.length > 0 ? JSON.parse(text) : null };
}

async function registerCustomer(base: string, destination: string): Promise<string> {
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

describe("product request HTTP", () => {
  let app: INestApplication;
  let base: string;
  let customerToken: string;
  let otherToken: string;
  let adminToken: string;
  let memory: MemoryProductRequestRepository;
  let authRepo: MemoryAuthRepository;
  let tokens: TokenService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.registerFrom(parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "simulated", ALLOW_IN_MEMORY_PERSISTENCE: "true" })),
        ProductRequestModule.register(),
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalFilters(new ZodExceptionFilter());
    await app.init();
    await app.listen(0, "127.0.0.1");
    const addressInfo = app.getHttpServer().address();
    const port = typeof addressInfo === "object" && addressInfo ? addressInfo.port : 0;
    base = `http://127.0.0.1:${port}`;
    memory = moduleRef.get(MemoryProductRequestRepository);
    authRepo = moduleRef.get(MemoryAuthRepository);
    tokens = moduleRef.get(TokenService);

    customerToken = await registerCustomer(base, "cliente@example.com");
    otherToken = await registerCustomer(base, "otro@example.com");

    const adminUser = await authRepo.createCustomer({
      channel: "email",
      destination: "admin@example.com",
      givenName: "Ops",
      familyName: "Admin",
    });
    authRepo.setRole(adminUser.id, "OPERATIONS_ADMIN");
    memory.seedUser({
      id: adminUser.id,
      email: "admin@example.com",
      phoneE164: null,
      givenName: "Ops",
      familyName: "Admin",
    });
    const sessionId = randomUUID();
    await authRepo.saveSession({
      id: sessionId,
      userId: adminUser.id,
      familyId: randomUUID(),
      deviceId: null,
      refreshTokenHash: tokens.issueRefresh().hash,
      rotatedFromId: null,
      roleCode: "OPERATIONS_ADMIN",
      mfaSatisfied: false,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      revokedAt: null,
      rotatedAt: null,
    });
    adminToken = await tokens.signAccess(
      { sub: adminUser.id, sid: sessionId, role: "OPERATIONS_ADMIN", mfa: false },
      3600,
    );

    const customer = await authRepo.findUserByDestination("email", "cliente@example.com");
    const other = await authRepo.findUserByDestination("email", "otro@example.com");
    if (customer) {
      memory.seedUser({
        id: customer.id,
        email: "cliente@example.com",
        phoneE164: null,
        givenName: "Ana",
        familyName: "Pérez",
      });
    }
    if (other) {
      memory.seedUser({
        id: other.id,
        email: "otro@example.com",
        phoneE164: null,
        givenName: "Otro",
        familyName: "Cliente",
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates, lists, quotes, accepts, and isolates customers", async () => {
    const created = await post(
      base,
      "/v1/product-requests",
      {
        productUrl: "https://www.example.com/shoes",
        productName: "Zapatillas demo",
        quantity: 1,
        size: "42",
      },
      customerToken,
    );
    expect(created.status).toBe(201);
    const requestId = (created.json as { id: string }).id;
    expect((created.json as { requestNumber: string }).requestNumber).toMatch(/^TRS-\d{6}$/);

    const denied = await get(base, `/v1/product-requests/${requestId}`, otherToken);
    expect(denied.status).toBe(404);

    const staffDenied = await get(base, "/v1/admin/product-requests/metrics", customerToken);
    expect(staffDenied.status).toBe(403);

    const review = await post(base, `/v1/admin/product-requests/${requestId}/status`, { status: "IN_REVIEW" }, adminToken);
    expect(review.status).toBe(200);
    expect((review.json as { status: string }).status).toBe("IN_REVIEW");

    const quoted = await post(
      base,
      `/v1/admin/product-requests/${requestId}/quotes`,
      {
        productUnitPriceMinor: 5999,
        domesticShippingMinor: 500,
        internationalShippingMinor: 2500,
        serviceFeeMinor: 800,
        taxesMinor: 0,
        additionalCostsMinor: 0,
        discountMinor: 0,
        estimatedDeliveryDays: 14,
        customerMessage: "Disponible en talla 42",
        send: true,
      },
      adminToken,
    );
    expect(quoted.status).toBe(200);
    expect((quoted.json as { status: string; totalMinor: number }).status).toBe("SENT");
    expect((quoted.json as { totalMinor: number }).totalMinor).toBe(5999 + 500 + 2500 + 800);

    const detail = await get(base, `/v1/product-requests/${requestId}`, customerToken);
    expect(detail.status).toBe(200);
    expect((detail.json as { status: string }).status).toBe("QUOTED");
    expect((detail.json as { quote: { totalMinor: number } }).quote.totalMinor).toBe(9799);

    const accepted = await post(base, `/v1/product-requests/${requestId}/accept`, {}, customerToken);
    expect(accepted.status).toBe(200);
    expect((accepted.json as { orderId: string }).orderId).toBeTruthy();

    const again = await post(base, `/v1/product-requests/${requestId}/accept`, {}, customerToken);
    expect(again.status).toBe(200);
    expect((again.json as { orderId: string }).orderId).toBe((accepted.json as { orderId: string }).orderId);

    const metrics = await get(base, "/v1/admin/product-requests/metrics", adminToken);
    expect(metrics.status).toBe(200);
    expect((metrics.json as { accepted: number }).accepted).toBeGreaterThanOrEqual(1);

    const inbox = await get(base, "/v1/inbox/notifications", customerToken);
    expect(inbox.status).toBe(200);
    expect((inbox.json as { items: unknown[] }).items.length).toBeGreaterThan(0);
  });

  it("rejects invalid urls and negative quote totals", async () => {
    const bad = await post(base, "/v1/product-requests", { productUrl: "javascript:alert(1)", quantity: 1 }, customerToken);
    expect(bad.status).toBe(400);

    const created = await post(
      base,
      "/v1/product-requests",
      { productUrl: "https://www.example.com/bag", quantity: 2 },
      customerToken,
    );
    const id = (created.json as { id: string }).id;
    const quote = await post(
      base,
      `/v1/admin/product-requests/${id}/quotes`,
      {
        productUnitPriceMinor: 100,
        discountMinor: 10_000,
        send: false,
      },
      adminToken,
    );
    expect(quote.status).toBe(400);
  });
});
