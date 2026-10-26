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
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  ZELLE_INSTRUCTIONS: z.string().optional(),
  PAGO_MOVIL_BANK: z.string().optional(),
  PAGO_MOVIL_PHONE: z.string().optional(),
  PAGO_MOVIL_HOLDER: z.string().optional(),
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
  /** Present only for an sk_test_ key. Live keys are refused. */
  stripeTestKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  zelleInstructions: string | undefined;
  pagoMovil: { bank: string; phone: string; holder: string } | undefined;
}

export interface EnvSource {
  NODE_ENV?: string;
  PORT?: string;
  APP_DISPLAY_NAME?: string;
  DATABASE_URL?: string;
  OTP_PROVIDER?: string;
  AUTH_TOKEN_SECRET?: string;
  WEB_ORIGIN?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  ZELLE_INSTRUCTIONS?: string;
  PAGO_MOVIL_BANK?: string;
  PAGO_MOVIL_PHONE?: string;
  PAGO_MOVIL_HOLDER?: string;
}

export function parseAppEnv(source: EnvSource): AppEnv {
  const databaseUrl = blankToUndefined(source.DATABASE_URL);
  const authTokenSecret = blankToUndefined(source.AUTH_TOKEN_SECRET);
  const webOrigin = blankToUndefined(source.WEB_ORIGIN);
  const stripeSecretKey = blankToUndefined(source.STRIPE_SECRET_KEY);
  const stripeWebhookSecret = blankToUndefined(source.STRIPE_WEBHOOK_SECRET);
  const zelleInstructions = blankToUndefined(source.ZELLE_INSTRUCTIONS);
  const pagoMovilBank = blankToUndefined(source.PAGO_MOVIL_BANK);
  const pagoMovilPhone = blankToUndefined(source.PAGO_MOVIL_PHONE);
  const pagoMovilHolder = blankToUndefined(source.PAGO_MOVIL_HOLDER);
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
  if (stripeSecretKey) {
    input.STRIPE_SECRET_KEY = stripeSecretKey;
  }
  if (stripeWebhookSecret) {
    input.STRIPE_WEBHOOK_SECRET = stripeWebhookSecret;
  }
  if (zelleInstructions) {
    input.ZELLE_INSTRUCTIONS = zelleInstructions;
  }
  if (pagoMovilBank) {
    input.PAGO_MOVIL_BANK = pagoMovilBank;
  }
  if (pagoMovilPhone) {
    input.PAGO_MOVIL_PHONE = pagoMovilPhone;
  }
  if (pagoMovilHolder) {
    input.PAGO_MOVIL_HOLDER = pagoMovilHolder;
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
  if (stripeSecretKey?.startsWith("sk_live_") || stripeSecretKey?.startsWith("rk_live_")) {
    issues.push("Stripe live keys are refused");
  } else if (stripeSecretKey !== undefined && !stripeSecretKey.startsWith("sk_test_")) {
    issues.push("STRIPE_SECRET_KEY must be a test key");
  }
  if (stripeWebhookSecret !== undefined && !stripeWebhookSecret.startsWith("whsec_")) {
    issues.push("STRIPE_WEBHOOK_SECRET must be a webhook signing secret");
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
    stripeTestKey: stripeSecretKey,
    stripeWebhookSecret,
    zelleInstructions,
    pagoMovil:
      pagoMovilBank && pagoMovilPhone && pagoMovilHolder
        ? { bank: pagoMovilBank, phone: pagoMovilPhone, holder: pagoMovilHolder }
        : undefined,
  };
}

function blankToUndefined(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  return value.trim();
}
