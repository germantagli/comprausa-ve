import { randomUUID } from "node:crypto";
import { Inject, Injectable, Optional } from "@nestjs/common";
import type { OtpProvider } from "@comprausa/types";
import type { AuthRepository, AuthUser, ClientPlatform } from "./auth.repository";
import { AUTH_CLOCK, AUTH_RATE_POLICY, AUTH_REPOSITORY, DEV_OPERATOR, OTP_PROVIDER, RATE_LIMITER } from "./auth.tokens";
import type { Clock } from "./clock";
import type { AuthChannel } from "./destination";
import type { RoleCode } from "./roles";
import { normalizeDestination, otpDestinationKey } from "./destination";
import type { AuthRatePolicy, RateLimiter } from "./rate-limiter";
import { hashOpaqueToken, TokenService } from "./token.service";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REGISTRATION_TTL_SECONDS = 10 * 60;

export interface AuthenticatedBody {
  status: "authenticated";
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export type ChallengeBody =
  | { status: "accepted"; expiresInSeconds: number }
  | { status: "throttled" }
  | { status: "unavailable" };

export type VerifyBody =
  | { status: "rejected" }
  | { status: "throttled" }
  | { status: "unavailable" }
  | { status: "profile_required"; registrationToken: string }
  | AuthenticatedBody;

export type SessionBody = AuthenticatedBody | { status: "unauthorized" };

interface RateIdentity {
  ip: string;
  channel: AuthChannel;
  destination: string;
  deviceId: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    @Inject(RATE_LIMITER) private readonly limiter: RateLimiter,
    @Inject(OTP_PROVIDER) private readonly otp: OtpProvider | null,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(AUTH_CLOCK) private readonly clock: Clock,
    @Inject(AUTH_RATE_POLICY) private readonly policy: AuthRatePolicy,
    @Optional() @Inject(DEV_OPERATOR) private readonly devOperator: { email: string; role: RoleCode } | null = null,
  ) {}

  async challenge(input: {
    channel: AuthChannel;
    destination: string;
    deviceId: string;
    ip: string;
  }): Promise<ChallengeBody> {
    if (!this.otp) {
      return { status: "unavailable" };
    }
    const destination = normalizeDestination(input.channel, input.destination);
    const allowed = await this.allow("challenge", { ...input, destination });
    if (!allowed) {
      return { status: "throttled" };
    }
    const issued = await this.otp.issue(otpDestinationKey(input.channel, destination));
    if (issued.status === "throttled") {
      return { status: "throttled" };
    }
    return { status: "accepted", expiresInSeconds: issued.expiresInSeconds };
  }

  async verify(input: {
    channel: AuthChannel;
    destination: string;
    code: string;
    deviceId: string;
    platform: ClientPlatform;
    ip: string;
  }): Promise<VerifyBody> {
    if (!this.otp) {
      return { status: "unavailable" };
    }
    const destination = normalizeDestination(input.channel, input.destination);
    const allowed = await this.allow("verify", { ...input, destination });
    if (!allowed) {
      return { status: "throttled" };
    }
    const verdict = await this.otp.verify(otpDestinationKey(input.channel, destination), input.code);
    if (verdict !== "approved") {
      return { status: "rejected" };
    }
    const existing = await this.repository.findUserByDestination(input.channel, destination);
    if (!existing) {
      const registrationToken = await this.issueRegistration(input.channel, destination);
      return { status: "profile_required", registrationToken };
    }
    const user = await this.withDevelopmentRole(existing, input.channel, destination);
    return this.openSession(user, { clientDeviceId: input.deviceId, platform: input.platform });
  }

  async register(input: {
    registrationToken: string;
    givenName: string;
    familyName: string;
    deviceId: string;
    platform: ClientPlatform;
  }): Promise<SessionBody> {
    const claims = await this.tokens.verifyRegistration(input.registrationToken);
    if (!claims) {
      return { status: "unauthorized" };
    }
    const grant = await this.repository.consumeRegistrationGrant(claims.jti, new Date(this.clock.now()));
    if (!grant || grant.channel !== claims.channel || grant.destination !== claims.destination) {
      return { status: "unauthorized" };
    }
    const existing = await this.repository.findUserByDestination(grant.channel, grant.destination);
    const created =
      existing ??
      (await this.repository.createCustomer({
        channel: grant.channel,
        destination: grant.destination,
        givenName: input.givenName.trim(),
        familyName: input.familyName.trim(),
      }));
    const user = await this.withDevelopmentRole(created, grant.channel, grant.destination);
    return this.openSession(user, { clientDeviceId: input.deviceId, platform: input.platform });
  }

