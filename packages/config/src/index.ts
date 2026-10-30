import { z } from "zod";

/** Not a secret. Production refuses this exact value. */
export const DEVELOPMENT_AUTH_TOKEN_SECRET = "development-only-not-a-secret-00";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_DISPLAY_NAME: z.string().trim().min(1).max(80).default("TraeLo"),
  DATABASE_URL: z.string().trim().min(1).optional(),
  OTP_PROVIDER: z.enum(["simulated", "none", "resend", "twilio"]).default("none"),
  AUTH_TOKEN_SECRET: z.string().optional(),
  WEB_ORIGIN: z.string().trim().min(1).optional(),
  RESEND_API_KEY: z.string().optional(),
  OTP_EMAIL_FROM: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  /** Comma-separated OAuth client IDs accepted as ID token audiences. */
  GOOGLE_CLIENT_IDS: z.string().optional(),
  APPLE_CLIENT_IDS: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  ZELLE_INSTRUCTIONS: z.string().optional(),
  PAGO_MOVIL_BANK: z.string().optional(),
  PAGO_MOVIL_PHONE: z.string().optional(),
  PAGO_MOVIL_HOLDER: z.string().optional(),
  /**
   * Explicit opt-in for in-memory auth/product-request stores when DATABASE_URL is absent.
   * Refused in production. Required in development without DATABASE_URL. Allowed implicitly in test.
   */
  ALLOW_IN_MEMORY_PERSISTENCE: z.enum(["true", "1", "false", "0"]).optional(),
});

export interface ResendOtpEnv {
  apiKey: string;
  from: string;
}

export interface TwilioVerifyEnv {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
}

export interface AppEnv {
  nodeEnv: "development" | "test" | "production";
  port: number;
  displayName: string;
  databaseUrl: string | undefined;
  otpProvider: "simulated" | "none" | "resend" | "twilio";
  /** True only when NODE_ENV is development and OTP_PROVIDER is simulated. */
  simulatedOtpAllowed: boolean;
  /**
   * When true, repositories may use process memory (no Postgres).
   * Never true in production. In development requires ALLOW_IN_MEMORY_PERSISTENCE when DATABASE_URL is absent.
   */
  allowInMemoryPersistence: boolean;
  /** Where durable domain data is expected to live. */
  persistence: "postgres" | "memory";
  resendOtp: ResendOtpEnv | undefined;
  twilioVerify: TwilioVerifyEnv | undefined;
  googleClientIds: string[];
  appleClientIds: string[];
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
  RESEND_API_KEY?: string;
  OTP_EMAIL_FROM?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_VERIFY_SERVICE_SID?: string;
  GOOGLE_CLIENT_IDS?: string;
  APPLE_CLIENT_IDS?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  ZELLE_INSTRUCTIONS?: string;
  PAGO_MOVIL_BANK?: string;
  PAGO_MOVIL_PHONE?: string;
  PAGO_MOVIL_HOLDER?: string;
  ALLOW_IN_MEMORY_PERSISTENCE?: string;
}

