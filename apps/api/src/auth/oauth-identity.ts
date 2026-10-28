export type OAuthProvider = "google" | "apple";

export interface VerifiedOAuthIdentity {
  provider: OAuthProvider;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  givenName: string | null;
  familyName: string | null;
}

export function prismaIdentityProvider(provider: OAuthProvider): "GOOGLE" | "APPLE" {
  return provider === "google" ? "GOOGLE" : "APPLE";
}
