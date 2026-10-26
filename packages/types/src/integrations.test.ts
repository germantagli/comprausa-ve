import { describe, expect, it } from "vitest";
import { paymentIntegrationRegistry, storeIntegrationRegistry } from "./integrations";

const expectedStores = [
  "amazon",
  "walmart",
  "ebay",
  "target",
  "shein",
  "temu",
  "nike",
  "adidas",
  "best-buy",
  "apple",
  "samsung",
  "sephora",
  "ulta",
  "macys",
  "home-depot",
  "lowes",
  "etsy",
  "hm",
  "zara",
  "foot-locker",
  "costco",
];

describe("integration registry", () => {
  it("lists every target store once and none as a live purchase connector", () => {
    const codes = storeIntegrationRegistry.map((store) => store.code);
    expect(codes).toEqual(expectedStores);
    for (const store of storeIntegrationRegistry) {
      expect(store.purchaseConnector).toBe(false);
      expect(store.mode).toBe("BLOCKED");
      expect(store.status).not.toBe("AVAILABLE");
    }
  });

  it("does not mark any payment method as available or simulated", () => {
    expect(paymentIntegrationRegistry.map((method) => method.code)).toEqual([
      "stripe",
      "paypal",
      "zelle",
      "pago-movil",
    ]);
    for (const method of paymentIntegrationRegistry) {
      expect(method.mode).toBe("BLOCKED");
      expect(method.status).not.toBe("AVAILABLE");
    }
  });
});
