import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.service";
import type { Clock } from "./clock";
import { MemoryAuthRepository } from "./memory-auth.repository";
import { MemoryRateLimiter } from "./memory-rate-limiter";
import { defaultAuthRatePolicy, type AuthRatePolicy } from "./rate-limiter";
import { SimulatedOtpProvider } from "./simulated-otp.provider";
import { TokenService } from "./token.service";

const deviceId = "00000000-0000-4000-8000-0000000000aa";
const secret = "test-secret-value-with-32-chars!!";

function build(clock: Clock, policy: AuthRatePolicy = defaultAuthRatePolicy, withOtp = true) {
  const repository = new MemoryAuthRepository();
  const otp = withOtp ? new SimulatedOtpProvider({ nodeEnv: "development", otpProvider: "simulated" }, clock) : null;
  const tokens = new TokenService(secret);
  const service = new AuthService(repository, new MemoryRateLimiter(clock), otp, null, tokens, clock, policy);
  return { repository, otp, tokens, service };
}

async function codeFor(otp: SimulatedOtpProvider, key: string): Promise<string> {
  const code = otp.peekCode(key);
  if (!code) {
    throw new Error("missing otp");
  }
  return code;
}

describe("AuthService", () => {
  it("gives the same challenge and the same rejection whether or not the account exists", async () => {
    const clock = { now: () => Date.now() };
    const { service, otp } = build(clock);
    if (!otp) {
      throw new Error("otp");
    }
    await service.challenge({ channel: "email", destination: "Ana@Example.com", deviceId, ip: "203.0.113.8" });
    const code = await codeFor(otp, "email:ana@example.com");
    const created = await service.verify({
      channel: "email",
      destination: "ana@example.com",
      code,
      deviceId,
      platform: "WEB",
      ip: "203.0.113.8",
    });
    expect(created.status).toBe("profile_required");
    if (created.status !== "profile_required") {
      return;
    }
    await service.register({
      registrationToken: created.registrationToken,
      givenName: "Ana",
      familyName: "Pérez",
      deviceId,
      platform: "WEB",
    });

    const known = await service.challenge({
      channel: "email",
      destination: "ana@example.com",
      deviceId,
      ip: "203.0.113.8",
    });
    const unknown = await service.challenge({
      channel: "email",
      destination: "nadie@example.com",
      deviceId,
      ip: "203.0.113.9",
    });
    expect(known).toEqual(unknown);
    expect(JSON.stringify(known)).not.toContain(code);

    const wrongKnown = await service.verify({
      channel: "email",
      destination: "ana@example.com",
      code: "000000",
      deviceId,
      platform: "WEB",
      ip: "203.0.113.8",
    });
    const wrongUnknown = await service.verify({
      channel: "email",
      destination: "otra@example.com",
      code: "000000",
      deviceId,
      platform: "WEB",
      ip: "203.0.113.10",
    });
    expect(wrongKnown).toEqual({ status: "rejected" });
    expect(wrongUnknown).toEqual(wrongKnown);
  });

  it("opens a session for an existing person without changing the name", async () => {
    const clock = { now: () => Date.now() };
    const { service, otp, repository, tokens } = build(clock);
    if (!otp) {
      throw new Error("otp");
    }
    await service.challenge({ channel: "phone", destination: "+584121112233", deviceId, ip: "203.0.113.8" });
    const firstCode = await codeFor(otp, "phone:+584121112233");
    const profile = await service.verify({
      channel: "phone",
      destination: "+584121112233",
      code: firstCode,
      deviceId,
      platform: "IOS",
      ip: "203.0.113.8",
    });
    expect(profile.status).toBe("profile_required");
    if (profile.status !== "profile_required") {
      return;
    }
    const registered = await service.register({
      registrationToken: profile.registrationToken,
      givenName: "Ana",
      familyName: "Pérez",
      deviceId,
      platform: "IOS",
    });
    expect(registered.status).toBe("authenticated");
    expect(await service.register({
      registrationToken: profile.registrationToken,
      givenName: "Otra",
      familyName: "Persona",
      deviceId,
      platform: "IOS",
    })).toEqual({ status: "unauthorized" });

    await service.challenge({ channel: "phone", destination: "+584121112233", deviceId, ip: "203.0.113.8" });
    const secondCode = await codeFor(otp, "phone:+584121112233");
    const again = await service.verify({
      channel: "phone",
      destination: "+584121112233",
      code: secondCode,
      deviceId,
      platform: "IOS",
      ip: "203.0.113.8",
    });
    expect(again.status).toBe("authenticated");
    if (again.status !== "authenticated") {
      return;
    }
    expect(again.refreshToken.includes(".")).toBe(false);
    expect(again.accessToken.split(".").length).toBe(3);
    const claims = await tokens.verifyAccess(again.accessToken);
    expect(claims?.mfa).toBe(false);
    expect(claims?.role).toBe("CUSTOMER");
    expect((await repository.findUserByDestination("phone", "+584121112233"))?.givenName).toBe("Ana");
    expect(await service.verify({
      channel: "phone",
      destination: "+584121112233",
      code: secondCode,
      deviceId,
      platform: "IOS",
      ip: "203.0.113.8",
    })).toEqual({ status: "rejected" });
  });

  it("rejects a correct code after it expires or after five failures", async () => {
    const state = { now: Date.now() };
    const clock = { now: () => state.now };
    const { service, otp } = build(clock);
    if (!otp) {
      throw new Error("otp");
    }
    await service.challenge({ channel: "email", destination: "vence@example.com", deviceId, ip: "203.0.113.20" });
    const expired = await codeFor(otp, "email:vence@example.com");
    state.now += 121_000;
    expect(await service.verify({
      channel: "email",
      destination: "vence@example.com",
      code: expired,
      deviceId,
      platform: "WEB",
      ip: "203.0.113.20",
    })).toEqual({ status: "rejected" });

    await service.challenge({ channel: "email", destination: "intentos@example.com", deviceId, ip: "203.0.113.21" });
    const locked = await codeFor(otp, "email:intentos@example.com");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(await service.verify({
        channel: "email",
        destination: "intentos@example.com",
        code: "000000",
        deviceId,
        platform: "WEB",
        ip: "203.0.113.21",
      })).toEqual({ status: "rejected" });
    }
    expect(await service.verify({
      channel: "email",
      destination: "intentos@example.com",
      code: locked,
      deviceId,
      platform: "WEB",
      ip: "203.0.113.21",
    })).toEqual({ status: "rejected" });
  });

  it("rotates refresh tokens and revokes the family when an old token is reused", async () => {
    const clock = { now: () => Date.now() };
    const { service, otp } = build(clock);
    if (!otp) {
      throw new Error("otp");
    }
    await service.challenge({ channel: "email", destination: "rota@example.com", deviceId, ip: "203.0.113.30" });
    const code = await codeFor(otp, "email:rota@example.com");
    const profile = await service.verify({
      channel: "email",
      destination: "rota@example.com",
      code,
      deviceId,
      platform: "WEB",
      ip: "203.0.113.30",
    });
    if (profile.status !== "profile_required") {
      throw new Error("profile");
    }
    const first = await service.register({
      registrationToken: profile.registrationToken,
      givenName: "Rosa",
      familyName: "Díaz",
      deviceId,
      platform: "WEB",
    });
    if (first.status !== "authenticated") {
      throw new Error("session");
    }
    const second = await service.refresh(first.refreshToken);
    if (second.status !== "authenticated") {
      throw new Error("refresh");
    }
    expect(await service.refresh(first.refreshToken)).toEqual({ status: "unauthorized" });
    expect(await service.refresh(second.refreshToken)).toEqual({ status: "unauthorized" });
  });

  it("revokes one session without revoking a sibling in the same family", async () => {
    const clock = { now: () => Date.now() };
    const { service, repository, tokens } = build(clock);
    const user = await repository.createCustomer({
      channel: "email",
      destination: "dos@example.com",
      givenName: "Dos",
      familyName: "Sesiones",
    });
    const familyId = "00000000-0000-4000-8000-0000000000bb";
    const first = tokens.issueRefresh();
    const second = tokens.issueRefresh();
    const expiresAt = new Date(clock.now() + 60_000);
    await repository.saveSession({
      id: "00000000-0000-4000-8000-0000000000c1",
      userId: user.id,
      familyId,
      deviceId: null,
      refreshTokenHash: first.hash,
      rotatedFromId: null,
      roleCode: "CUSTOMER",
      mfaSatisfied: false,
      expiresAt,
      revokedAt: null,
      rotatedAt: null,
    });
    await repository.saveSession({
      id: "00000000-0000-4000-8000-0000000000c2",
      userId: user.id,
      familyId,
      deviceId: null,
      refreshTokenHash: second.hash,
      rotatedFromId: null,
      roleCode: "CUSTOMER",
      mfaSatisfied: false,
      expiresAt,
      revokedAt: null,
      rotatedAt: null,
    });
    await service.revoke("00000000-0000-4000-8000-0000000000c1");
    expect((await service.refresh(second.token)).status).toBe("authenticated");
    expect(await service.refresh(first.token)).toEqual({ status: "unauthorized" });
  });

  it("throttles by IP and by identity with the same body", async () => {
    const clock = { now: () => Date.now() };
    const policy: AuthRatePolicy = {
      challenge: { identity: 1, ip: 10, device: 10, windowMs: 60_000 },
      verify: defaultAuthRatePolicy.verify,
    };
    const { service } = build(clock, policy);
    const first = await service.challenge({
      channel: "email",
      destination: "uno@example.com",
      deviceId,
      ip: "203.0.113.40",
    });
    const repeat = await service.challenge({
      channel: "email",
      destination: "uno@example.com",
      deviceId: "00000000-0000-4000-8000-0000000000ab",
      ip: "203.0.113.41",
    });
    const other = await service.challenge({
      channel: "email",
      destination: "dos@example.com",
      deviceId: "00000000-0000-4000-8000-0000000000ac",
      ip: "203.0.113.42",
    });
    expect(first).toEqual({ status: "accepted", expiresInSeconds: 120 });
    expect(repeat).toEqual({ status: "throttled" });
    expect(other).toEqual(first);

    const byIp = build(clock, {
      challenge: { identity: 10, ip: 1, device: 10, windowMs: 60_000 },
      verify: defaultAuthRatePolicy.verify,
    });
    expect((await byIp.service.challenge({
      channel: "email",
      destination: "ip-a@example.com",
      deviceId,
      ip: "198.51.100.8",
    })).status).toBe("accepted");
    expect(await byIp.service.challenge({
      channel: "email",
      destination: "ip-b@example.com",
      deviceId: "00000000-0000-4000-8000-0000000000ad",
      ip: "198.51.100.8",
    })).toEqual({ status: "throttled" });
  });

  it("answers unavailable for every destination when OTP is off", async () => {
    const { service } = build({ now: () => Date.now() }, defaultAuthRatePolicy, false);
    const known = await service.challenge({ channel: "email", destination: "ana@example.com", deviceId, ip: "203.0.113.1" });
    const unknown = await service.challenge({ channel: "email", destination: "nadie@example.com", deviceId, ip: "203.0.113.1" });
    expect(known).toEqual({ status: "unavailable" });
    expect(unknown).toEqual(known);
  });

  it("rejects a registration token after it expires", async () => {
    const state = { now: Date.now() };
    const { service, otp } = build({ now: () => state.now });
    if (!otp) {
      throw new Error("otp");
    }
    await service.challenge({ channel: "email", destination: "nuevo@example.com", deviceId, ip: "203.0.113.50" });
    const code = await codeFor(otp, "email:nuevo@example.com");
    const profile = await service.verify({
      channel: "email",
      destination: "nuevo@example.com",
      code,
      deviceId,
      platform: "ANDROID",
      ip: "203.0.113.50",
    });
    if (profile.status !== "profile_required") {
      throw new Error("profile");
    }
    state.now += 11 * 60_000;
    expect(await service.register({
      registrationToken: profile.registrationToken,
      givenName: "Nuevo",
      familyName: "Usuario",
      deviceId,
      platform: "ANDROID",
    })).toEqual({ status: "unauthorized" });
  });

  it("keeps MFA false when an operator signs in with OTP", async () => {
    const clock = { now: () => Date.now() };
    const { service, otp, repository, tokens } = build(clock);
    if (!otp) {
      throw new Error("otp");
    }
    const seeded = await repository.createCustomer({
      channel: "email",
      destination: "ops@example.com",
      givenName: "Op",
      familyName: "Erador",
    });
    repository.setRole(seeded.id, "OPERATIONS_ADMIN");
    await service.challenge({ channel: "email", destination: "ops@example.com", deviceId, ip: "203.0.113.60" });
    const code = await codeFor(otp, "email:ops@example.com");
    const session = await service.verify({
      channel: "email",
      destination: "ops@example.com",
      code,
      deviceId,
      platform: "WEB",
      ip: "203.0.113.60",
    });
    if (session.status !== "authenticated") {
      throw new Error("session");
    }
    const claims = await tokens.verifyAccess(session.accessToken);
    expect(claims?.role).toBe("OPERATIONS_ADMIN");
    expect(claims?.mfa).toBe(false);
  });
});
