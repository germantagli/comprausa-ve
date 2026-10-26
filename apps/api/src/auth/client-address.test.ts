import { describe, expect, it } from "vitest";
import { clientAddress } from "./client-address";

describe("clientAddress", () => {
  it("uses the socket address and ignores a forwarded-for header on the same object", () => {
    const request = { ip: "203.0.113.4", headers: { "x-forwarded-for": "198.51.100.9" } };
    expect(clientAddress(request)).toBe("203.0.113.4");
    expect(clientAddress({})).toBe("unknown");
  });
});
