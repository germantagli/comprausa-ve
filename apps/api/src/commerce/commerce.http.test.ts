import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { parseAppEnv } from "@comprausa/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthModule } from "../auth/auth.module";
import { ZodExceptionFilter } from "../http/zod-exception.filter";
import { CommerceModule } from "./commerce.module";

const deviceId = "00000000-0000-4000-8000-0000000000bb";
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
  return { status: response.status, text, json: text.length > 0 ? JSON.parse(text) : null };
}

describe("commerce HTTP", () => {
  let app: INestApplication;
  let base: string;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule.registerFrom(parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "simulated" })), CommerceModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalFilters(new ZodExceptionFilter());
    await app.init();
    await app.listen(0, "127.0.0.1");
    const addressInfo = app.getHttpServer().address();
    const port = typeof addressInfo === "object" && addressInfo ? addressInfo.port : 0;
    base = `http://127.0.0.1:${port}`;
    const destination = "carrito@example.com";
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
    token = (registered.json as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it("keeps an unknown price out of the subtotal and refuses a client final quote", async () => {
    const added = await post(base, "/v1/cart/items", { productId: "demo-norte", quantity: 2 }, token);
    expect(added.status).toBe(200);
    expect(added.json).toMatchObject({
      subtotal: { knownMinor: null, includesUnknown: true },
      groups: [{ storeName: "Sin tienda", items: [{ productId: "demo-norte", quantity: 2, unitAmountMinor: null }] }],
    });
    expect(JSON.stringify(added.json)).not.toContain('"unitAmountMinor":0');

    const spy = vi.spyOn(globalThis, "fetch");
    const quote = await post(
      base,
      "/v1/quotes",
      { address, pastedUrl: "https://example.com/item/1", status: "FINAL" },
      token,
    );
    expect(quote.status).toBe(400);
    const created = await post(base, "/v1/quotes", { address, pastedUrl: "https://example.com/item/1" }, token);
    expect(created.status).toBe(200);
    expect(created.json).toMatchObject({
      status: "PENDING_VALIDATION",
      snapshot: null,
      subtotal: { knownMinor: null, includesUnknown: true },
    });
    const lines = (created.json as { lines: { sourceUrl: string | null; unitAmountMinor: number | null }[] }).lines;
    expect(lines.some((line) => line.sourceUrl === "https://example.com/item/1" && line.unitAmountMinor === null)).toBe(true);
    expect(spy.mock.calls.some((call) => String(call[0]).includes("example.com"))).toBe(false);
    spy.mockRestore();

    const id = (created.json as { id: string }).id;
    const finalized = await post(base, `/v1/quotes/${id}/finalize`, {}, token);
    const paid = await post(base, `/v1/quotes/${id}/pay`, {}, token);
    expect(finalized.status).toBe(403);
    expect(finalized.json).toEqual({ error: "forbidden" });
    expect(paid.status).toBe(403);
    expect(paid.json).toEqual({ error: "forbidden" });
    const stored = await fetch(new URL(`/v1/quotes/${id}`, base), { headers: { authorization: `Bearer ${token}` } });
    expect(await stored.json()).toMatchObject({ status: "PENDING_VALIDATION", snapshot: null });
  });
});