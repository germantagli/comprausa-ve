import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { parseAppEnv, type AppEnv } from "@comprausa/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { AuthModule } from "./auth.module";
import type { AuthRatePolicy } from "./rate-limiter";
import { defaultAuthRatePolicy } from "./rate-limiter";
import { MemoryAuthRepository } from "./memory-auth.repository";
import { SimulatedOtpProvider } from "./simulated-otp.provider";
import { TokenService } from "./token.service";
import { ZodExceptionFilter } from "../http/zod-exception.filter";

const deviceId = "00000000-0000-4000-8000-0000000000aa";

interface Booted {
  app: INestApplication;
  base: string;
}

async function boot(env: AppEnv, ratePolicy: AuthRatePolicy = defaultAuthRatePolicy): Promise<Booted> {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule.registerFrom(env, { ratePolicy })],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalFilters(new ZodExceptionFilter());
  await app.init();
  await app.listen(0, "127.0.0.1");
  const address = app.getHttpServer().address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { app, base: `http://127.0.0.1:${port}` };
}

async function post(
  base: string,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: unknown; text: string }> {
  const response = await fetch(new URL(path, base), {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, text, json: text.length > 0 ? JSON.parse(text) : null };
}

describe("auth HTTP", () => {
  let booted: Booted;

  beforeAll(async () => {
    booted = await boot(parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "simulated" }));
  });

  afterAll(async () => {
    await booted?.app.close();
  });

  it("keeps the code out of the challenge and returns it only from the development route", async () => {
    const logs: unknown[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(...args);
    });
    try {
      const challenge = await post(booted.base, "/v1/auth/otp/challenges", {
        channel: "email",
        destination: "http@example.com",
        deviceId,
      });
      const dev = await post(booted.base, "/v1/auth/dev/otp-code", {
        channel: "email",
        destination: "http@example.com",
      });
      const code = (dev.json as { code?: string }).code;
      expect(challenge.status).toBe(200);
      expect(challenge.json).toEqual({ status: "accepted", expiresInSeconds: 120 });
      expect(dev.status).toBe(200);
      expect(code).toMatch(/^\d{6}$/);
      expect(challenge.text).not.toContain(code);
      expect(logs.join(" ")).not.toContain(code);
      const provider = booted.app.get(SimulatedOtpProvider);
      expect(provider.peekCode("email:http@example.com")).toBe(code);
    } finally {
      spy.mockRestore();
    }
  });

  it("returns identical bodies for a known and an unknown destination", async () => {
    const knownChallenge = await post(booted.base, "/v1/auth/otp/challenges", {
      channel: "email",
      destination: "http@example.com",
      deviceId: "00000000-0000-4000-8000-0000000000b1",
    });
    const unknownChallenge = await post(booted.base, "/v1/auth/otp/challenges", {
      channel: "email",
      destination: "nadie-http@example.com",
      deviceId: "00000000-0000-4000-8000-0000000000b2",
    });
    expect(knownChallenge.json).toEqual(unknownChallenge.json);

    const knownVerify = await post(booted.base, "/v1/auth/otp/verifications", {
      channel: "email",
      destination: "http@example.com",
      code: "000000",
      deviceId,
      platform: "WEB",
    });
    const unknownVerify = await post(booted.base, "/v1/auth/otp/verifications", {
      channel: "email",
      destination: "otra-http@example.com",
      code: "000000",
      deviceId,
      platform: "WEB",
    });
    expect(knownVerify.status).toBe(200);
    expect(knownVerify.json).toEqual({ status: "rejected" });
    expect(unknownVerify.json).toEqual(knownVerify.json);
  });

  it("does not echo a rejected code in a validation error", async () => {
    const response = await post(booted.base, "/v1/auth/otp/verifications", {
      channel: "email",
      destination: "no-es-correo",
      code: "123456",
      deviceId,
      platform: "WEB",
    });
    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: "invalid_request" });
    expect(response.text).not.toContain("123456");
  });

  it("rotates and revokes a session over HTTP", async () => {
    const destination = "sesion@example.com";
    await post(booted.base, "/v1/auth/otp/challenges", { channel: "email", destination, deviceId });
    const dev = await post(booted.base, "/v1/auth/dev/otp-code", { channel: "email", destination });
    const code = (dev.json as { code: string }).code;
    const verified = await post(booted.base, "/v1/auth/otp/verifications", {
      channel: "email",
      destination: "SESION@example.com",
      code,
      deviceId,
      platform: "WEB",
    });
    expect(verified.json).toMatchObject({ status: "profile_required" });
    const registrationToken = (verified.json as { registrationToken: string }).registrationToken;
    expect(registrationToken).not.toContain(code);
    const registered = await post(booted.base, "/v1/auth/registrations", {
      registrationToken,
      givenName: "Ana",
      familyName: "Pérez",
      deviceId,
      platform: "WEB",
    });
    expect(registered.status).toBe(200);
    const first = registered.json as { accessToken: string; refreshToken: string; status: string };
    expect(first.status).toBe("authenticated");
    const profile = await fetch(new URL("/v1/account/profile", booted.base), {
      headers: { authorization: `Bearer ${first.accessToken}` },
    });
    expect(profile.status).toBe(200);
    expect(await profile.json()).toEqual({ givenName: "Ana", familyName: "Pérez" });
    const refreshed = await post(booted.base, "/v1/auth/sessions/refresh", { refreshToken: first.refreshToken });
    const second = refreshed.json as { accessToken: string; refreshToken: string };
    expect(refreshed.status).toBe(200);
    const reused = await post(booted.base, "/v1/auth/sessions/refresh", { refreshToken: first.refreshToken });
    expect(reused.status).toBe(401);
    expect(reused.json).toEqual({ error: "unauthorized" });
    const familyDead = await post(booted.base, "/v1/auth/sessions/refresh", { refreshToken: second.refreshToken });
    expect(familyDead.status).toBe(401);

    const again = await post(booted.base, "/v1/auth/otp/challenges", {
      channel: "email",
      destination,
      deviceId: "00000000-0000-4000-8000-0000000000b3",
    });
    expect(again.json).toEqual({ status: "accepted", expiresInSeconds: 120 });
    const nextCode = (await post(booted.base, "/v1/auth/dev/otp-code", { channel: "email", destination })).json as {
      code: string;
    };
    const session = await post(booted.base, "/v1/auth/otp/verifications", {
      channel: "email",
      destination,
      code: nextCode.code,
      deviceId,
      platform: "WEB",
    });
    const accessToken = (session.json as { accessToken: string }).accessToken;
    expect((session.json as { status: string }).status).toBe("authenticated");
    const admin = await fetch(new URL("/v1/admin/access", booted.base), {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(admin.status).toBe(403);
    expect(await admin.json()).toEqual({ error: "forbidden" });
    const revoked = await post(booted.base, "/v1/auth/sessions/revoke", {}, { authorization: `Bearer ${accessToken}` });
    expect(revoked.json).toEqual({ status: "revoked" });
    const after = await fetch(new URL("/v1/admin/access", booted.base), {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(after.status).toBe(401);
    expect(await after.json()).toEqual({ error: "unauthorized" });
  });

  it("blocks a client and an admin session that has not completed MFA", async () => {
    const missing = await fetch(new URL("/v1/admin/access", booted.base));
    expect(missing.status).toBe(401);
    const repository = booted.app.get(MemoryAuthRepository);
    const tokens = booted.app.get(TokenService);
    const user = await repository.createCustomer({
      channel: "email",
      destination: "guard@example.com",
      givenName: "Guarda",
      familyName: "Rutas",
    });
    repository.setRole(user.id, "OPERATIONS_ADMIN");
    const expiresAt = new Date(Date.now() + 60_000);
    const withoutMfa = randomUUID();
    const withMfa = randomUUID();
    await repository.saveSession({
      id: withoutMfa,
      userId: user.id,
      familyId: randomUUID(),
      deviceId: null,
      refreshTokenHash: tokens.issueRefresh().hash,
      rotatedFromId: null,
      roleCode: "OPERATIONS_ADMIN",
      mfaSatisfied: false,
      expiresAt,
      revokedAt: null,
      rotatedAt: null,
    });
    await repository.saveSession({
      id: withMfa,
      userId: user.id,
      familyId: randomUUID(),
      deviceId: null,
      refreshTokenHash: tokens.issueRefresh().hash,
      rotatedFromId: null,
      roleCode: "OPERATIONS_ADMIN",
      mfaSatisfied: true,
      expiresAt,
      revokedAt: null,
      rotatedAt: null,
    });
    const denied = await tokens.signAccess({ sub: user.id, sid: withoutMfa, role: "OPERATIONS_ADMIN", mfa: false }, 900);
    const allowed = await tokens.signAccess({ sub: user.id, sid: withMfa, role: "OPERATIONS_ADMIN", mfa: true }, 900);
    const forbidden = await fetch(new URL("/v1/admin/access", booted.base), {
      headers: { authorization: `Bearer ${denied}` },
    });
    const ok = await fetch(new URL("/v1/admin/access", booted.base), {
      headers: { authorization: `Bearer ${allowed}` },
    });
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "forbidden" });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ status: "ok" });
  });
});

