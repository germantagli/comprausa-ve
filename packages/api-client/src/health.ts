import { z } from "zod";

const healthSchema = z
  .object({
    status: z.literal("ok"),
    service: z.literal("api"),
    displayName: z.string(),
    catalog: z.literal("internal-demo"),
    otp: z.enum(["simulated", "resend", "twilio", "not_configured"]),
    payments: z.literal("not_configured"),
    stores: z.literal("no_external_connector"),
  })
  .strict();

const readySchema = z.object({ status: z.literal("ready") }).strict();

export type HealthResponse = z.infer<typeof healthSchema>;
export type ReadyResponse = z.infer<typeof readySchema>;

export async function getHealth(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  const response = await fetchImpl(new URL("/health", baseUrl));
  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }
  return healthSchema.parse(await response.json());
}

/** Readiness: Postgres reachable. Does not expose connection strings or secrets. */
export async function getReady(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<ReadyResponse> {
  const response = await fetchImpl(new URL("/health/ready", baseUrl));
  if (!response.ok) {
    throw new Error(`Ready request failed with status ${response.status}`);
  }
  return readySchema.parse(await response.json());
}
