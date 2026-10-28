import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.service";
import { MemoryAuthRepository } from "./memory-auth.repository";
import { MemoryRateLimiter } from "./memory-rate-limiter";
import type { VerifiedOAuthIdentity } from "./oauth-identity";
import type { OAuthTokenVerifier } from "./oauth-token.verifier";
import { defaultAuthRatePolicy } from "./rate-limiter";
import { TokenService } from "./token.service";

const deviceId = "00000000-0000-4000-8000-0000000000bb";
const secret = "test-secret-value-with-32-chars!!";

class FakeOAuthVerifier implements Pick<OAuthTokenVerifier, "verify"> {
  constructor(private readonly identity: VerifiedOAuthIdentity | null) {}

  async verify(): Promise<VerifiedOAuthIdentity | null> {
    return this.identity;
  }
}

describe("AuthService OAuth exchange", () => {
  it("opens a session when Google returns a verified profile with names", async () => {
    const clock = { now: () => Date.now() };
    const repository = new MemoryAuthRepository();
    const verifier = new FakeOAuthVerifier({
      provider: "google",
      subject: "google-sub-1",
      email: "ana@gmail.com",
      emailVerified: true,
      givenName: "Ana",
      familyName: "Pérez",
    });
    const service = new AuthService(
      repository,
      new MemoryRateLimiter(clock),
      null,
      verifier as unknown as OAuthTokenVerifier,
      new TokenService(secret),
      clock,
      defaultAuthRatePolicy,
    );
    const result = await service.exchangeOAuth({
      provider: "google",
      idToken: "fake.google.token",
      deviceId,
      platform: "WEB",
      ip: "203.0.113.9",
    });
    expect(result.status).toBe("authenticated");
  });

  it("asks for a profile when Apple has email but no name", async () => {
    const clock = { now: () => Date.now() };
    const repository = new MemoryAuthRepository();
    const verifier = new FakeOAuthVerifier({
      provider: "apple",
      subject: "apple-sub-1",
      email: "ana@privaterelay.appleid.com",
      emailVerified: true,
      givenName: null,
      familyName: null,
    });
    const service = new AuthService(
      repository,
      new MemoryRateLimiter(clock),
      null,
      verifier as unknown as OAuthTokenVerifier,
      new TokenService(secret),
      clock,
      defaultAuthRatePolicy,
    );
    const result = await service.exchangeOAuth({
      provider: "apple",
      idToken: "fake.apple.token",
      deviceId,
      platform: "WEB",
      ip: "203.0.113.9",
    });
    expect(result.status).toBe("profile_required");
  });

  it("returns unavailable when OAuth is not configured", async () => {
    const clock = { now: () => Date.now() };
    const service = new AuthService(
      new MemoryAuthRepository(),
      new MemoryRateLimiter(clock),
      null,
      null,
      new TokenService(secret),
      clock,
      defaultAuthRatePolicy,
    );
    await expect(
      service.exchangeOAuth({
        provider: "google",
        idToken: "fake.google.token",
        deviceId,
        platform: "WEB",
        ip: "203.0.113.9",
      }),
    ).resolves.toEqual({ status: "unavailable" });
  });
});