describe("auth HTTP limits", () => {
  let booted: Booted;

  beforeAll(async () => {
    booted = await boot(parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "simulated" }), {
      challenge: { identity: 20, ip: 1, device: 20, windowMs: 60_000 },
      verify: defaultAuthRatePolicy.verify,
    });
  });

  afterAll(async () => {
    await booted?.app.close();
  });

  it("throttles a second address even when X-Forwarded-For changes", async () => {
    const first = await post(
      booted.base,
      "/v1/auth/otp/challenges",
      { channel: "email", destination: "limite-a@example.com", deviceId: "00000000-0000-4000-8000-0000000000d1" },
      { "x-forwarded-for": "198.51.100.1" },
    );
    const second = await post(
      booted.base,
      "/v1/auth/otp/challenges",
      { channel: "email", destination: "limite-b@example.com", deviceId: "00000000-0000-4000-8000-0000000000d2" },
      { "x-forwarded-for": "198.51.100.2" },
    );
    expect(first.json).toEqual({ status: "accepted", expiresInSeconds: 120 });
    expect(second.status).toBe(200);
    expect(second.json).toEqual({ status: "throttled" });
  });
});

describe("auth HTTP without the simulated provider", () => {
  let booted: Booted;

  beforeAll(async () => {
    booted = await boot(parseAppEnv({ NODE_ENV: "development" }));
  });

  afterAll(async () => {
    await booted?.app.close();
  });

  it("answers otp_not_configured and does not mount the development route", async () => {
    const first = await post(booted.base, "/v1/auth/otp/challenges", {
      channel: "email",
      destination: "ana@example.com",
      deviceId,
    });
    const second = await post(booted.base, "/v1/auth/otp/challenges", {
      channel: "email",
      destination: "nadie@example.com",
      deviceId,
    });
    expect(first.status).toBe(503);
    expect(first.json).toEqual({ error: "otp_not_configured" });
    expect(second.json).toEqual(first.json);
    const dev = await post(booted.base, "/v1/auth/dev/otp-code", {
      channel: "email",
      destination: "ana@example.com",
    });
    expect(dev.status).toBe(404);
  });
});
