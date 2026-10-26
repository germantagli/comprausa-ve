import { parseAppEnv } from "@comprausa/config";
import { describe, expect, it } from "vitest";
import { AuthModule } from "./auth.module";
import { DevOtpController } from "./dev-otp.controller";

describe("AuthModule", () => {
  it("mounts the development OTP route only for the simulated provider", () => {
    const simulated = AuthModule.registerFrom(parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "simulated" }));
    const plain = AuthModule.registerFrom(parseAppEnv({ NODE_ENV: "development" }));
    expect(simulated.controllers).toContain(DevOtpController);
    expect(plain.controllers ?? []).not.toContain(DevOtpController);
  });

  it("refuses a simulated provider whose environment is not development", () => {
    const forged = {
      ...parseAppEnv({ NODE_ENV: "development" }),
      nodeEnv: "production" as const,
      otpProvider: "simulated" as const,
      simulatedOtpAllowed: true,
    };
    expect(() => AuthModule.registerFrom(forged)).toThrow(/development/);
  });
});
