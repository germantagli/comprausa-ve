import { describe, expect, it } from "vitest";
import { DEVELOPMENT_AUTH_TOKEN_SECRET, parseAppEnv } from "./index";

const productionSecret = "production-secret-value-with-32ch";

describe("parseAppEnv", () => {
  it("allows development without a database and without simulated OTP", () => {
    const env = parseAppEnv({ NODE_ENV: "development" });
    expect(env.databaseUrl).toBeUndefined();
    expect(env.simulatedOtpAllowed).toBe(false);
    expect(env.otpProvider).toBe("none");
    expect(env.authTokenSecret).toBe(DEVELOPMENT_AUTH_TOKEN_SECRET);
  });

  it("allows simulated OTP only in development", () => {
    const env = parseAppEnv({
      NODE_ENV: "development",
      OTP_PROVIDER: "simulated",
    });
    expect(env.simulatedOtpAllowed).toBe(true);
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
  });
});