  async refresh(refreshToken: string): Promise<SessionBody> {
    const current = await this.repository.findSessionByRefreshHash(hashOpaqueToken(refreshToken));
    if (!current) {
      return { status: "unauthorized" };
    }
    const now = new Date(this.clock.now());
    const issued = this.tokens.issueRefresh();
    const nextId = randomUUID();
    const outcome = await this.repository.rotateSession(current.id, now, {
      id: nextId,
      userId: current.userId,
      familyId: current.familyId,
      deviceId: current.deviceId,
      refreshTokenHash: issued.hash,
      rotatedFromId: current.id,
      roleCode: current.roleCode,
      mfaSatisfied: current.mfaSatisfied,
      expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
      revokedAt: null,
      rotatedAt: null,
    });
    if (outcome !== "rotated") {
      return { status: "unauthorized" };
    }
    const accessToken = await this.tokens.signAccess(
      { sub: current.userId, sid: nextId, role: current.roleCode, mfa: current.mfaSatisfied },
      ACCESS_TTL_SECONDS,
    );
    return {
      status: "authenticated",
      accessToken,
      refreshToken: issued.token,
      expiresInSeconds: ACCESS_TTL_SECONDS,
    };
  }

  async profile(
    userId: string,
    access: { role: RoleCode; mfaSatisfied: boolean },
  ): Promise<{ givenName: string | null; familyName: string | null; role: RoleCode; mfaSatisfied: boolean } | null> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      return null;
    }
    return {
      givenName: user.givenName,
      familyName: user.familyName,
      role: access.role,
      mfaSatisfied: access.mfaSatisfied,
    };
  }

  private async withDevelopmentRole(user: AuthUser, channel: AuthChannel, destination: string): Promise<AuthUser> {
    if (!this.devOperator || channel !== "email" || destination !== this.devOperator.email) {
      return user;
    }
    await this.repository.assignRole(user.id, this.devOperator.role);
    return { ...user, roleCode: this.devOperator.role };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.repository.revokeSession(sessionId, new Date(this.clock.now()));
  }

  private async issueRegistration(channel: AuthChannel, destination: string): Promise<string> {
    const jti = randomUUID();
    const expiresAt = new Date(this.clock.now() + REGISTRATION_TTL_SECONDS * 1000);
    await this.repository.saveRegistrationGrant({
      jti,
      channel,
      destination,
      expiresAt,
      consumedAt: null,
    });
    return this.tokens.signRegistration({ jti, channel, destination }, REGISTRATION_TTL_SECONDS);
  }

  private async openSession(
    user: AuthUser,
    device: { clientDeviceId: string; platform: ClientPlatform },
  ): Promise<AuthenticatedBody> {
    const now = this.clock.now();
    const deviceId = await this.repository.upsertDevice({
      userId: user.id,
      clientDeviceId: device.clientDeviceId,
      platform: device.platform,
    });
    const sessionId = randomUUID();
    const refresh = this.tokens.issueRefresh();
    await this.repository.saveSession({
      id: sessionId,
      userId: user.id,
      familyId: randomUUID(),
      deviceId,
      refreshTokenHash: refresh.hash,
      rotatedFromId: null,
      roleCode: user.roleCode,
      mfaSatisfied: false,
      expiresAt: new Date(now + REFRESH_TTL_MS),
      revokedAt: null,
      rotatedAt: null,
    });
    const accessToken = await this.tokens.signAccess(
      { sub: user.id, sid: sessionId, role: user.roleCode, mfa: false },
      ACCESS_TTL_SECONDS,
    );
    return {
      status: "authenticated",
      accessToken,
      refreshToken: refresh.token,
      expiresInSeconds: ACCESS_TTL_SECONDS,
    };
  }

  private async allow(scope: "challenge" | "verify", input: RateIdentity): Promise<boolean> {
    const bucket = this.policy[scope];
    const checks: Array<[string, number]> = [
      [`${scope}:ip:${input.ip}`, bucket.ip],
      [`${scope}:identity:${input.channel}:${input.destination}`, bucket.identity],
      [`${scope}:device:${input.deviceId}`, bucket.device],
    ];
    let allowed = true;
    for (const [key, limit] of checks) {
      const decision = await this.limiter.consume(key, limit, bucket.windowMs);
      if (!decision.allowed) {
        allowed = false;
      }
    }
    return allowed;
  }
}
