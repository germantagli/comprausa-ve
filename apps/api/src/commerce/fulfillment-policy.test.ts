import { describe, expect, it } from "vitest";
import { allowedFulfillmentTargets, procurementFor } from "./fulfillment-policy";

describe("fulfillment policy", () => {
  it("does not offer DELIVERED while the order is only PAID", () => {
    expect(allowedFulfillmentTargets("PAID")).toEqual(["PROCUREMENT_PENDING", "CANCELLED", "EXCEPTION"]);
    expect(allowedFulfillmentTargets("PAID")).not.toContain("DELIVERED");
    expect(allowedFulfillmentTargets("AWAITING_PAYMENT")).toEqual([]);
  });

  it("marks the store purchase only on that step", () => {
    expect(procurementFor("PROCUREMENT_PENDING", { procurementStatus: "NOT_STARTED", purchasedFromStore: false })).toEqual({
      procurementStatus: "PENDING",
      purchasedFromStore: false,
    });
    expect(procurementFor("PURCHASED_FROM_STORE", { procurementStatus: "PENDING", purchasedFromStore: false })).toEqual({
      procurementStatus: "ORDERED_AT_STORE",
      purchasedFromStore: true,
    });
  });
});
