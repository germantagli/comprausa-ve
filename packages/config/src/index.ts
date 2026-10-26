import { z } from "zod";

/** Not a secret. Production refuses this exact value. */
export const DEVELOPMENT_AUTH_TOKEN_SECRET = "development-only-not-a-secret-00";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_DISPLAY_NAME: z.string().trim().min(1).max(80).default("CompraUSA VE"),
  DATABASE_URL: z.string().trim().min(1).optional(),
  OTP_PROVIDER: z.enum(["simulated", "none"]).default("none"),
  AUTH_TOKEN_SECRET: z.string().optional(),
  WEB_ORIGIN: z.string().trim().min(1).optional(),
});

export interface AppEnv {
  nodeEnv: "development" | "test" | "production";
  port: number;
  displayName: string;
  databaseUrl: string | undefined;
  otpProvider: "simulated" | "none";
  /** True only when NODE_ENV is development and OTP_PROVIDER is simulated. */
  simulatedOtpAllowed: boolean;
  authTokenSecret: string;
  webOrigin: string | undefined;
}

export interface EnvSource {
  NODE_ENV?: string;
  PORT?: string;
  APP_DISPLAY_NAME?: string;
  DATABASE_URL?: string;
  OTP_PROVIDER?: string;
  AUTH_TOKEN_SECRET?: string;
  WEB_ORIGIN?: string;
}

export function parseAppEnv(source: EnvSource): AppEnv {
  const databaseUrl = blankToUndefined(source.DATABASE_URL);
  const authTokenSecret = blankToUndefined(source.AUTH_TOKEN_SECRET);
  const webOrigin = blankToUndefined(source.WEB_ORIGIN);
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
  if (source.OTP_PROVIDER) {
    input.OTP_PROVIDER = source.OTP_PROVIDER;
  }
  if (authTokenSecret) {
    input.AUTH_TOKEN_SECRET = authTokenSecret;
  }
  if (webOrigin) {
    input.WEB_ORIGIN = webOrigin;
  }
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }

  const nodeEnv = parsed.data.NODE_ENV;
  const otpProvider = parsed.data.OTP_PROVIDER;
  const issues: string[] = [];
  if (otpProvider === "simulated" && nodeEnv !== "development") {
    issues.push("OTP_PROVIDER=simulated is refused unless NODE_ENV is development");
  }
  if (nodeEnv === "production" && parsed.data.DATABASE_URL === undefined) {
    issues.push("DATABASE_URL is required in production");
  }
  if (nodeEnv === "production") {
    if (authTokenSecret === undefined || authTokenSecret.length < 32) {
      issues.push("AUTH_TOKEN_SECRET must be at least 32 characters in production");
    } else if (authTokenSecret === DEVELOPMENT_AUTH_TOKEN_SECRET) {
      issues.push("AUTH_TOKEN_SECRET must not be the development placeholder in production");
    }
  }
  if (issues.length > 0) {
    throw new Error(issues.join("; "));
  }

  return {
    nodeEnv,
    port: parsed.data.PORT,
    displayName: parsed.data.APP_DISPLAY_NAME,
    databaseUrl: parsed.data.DATABASE_URL,
    otpProvider,
    simulatedOtpAllowed: nodeEnv === "development" && otpProvider === "simulated",
    authTokenSecret: authTokenSecret ?? DEVELOPMENT_AUTH_TOKEN_SECRET,
    webOrigin: webOrigin ?? (nodeEnv === "development" ? "http://localhost:3000" : undefined),
  };
}

function blankToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  return value.trim();
}
