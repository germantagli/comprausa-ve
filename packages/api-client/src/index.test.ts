import { jsonResponse } from "@comprausa/testing";
import { describe, expect, it } from "vitest";
import { getHealth } from "./index";

describe("getHealth", () => {
  it("parses the public health contract", async () => {
    const health = await getHealth("http://127.0.0.1:3001", async () =>
      jsonResponse({
        status: "ok",
        service: "api",
        displayName: "CompraUSA VE",
        catalog: "internal-demo",
        otp: "simulated",
        payments: "not_configured",
        stores: "no_external_connector",
      }),
    );
    expect(health.catalog).toBe("internal-demo");
    expect(health.payments).toBe("not_configured");
  });

  it("rejects a payload that claims a live payment integration", async () => {
    await expect(
      getHealth("http://127.0.0.1:3001", async () =>
        jsonResponse({
          status: "ok",
          service: "api",
          displayName: "CompraUSA VE",
          catalog: "internal-demo",
          otp: "simulated",
          payments: "stripe",
          stores: "no_external_connector",
        }),
      ),
    ).rejects.toThrow();
  });
});
