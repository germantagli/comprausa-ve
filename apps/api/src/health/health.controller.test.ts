import { ServiceUnavailableException } from "@nestjs/common";
import { parseAppEnv } from "@comprausa/config";
import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports not ready when Postgres is not configured", async () => {
    const controller = new HealthController(parseAppEnv({ NODE_ENV: "development" }), undefined);
    expect(controller.live().otp).toBe("not_configured");
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
