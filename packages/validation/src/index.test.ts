import { describe, expect, it } from "vitest";
import {
  catalogSearchSchema,
  emailSchema,
  moneySchema,
  phoneE164Schema,
  usdMinorSchema,
} from "./index";

describe("money", () => {
  it("accepts integer USD cents", () => {
    expect(moneySchema.parse({ amountMinor: 1250, currency: "USD" })).toEqual({
      amountMinor: 1250,
      currency: "USD",
    });
    expect(usdMinorSchema.parse(0)).toBe(0);
  });

  it("rejects floats, strings, and other currencies", () => {
    expect(moneySchema.safeParse({ amountMinor: 10.5, currency: "USD" }).success).toBe(false);
    expect(moneySchema.safeParse({ amountMinor: "1250", currency: "USD" }).success).toBe(false);
    expect(moneySchema.safeParse({ amountMinor: 1250, currency: "VES" }).success).toBe(false);
    expect(moneySchema.safeParse({ amountMinor: -1, currency: "USD" }).success).toBe(false);
  });
});

describe("email and phone", () => {
  it("checks format only", () => {
    expect(emailSchema.parse("persona@example.com")).toBe("persona@example.com");
    expect(emailSchema.safeParse("no-es-correo").success).toBe(false);
    expect(phoneE164Schema.parse("+582121234567")).toBe("+582121234567");
    expect(phoneE164Schema.parse("+14155552671")).toBe("+14155552671");
    expect(phoneE164Schema.safeParse("04141234567").success).toBe(false);
    expect(phoneE164Schema.safeParse("+0123").success).toBe(false);
  });
});

describe("catalog search", () => {
  it("caps text and limit", () => {
    expect(catalogSearchSchema.parse({ text: " norte ", limit: 5 })).toEqual({
      text: "norte",
      limit: 5,
    });
    expect(catalogSearchSchema.safeParse({ text: "x".repeat(81), limit: 5 }).success).toBe(false);
    expect(catalogSearchSchema.safeParse({ text: "a", limit: 21 }).success).toBe(false);
  });
});
