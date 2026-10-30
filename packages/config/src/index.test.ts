import { describe, expect, it } from "vitest";
import { DEVELOPMENT_AUTH_TOKEN_SECRET, parseAppEnv } from "./index";

const productionSecret = "production-secret-value-with-32ch";

describe("parseAppEnv", () => {
  it("refuses development without DATABASE_URL unless memory persistence is explicit", () => {
    expect(() => parseAppEnv({ NODE_ENV: "development" })).toThrow(/ALLOW_IN_MEMORY_PERSISTENCE/);
  });

  it("allows development without a database when memory persistence is opted in", () => {
    const env = parseAppEnv({ NODE_ENV: "development", ALLOW_IN_MEMORY_PERSISTENCE: "true" });
    expect(env.databaseUrl).toBeUndefined();
    expect(env.allowInMemoryPersistence).toBe(true);
    expect(env.persistence).toBe("memory");
    expect(env.simulatedOtpAllowed).toBe(false);
    expect(env.otpProvider).toBe("none");
    expect(env.authTokenSecret).toBe(DEVELOPMENT_AUTH_TOKEN_SECRET);
  });

  it("uses postgres persistence when DATABASE_URL is set in development", () => {
    const env = parseAppEnv({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://comprausa:comprausa@127.0.0.1:5432/comprausa",
    });
    expect(env.persistence).toBe("postgres");
    expect(env.allowInMemoryPersistence).toBe(false);
  });

  it("allows simulated OTP only in development", () => {
    const env = parseAppEnv({
      NODE_ENV: "development",
      OTP_PROVIDER: "simulated",
      ALLOW_IN_MEMORY_PERSISTENCE: "true",
    });
    expect(env.simulatedOtpAllowed).toBe(true);
  });

  it("refuses in-memory persistence flag in production", () => {
    expect(() =>
      parseAppEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://comprausa:comprausa@127.0.0.1:5432/comprausa",
        AUTH_TOKEN_SECRET: productionSecret,
        ALLOW_IN_MEMORY_PERSISTENCE: "true",
      }),
    ).toThrow(/ALLOW_IN_MEMORY_PERSISTENCE/);
  });

  it("refuses simulated OTP in test and in production", () => {
    expect(() => parseAppEnv({ NODE_ENV: "test", OTP_PROVIDER: "simulated" })).toThrow(/development/);
    expect(() =>
      parseAppEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://comprausa:comprausa@127.0.0.1:5432/comprausa",
        OTP_PROVIDER: "simulated",
        AUTH_TOKEN_SECRET: productionSecret,
      }),
    ).toThrow(/simulated/);
  });

  it("fails production when the database URL or token secret is missing", () => {
    expect(() => parseAppEnv({ NODE_ENV: "production" })).toThrow(/DATABASE_URL/);
    expect(() =>
      parseAppEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://comprausa:comprausa@127.0.0.1:5432/comprausa",
        AUTH_TOKEN_SECRET: DEVELOPMENT_AUTH_TOKEN_SECRET,
      }),
    ).toThrow(/placeholder/);
  });

  it("accepts production with a database URL and simulated OTP off", () => {
    const env = parseAppEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://comprausa:comprausa@127.0.0.1:5432/comprausa",
      OTP_PROVIDER: "none",
      AUTH_TOKEN_SECRET: productionSecret,
    });
    expect(env.simulatedOtpAllowed).toBe(false);
    expect(env.nodeEnv).toBe("production");
    expect(env.authTokenSecret).toBe(productionSecret);
    expect(env.stripeTestKey).toBeUndefined();
  });

  it("requires Resend credentials when OTP_PROVIDER=resend", () => {
    expect(() => parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "resend", ALLOW_IN_MEMORY_PERSISTENCE: "true" })).toThrow(/RESEND_API_KEY/);
    const env = parseAppEnv({
      NODE_ENV: "development",
      OTP_PROVIDER: "resend",
      RESEND_API_KEY: "re_test",
      OTP_EMAIL_FROM: "TraeLo <otp@traelo.test>",
      ALLOW_IN_MEMORY_PERSISTENCE: "true",
    });
    expect(env.otpProvider).toBe("resend");
    expect(env.resendOtp?.from).toContain("otp@traelo.test");
  });

  it("requires Twilio credentials when OTP_PROVIDER=twilio", () => {
    expect(() => parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "twilio", ALLOW_IN_MEMORY_PERSISTENCE: "true" })).toThrow(/TWILIO_ACCOUNT_SID/);
    const env = parseAppEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://comprausa:comprausa@127.0.0.1:5432/comprausa",
      AUTH_TOKEN_SECRET: productionSecret,
      OTP_PROVIDER: "twilio",
      TWILIO_ACCOUNT_SID: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      TWILIO_AUTH_TOKEN: "token",
      TWILIO_VERIFY_SERVICE_SID: "VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    });
    expect(env.otpProvider).toBe("twilio");
    expect(env.twilioVerify?.verifyServiceSid).toMatch(/^VA/);
  });

  it("accepts a Stripe test key and refuses a live key", () => {
    const env = parseAppEnv({ NODE_ENV: "development", ALLOW_IN_MEMORY_PERSISTENCE: "true", STRIPE_SECRET_KEY: "sk_test_local_only" });
    expect(env.stripeTestKey).toBe("sk_test_local_only");
    expect(() => parseAppEnv({ NODE_ENV: "development", ALLOW_IN_MEMORY_PERSISTENCE: "true", STRIPE_SECRET_KEY: "sk_live_real" })).toThrow(/live keys/);
    expect(() => parseAppEnv({ NODE_ENV: "development", ALLOW_IN_MEMORY_PERSISTENCE: "true", STRIPE_WEBHOOK_SECRET: "not-a-webhook-secret" })).toThrow(/webhook/);
  });
});