export function parseAppEnv(source: EnvSource): AppEnv {
  const databaseUrl = blankToUndefined(source.DATABASE_URL);
  const authTokenSecret = blankToUndefined(source.AUTH_TOKEN_SECRET);
  const webOrigin = blankToUndefined(source.WEB_ORIGIN);
  const resendApiKey = blankToUndefined(source.RESEND_API_KEY);
  const otpEmailFrom = blankToUndefined(source.OTP_EMAIL_FROM);
  const twilioAccountSid = blankToUndefined(source.TWILIO_ACCOUNT_SID);
  const twilioAuthToken = blankToUndefined(source.TWILIO_AUTH_TOKEN);
  const twilioVerifyServiceSid = blankToUndefined(source.TWILIO_VERIFY_SERVICE_SID);
  const googleClientIdsRaw = blankToUndefined(source.GOOGLE_CLIENT_IDS);
  const appleClientIdsRaw = blankToUndefined(source.APPLE_CLIENT_IDS);
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
  if (resendApiKey) {
    input.RESEND_API_KEY = resendApiKey;
  }
  if (otpEmailFrom) {
    input.OTP_EMAIL_FROM = otpEmailFrom;
  }
  if (twilioAccountSid) {
    input.TWILIO_ACCOUNT_SID = twilioAccountSid;
  }
  if (twilioAuthToken) {
    input.TWILIO_AUTH_TOKEN = twilioAuthToken;
  }
  if (twilioVerifyServiceSid) {
    input.TWILIO_VERIFY_SERVICE_SID = twilioVerifyServiceSid;
  }
  if (googleClientIdsRaw) {
    input.GOOGLE_CLIENT_IDS = googleClientIdsRaw;
  }
  if (appleClientIdsRaw) {
    input.APPLE_CLIENT_IDS = appleClientIdsRaw;
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
  if (source.ALLOW_IN_MEMORY_PERSISTENCE) {
    input.ALLOW_IN_MEMORY_PERSISTENCE = source.ALLOW_IN_MEMORY_PERSISTENCE;
  }
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }

  const nodeEnv = parsed.data.NODE_ENV;
  const otpProvider = parsed.data.OTP_PROVIDER;
  const memoryFlag = parsed.data.ALLOW_IN_MEMORY_PERSISTENCE === "true" || parsed.data.ALLOW_IN_MEMORY_PERSISTENCE === "1";
  const issues: string[] = [];
  if (otpProvider === "simulated" && nodeEnv !== "development") {
    issues.push("OTP_PROVIDER=simulated is refused unless NODE_ENV is development");
  }
  if (otpProvider === "resend") {
    if (!resendApiKey) {
      issues.push("RESEND_API_KEY is required when OTP_PROVIDER=resend");
    }
    if (!otpEmailFrom) {
      issues.push("OTP_EMAIL_FROM is required when OTP_PROVIDER=resend");
    }
  }
  if (otpProvider === "twilio") {
    if (!twilioAccountSid) {
      issues.push("TWILIO_ACCOUNT_SID is required when OTP_PROVIDER=twilio");
    }
    if (!twilioAuthToken) {
      issues.push("TWILIO_AUTH_TOKEN is required when OTP_PROVIDER=twilio");
    }
    if (!twilioVerifyServiceSid) {
      issues.push("TWILIO_VERIFY_SERVICE_SID is required when OTP_PROVIDER=twilio");
    }
  }
  if (nodeEnv === "production" && parsed.data.DATABASE_URL === undefined) {
    issues.push("DATABASE_URL is required in production");
  }
  if (nodeEnv === "production" && memoryFlag) {
    issues.push("ALLOW_IN_MEMORY_PERSISTENCE is refused in production");
  }
  if (nodeEnv === "development" && parsed.data.DATABASE_URL === undefined && !memoryFlag) {
    issues.push(
      "DATABASE_URL is required in development unless ALLOW_IN_MEMORY_PERSISTENCE=true (ephemeral demo only)",
    );
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

  const hasDatabase = Boolean(parsed.data.DATABASE_URL);
  const allowInMemoryPersistence =
    !hasDatabase && (nodeEnv === "test" || (nodeEnv === "development" && memoryFlag));

  return {
    nodeEnv,
    port: parsed.data.PORT,
    displayName: parsed.data.APP_DISPLAY_NAME,
    databaseUrl: parsed.data.DATABASE_URL,
    otpProvider,
    simulatedOtpAllowed: nodeEnv === "development" && otpProvider === "simulated",
    allowInMemoryPersistence,
    persistence: hasDatabase ? "postgres" : "memory",
    resendOtp:
      otpProvider === "resend" && resendApiKey && otpEmailFrom
        ? { apiKey: resendApiKey, from: otpEmailFrom }
        : undefined,
    twilioVerify:
      otpProvider === "twilio" && twilioAccountSid && twilioAuthToken && twilioVerifyServiceSid
        ? {
            accountSid: twilioAccountSid,
            authToken: twilioAuthToken,
            verifyServiceSid: twilioVerifyServiceSid,
          }
        : undefined,
    googleClientIds: splitCsv(parsed.data.GOOGLE_CLIENT_IDS),
    appleClientIds: splitCsv(parsed.data.APPLE_CLIENT_IDS),
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

function splitCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
