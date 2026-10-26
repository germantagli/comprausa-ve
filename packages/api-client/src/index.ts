export {
  ApiClientError,
  refreshSession,
  registerAccount,
  requestOtpChallenge,
  revokeSession,
  verifyOtp,
} from "./auth";
export type { AuthenticatedSession, OtpChallengeResponse, OtpDestination, OtpVerificationResponse } from "./auth";

import { z } from "zod";

const healthSchema = z
  .object({
    status: z.literal("ok"),
    service: z.literal("api"),
    displayName: z.string(),
    catalog: z.literal("internal-demo"),
    otp: z.enum(["simulated", "not_configured"]),
    payments: z.literal("not_configured"),
    stores: z.literal("no_external_connector"),
  })
  .strict();

export type HealthResponse = z.infer<typeof healthSchema>;

export async function getHealth(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  const response = await fetchImpl(new URL("/health", baseUrl));
  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }
  return healthSchema.parse(await response.json());
}
