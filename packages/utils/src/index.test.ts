import { describe, expect, it } from "vitest";
import { catalogPriceLabel, formatUsdFromMinor } from "./index";

describe("formatUsdFromMinor", () => {
  it("formats cents without binary floating point", () => {
    expect(formatUsdFromMinor(0)).toBe("USD 0.00");
    expect(formatUsdFromMinor(1)).toBe("USD 0.01");
    expect(formatUsdFromMinor(1250)).toBe("USD 12.50");
  });

  it("says the price is by quote when the catalog has no amount", () => {
    expect(catalogPriceLabel({ status: "UNPRICED", amount: null })).toBe("Precio por cotización");
    expect(catalogPriceLabel({ status: "UNPRICED", amount: { amountMinor: 100 } })).toBe("Precio por cotización");
    expect(catalogPriceLabel({ status: "PRICED", amount: { amountMinor: 1250 } })).toBe("USD 12.50");
  });

  it("rejects fractional numbers", () => {
    expect(() => formatUsdFromMinor(10.5)).toThrow(/minor units/);
    expect(() => formatUsdFromMinor(-1)).toThrow(/minor units/);
  });
});
