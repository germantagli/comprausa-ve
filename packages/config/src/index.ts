import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_DISPLAY_NAME: z.string().trim().min(1).max(80).default("CompraUSA VE"),
  DATABASE_URL: z.string().trim().min(1).optional(),
  SIMULATED_OTP_ENABLED: z.enum(["true", "false"]).default("false"),
});

export interface AppEnv {
  nodeEnv: "development" | "test" | "production";
  port: number;
  displayName: string;
  databaseUrl: string | undefined;
  simulatedOtpAllowed: boolean;
}

export interface EnvSource {
  NODE_ENV?: string;
  PORT?: string;
  APP_DISPLAY_NAME?: string;
  DATABASE_URL?: string;
  SIMULATED_OTP_ENABLED?: string;
}

export function parseAppEnv(source: EnvSource): AppEnv {
  const databaseUrl = blankToUndefined(source.DATABASE_URL);
  const input: Record<string, string> = {};
  if (source.NODE_ENV) {
    input.NODE_ENV = source.NODE_ENV;
  }
  if (source.PORT) {
    input.PORT = source.PORT;
  }
  if (source.APP_DISPLAY_NAME) {
    input.APP_DISPLAY_NAME = source.APP_DISPLAY_NAME;
  }
  if (databaseUrl) {
    input.DATABASE_URL = databaseUrl;
  }
  if (source.SIMULATED_OTP_ENABLED) {
    input.SIMULATED_OTP_ENABLED = source.SIMULATED_OTP_ENABLED;
  }
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }
  const issues: string[] = [];
  if (parsed.data.NODE_ENV === "production" && parsed.data.DATABASE_URL === undefined) {
    issues.push("DATABASE_URL is required in production");
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.SIMULATED_OTP_ENABLED === "true") {
    issues.push("SIMULATED_OTP_ENABLED cannot be true in production");
  }
  if (issues.length > 0) {
    throw new Error(issues.join("; "));
  }
  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    displayName: parsed.data.APP_DISPLAY_NAME,
    databaseUrl: parsed.data.DATABASE_URL,
    simulatedOtpAllowed:
      parsed.data.NODE_ENV !== "production" && parsed.data.SIMULATED_OTP_ENABLED === "true",
  };
}

function blankToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  return value.trim();
}
