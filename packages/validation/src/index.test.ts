import { describe, expect, it } from "vitest";
import {
  catalogSearchSchema,
  devOtpSchema,
  emailSchema,
  moneySchema,
  otpChallengeSchema,
  otpCodeSchema,
  personNameSchema,
  quoteRequestSchema,
  phoneE164Schema,
  registrationSchema,
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

describe("auth input", () => {
  const deviceId = "00000000-0000-4000-8000-0000000000aa";

  it("normalizes email and accepts a Venezuelan phone", () => {
    expect(otpChallengeSchema.parse({ channel: "email", destination: " Ana@Example.com ", deviceId })).toEqual({
      channel: "email",
      destination: "ana@example.com",
      deviceId,
    });
    expect(devOtpSchema.parse({ channel: "phone", destination: "+584121112233" })).toEqual({
      channel: "phone",
      destination: "+584121112233",
    });
    expect(otpCodeSchema.parse("004242")).toBe("004242");
    expect(personNameSchema.parse(" María ")).toBe("María");
    expect(registrationSchema.parse({
      registrationToken: "token",
      givenName: "Ana",
      familyName: "Pérez",
      deviceId,
      platform: "WEB",
    }).familyName).toBe("Pérez");
  });

  it("rejects a local phone, a short code, and a name that is only digits", () => {
    expect(otpChallengeSchema.safeParse({ channel: "phone", destination: "04141234567", deviceId }).success).toBe(false);
    expect(otpCodeSchema.safeParse("12345").success).toBe(false);
    expect(personNameSchema.safeParse("123").success).toBe(false);
    expect(otpChallengeSchema.safeParse({ channel: "email", destination: "ana@example.com", deviceId, code: "123456" }).success).toBe(false);
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

describe("quote request", () => {
  const address = { state: "Miranda", city: "Caracas", municipality: "Baruta", reference: "Frente a la plaza" };

  it("requires the Venezuela address and rejects a client status", () => {
    expect(quoteRequestSchema.parse({ address })).toEqual({ address });
    expect(quoteRequestSchema.safeParse({ address, status: "FINAL" }).success).toBe(false);
    expect(quoteRequestSchema.safeParse({ address, pastedUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(quoteRequestSchema.parse({ address, pastedUrl: "https://example.com/item" }).pastedUrl).toBe("https://example.com/item");
  });
});
