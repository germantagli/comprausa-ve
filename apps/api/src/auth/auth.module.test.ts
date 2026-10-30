import { parseAppEnv } from "@comprausa/config";
import { describe, expect, it } from "vitest";
import { AuthModule } from "./auth.module";
import { DevOtpController } from "./dev-otp.controller";

describe("AuthModule", () => {
  it("mounts the development OTP route only for the simulated provider", () => {
    const simulated = AuthModule.registerFrom(parseAppEnv({ NODE_ENV: "development", OTP_PROVIDER: "simulated", ALLOW_IN_MEMORY_PERSISTENCE: "true" }));
    const plain = AuthModule.registerFrom(parseAppEnv({ NODE_ENV: "development", ALLOW_IN_MEMORY_PERSISTENCE: "true" }));
    expect(simulated.controllers).toContain(DevOtpController);
    expect(plain.controllers ?? []).not.toContain(DevOtpController);
  });

  it("refuses a simulated provider whose environment is not development", () => {
    const forged = {
      ...parseAppEnv({ NODE_ENV: "development", ALLOW_IN_MEMORY_PERSISTENCE: "true" }),
      nodeEnv: "production" as const,
      otpProvider: "simulated" as const,
      simulatedOtpAllowed: true,
    };
    expect(() => AuthModule.registerFrom(forged)).toThrow(/development/);
  });

  it("mounts Resend and Twilio providers without the development OTP route", () => {
    const resend = AuthModule.registerFrom(
      parseAppEnv({
        NODE_ENV: "development",
        OTP_PROVIDER: "resend",
        RESEND_API_KEY: "re_test",
        OTP_EMAIL_FROM: "TraeLo <otp@traelo.test>",
      }),
    );
    const twilio = AuthModule.registerFrom(
      parseAppEnv({
        NODE_ENV: "development",
        OTP_PROVIDER: "twilio",
        TWILIO_ACCOUNT_SID: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        TWILIO_AUTH_TOKEN: "token",
        TWILIO_VERIFY_SERVICE_SID: "VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      }),
    );
    expect(resend.controllers ?? []).not.toContain(DevOtpController);
    expect(twilio.controllers ?? []).not.toContain(DevOtpController);
  });
});
