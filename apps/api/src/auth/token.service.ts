import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import type { AuthChannel } from "./destination";
import { isRoleCode, type RoleCode } from "./roles";

export interface AccessClaims {
  sub: string;
  sid: string;
  role: RoleCode;
  mfa: boolean;
}

export interface RegistrationClaims {
  jti: string;
  channel: AuthChannel;
  destination: string;
  oauthProvider?: "google" | "apple";
  oauthSubject?: string;
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Access JWTs and opaque refresh tokens. Signing is jose HS256; refresh tokens are random bytes. */
export class TokenService {
  private readonly key: Uint8Array;

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }

  async signAccess(claims: AccessClaims, ttlSeconds: number): Promise<string> {
    return new SignJWT({ sid: claims.sid, role: claims.role, mfa: claims.mfa })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(claims.sub)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
      .sign(this.key);
  }

  async verifyAccess(token: string): Promise<AccessClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: ["HS256"] });
      const { sub, sid, role, mfa } = payload;
      if (typeof sub !== "string" || typeof sid !== "string" || typeof role !== "string" || typeof mfa !== "boolean") {
        return null;
      }
      if (!isRoleCode(role)) {
        return null;
      }
      return { sub, sid, role, mfa };
    } catch {
      return null;
    }
  }

  async signRegistration(claims: RegistrationClaims, ttlSeconds: number): Promise<string> {
    return new SignJWT({
      purpose: "registration",
      channel: claims.channel,
      destination: claims.destination,
      ...(claims.oauthProvider && claims.oauthSubject
        ? { oauthProvider: claims.oauthProvider, oauthSubject: claims.oauthSubject }
        : {}),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(claims.jti)
      .setJti(claims.jti)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
      .sign(this.key);
  }

  async verifyRegistration(token: string): Promise<RegistrationClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: ["HS256"] });
      const { purpose, channel, destination, jti, sub, oauthProvider, oauthSubject } = payload;
      if (purpose !== "registration" || (channel !== "email" && channel !== "phone")) {
        return null;
      }
      if (typeof destination !== "string" || typeof jti !== "string" || sub !== jti) {
        return null;
      }
      const claims: RegistrationClaims = { jti, channel, destination };
      if (
        (oauthProvider === "google" || oauthProvider === "apple") &&
        typeof oauthSubject === "string" &&
        oauthSubject.length > 0
      ) {
        claims.oauthProvider = oauthProvider;
        claims.oauthSubject = oauthSubject;
      }
      return claims;
    } catch {
      return null;
    }
  }

  issueRefresh(): { token: string; hash: string } {
    const token = randomBytes(32).toString("base64url");
    return { token, hash: hashOpaqueToken(token) };
  }
}
