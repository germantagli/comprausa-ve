import { jsonResponse } from "@comprausa/testing";
import { describe, expect, it } from "vitest";
import { challengeResponseSchema } from "./auth";
import { searchCatalog } from "./catalog";
import { getHealth, requestOtpChallenge } from "./index";

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

  it("rejects a challenge payload that includes the one-time code", async () => {
    expect(() =>
      challengeResponseSchema.parse({ status: "accepted", expiresInSeconds: 120, code: "123456" }),
    ).toThrow();
    const challenge = await requestOtpChallenge(
      "http://127.0.0.1:3001",
      {
        channel: "email",
        destination: "ana@example.com",
        deviceId: "00000000-0000-4000-8000-0000000000aa",
      },
      async () => jsonResponse({ status: "throttled" }),
    );
    expect(challenge).toEqual({ status: "throttled" });
  });

  it("rejects a catalog item that includes a price", async () => {
    await expect(
      searchCatalog("http://127.0.0.1:3001", "", async () =>
        jsonResponse({
          source: "internal-demo",
          items: [
            {
              id: "demo-norte",
              name: "Caja de demostración Norte",
              fictional: true,
              catalog: "internal-demo",
              disclaimer: "Ficticio",
              amountMinor: 100,
            },
          ],
        }),
      ),
    ).rejects.toThrow();
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
