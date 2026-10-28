import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { OAuthProvider, VerifiedOAuthIdentity } from "./oauth-identity";

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export interface OAuthAudienceConfig {
  googleClientIds: string[];
  appleClientIds: string[];
}

/**
 * Verifies Google / Apple ID tokens with the issuer JWKS.
 * Never logs the token.
 */
export class OAuthTokenVerifier {
  constructor(private readonly audiences: OAuthAudienceConfig) {}

  async verify(provider: OAuthProvider, idToken: string): Promise<VerifiedOAuthIdentity | null> {
    try {
      if (provider === "google") {
        if (this.audiences.googleClientIds.length === 0) {
          return null;
        }
        const { payload } = await jwtVerify(idToken, googleJwks, {
          issuer: ["https://accounts.google.com", "accounts.google.com"],
          audience: this.audiences.googleClientIds,
        });
        return fromGoogle(payload);
      }
      if (this.audiences.appleClientIds.length === 0) {
        return null;
      }
      const { payload } = await jwtVerify(idToken, appleJwks, {
        issuer: "https://appleid.apple.com",
        audience: this.audiences.appleClientIds,
      });
      return fromApple(payload);
    } catch {
      return null;
    }
  }
}

function fromGoogle(payload: JWTPayload): VerifiedOAuthIdentity | null {
  const subject = asNonEmpty(payload.sub);
  if (!subject) {
    return null;
  }
  const email = asNonEmpty(payload.email)?.toLowerCase() ?? null;
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  return {
    provider: "google",
    subject,
    email,
    emailVerified,
    givenName: asNonEmpty(payload.given_name),
    familyName: asNonEmpty(payload.family_name),
  };
}

function fromApple(payload: JWTPayload): VerifiedOAuthIdentity | null {
  const subject = asNonEmpty(payload.sub);
  if (!subject) {
    return null;
  }
  const email = asNonEmpty(payload.email)?.toLowerCase() ?? null;
  const emailVerified =
    payload.email_verified === true || payload.email_verified === "true" || email !== null;
  return {
    provider: "apple",
    subject,
    email,
    emailVerified,
    givenName: null,
    familyName: null,
  };
}

function asNonEmpty(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
