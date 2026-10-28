import { z } from "zod";

export class ApiClientError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`API request failed with status ${status}`);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

const challengeResponseSchema = z.union([
  z.object({ status: z.literal("accepted"), expiresInSeconds: z.number() }).strict(),
  z.object({ status: z.literal("throttled") }).strict(),
]);

const authenticatedSchema = z
  .object({
    status: z.literal("authenticated"),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresInSeconds: z.number().int(),
  })
  .strict();

const verificationResponseSchema = z.union([
  z.object({ status: z.literal("rejected") }).strict(),
  z.object({ status: z.literal("throttled") }).strict(),
  z.object({ status: z.literal("profile_required"), registrationToken: z.string() }).strict(),
  authenticatedSchema,
]);

export type OtpChallengeResponse = z.infer<typeof challengeResponseSchema>;
export type OtpVerificationResponse = z.infer<typeof verificationResponseSchema>;
export type AuthenticatedSession = z.infer<typeof authenticatedSchema>;

export interface OtpDestination {
  channel: "email" | "phone";
  destination: string;
  deviceId: string;
}

async function postJson(
  baseUrl: string,
  path: string,
  body: unknown,
  token: string | undefined,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(new URL(path, baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(0, { error: "network" });
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiClientError(response.status, payload);
  }
  return payload;
}

export async function requestOtpChallenge(
  baseUrl: string,
  input: OtpDestination,
  fetchImpl: typeof fetch = fetch,
): Promise<OtpChallengeResponse> {
  const payload = await postJson(baseUrl, "/v1/auth/otp/challenges", input, undefined, fetchImpl);
  return challengeResponseSchema.parse(payload);
}

export async function verifyOtp(
  baseUrl: string,
  input: OtpDestination & { code: string; platform: "IOS" | "ANDROID" | "WEB" },
  fetchImpl: typeof fetch = fetch,
): Promise<OtpVerificationResponse> {
  const payload = await postJson(baseUrl, "/v1/auth/otp/verifications", input, undefined, fetchImpl);
  return verificationResponseSchema.parse(payload);
}

export async function registerAccount(
  baseUrl: string,
  input: {
    registrationToken: string;
    givenName: string;
    familyName: string;
    deviceId: string;
    platform: "IOS" | "ANDROID" | "WEB";
  },
  fetchImpl: typeof fetch = fetch,
): Promise<AuthenticatedSession> {
  const payload = await postJson(baseUrl, "/v1/auth/registrations", input, undefined, fetchImpl);
  return authenticatedSchema.parse(payload);
}

export async function refreshSession(
  baseUrl: string,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthenticatedSession> {
  const payload = await postJson(baseUrl, "/v1/auth/sessions/refresh", { refreshToken }, undefined, fetchImpl);
  return authenticatedSchema.parse(payload);
}

const totpEnrollmentSchema = z
  .object({
    secret: z.string(),
    otpauthUri: z.string(),
  })
  .strict();

const totpSessionSchema = z
  .object({
    status: z.literal("authenticated"),
    accessToken: z.string(),
    expiresInSeconds: z.number().int(),
  })
  .strict();

export type TotpEnrollment = z.infer<typeof totpEnrollmentSchema>;
export type TotpSession = z.infer<typeof totpSessionSchema>;

export async function enrollTotp(baseUrl: string, accessToken: string, fetchImpl: typeof fetch = fetch): Promise<TotpEnrollment> {
  const payload = await postJson(baseUrl, "/v1/auth/totp/enrollments", {}, accessToken, fetchImpl);
  return totpEnrollmentSchema.parse(payload);
}

export async function verifyTotp(
  baseUrl: string,
  accessToken: string,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TotpSession> {
  const payload = await postJson(baseUrl, "/v1/auth/totp/verifications", { code }, accessToken, fetchImpl);
  return totpSessionSchema.parse(payload);
}

export async function revokeSession(
  baseUrl: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const payload = await postJson(baseUrl, "/v1/auth/sessions/revoke", {}, accessToken, fetchImpl);
  z.object({ status: z.literal("revoked") }).strict().parse(payload);
}

export { challengeResponseSchema };
