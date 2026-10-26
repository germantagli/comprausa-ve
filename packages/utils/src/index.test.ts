import { describe, expect, it } from "vitest";
import { formatUsdFromMinor } from "./index";

describe("formatUsdFromMinor", () => {
  it("formats cents without binary floating point", () => {
    expect(formatUsdFromMinor(0)).toBe("USD 0.00");
    expect(formatUsdFromMinor(1)).toBe("USD 0.01");
    expect(formatUsdFromMinor(1250)).toBe("USD 12.50");
  });

  it("rejects fractional numbers", () => {
    expect(() => formatUsdFromMinor(10.5)).toThrow(/minor units/);
    expect(() => formatUsdFromMinor(-1)).toThrow(/minor units/);
  });
});
