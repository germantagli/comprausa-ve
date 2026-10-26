import { describe, expect, it } from "vitest";
import { parseAppEnv } from "./index";

describe("parseAppEnv", () => {
  it("allows a local process without a database and without simulated OTP", () => {
    const env = parseAppEnv({ NODE_ENV: "development" });
    expect(env.databaseUrl).toBeUndefined();
    expect(env.simulatedOtpAllowed).toBe(false);
    expect(env.displayName).toBe("CompraUSA VE");
  });

  it("allows simulated OTP only outside production", () => {
    const env = parseAppEnv({
      NODE_ENV: "test",
      SIMULATED_OTP_ENABLED: "true",
    });
    expect(env.simulatedOtpAllowed).toBe(true);
  });

  it("fails production when the database URL is missing", () => {
    expect(() => parseAppEnv({ NODE_ENV: "production" })).toThrow(/DATABASE_URL/);
  });

  it("fails production when simulated OTP is enabled", () => {
    expect(() =>
      parseAppEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://comprausa:comprausa@127.0.0.1:5432/comprausa",
        SIMULATED_OTP_ENABLED: "true",
      }),
    ).toThrow(/SIMULATED_OTP_ENABLED/);
  });

  it("accepts production with a database URL and simulated OTP off", () => {
    const env = parseAppEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://comprausa:comprausa@127.0.0.1:5432/comprausa",
      SIMULATED_OTP_ENABLED: "false",
    });
    expect(env.simulatedOtpAllowed).toBe(false);
    expect(env.nodeEnv).toBe("production");
  });
});
