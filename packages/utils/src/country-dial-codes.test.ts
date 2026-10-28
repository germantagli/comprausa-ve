import { describe, expect, it } from "vitest";
import {
  COUNTRY_DIAL_CODES,
  composeE164,
  filterCountries,
  findCountryByIso2,
  getDefaultCountry,
} from "./country-dial-codes";

describe("country dial codes", () => {
  it("defaults to Venezuela +58", () => {
    const ve = getDefaultCountry();
    expect(ve.iso2).toBe("VE");
    expect(ve.dial).toBe("+58");
  });

  it("includes major markets", () => {
    const codes = new Set(COUNTRY_DIAL_CODES.map((item) => item.iso2));
    for (const iso of ["VE", "US", "CO", "MX", "ES", "AR", "BR", "CL", "PE"]) {
      expect(codes.has(iso)).toBe(true);
    }
    expect(COUNTRY_DIAL_CODES.length).toBeGreaterThan(180);
  });

  it("filters by name and dial", () => {
    expect(filterCountries("vene").some((item) => item.iso2 === "VE")).toBe(true);
    expect(filterCountries("+1").some((item) => item.iso2 === "US")).toBe(true);
    expect(filterCountries("58")[0]?.iso2).toBe("VE");
  });

  it("composes E.164 from dial + national number", () => {
    expect(composeE164("+58", "04123456789")).toBe("+584123456789");
    expect(composeE164("+1", "4155552671")).toBe("+14155552671");
    expect(composeE164("+58", "123")).toBeNull();
    expect(findCountryByIso2("co")?.dial).toBe("+57");
  });
});
