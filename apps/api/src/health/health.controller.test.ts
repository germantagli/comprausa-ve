import { ServiceUnavailableException } from "@nestjs/common";
import { parseAppEnv } from "@comprausa/config";
import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports not ready when Postgres is not configured", async () => {
    const controller = new HealthController(parseAppEnv({ NODE_ENV: "development", ALLOW_IN_MEMORY_PERSISTENCE: "true" }), undefined);
    expect(controller.live().otp).toBe("not_configured");
    expect(controller.live().persistence).toBe("memory");
    expect(controller.live().productRequests).toBe("memory");
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("reports resend and twilio when those providers are configured", () => {
    const resend = new HealthController(
      parseAppEnv({
        NODE_ENV: "development",
        OTP_PROVIDER: "resend",
        RESEND_API_KEY: "re_test",
        OTP_EMAIL_FROM: "TraeLo <otp@traelo.test>",
        ALLOW_IN_MEMORY_PERSISTENCE: "true",
      }),
      undefined,
    );
    expect(resend.live().otp).toBe("resend");

    const twilio = new HealthController(
      parseAppEnv({
        NODE_ENV: "development",
        OTP_PROVIDER: "twilio",
        TWILIO_ACCOUNT_SID: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        TWILIO_AUTH_TOKEN: "token",
        TWILIO_VERIFY_SERVICE_SID: "VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        ALLOW_IN_MEMORY_PERSISTENCE: "true",
      }),
      undefined,
    );
    expect(twilio.live().otp).toBe("twilio");
  });
});
