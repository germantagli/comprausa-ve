/** Public OAuth client IDs embedded at build time. Empty ⇒ button shows setup hint. */
export const googleWebClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
export const appleWebClientId = (process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? "").trim();

export function oauthConfigured(): { google: boolean; apple: boolean } {
  return {
    google: googleWebClientId.length > 0,
    apple: appleWebClientId.length > 0,
  };
}
