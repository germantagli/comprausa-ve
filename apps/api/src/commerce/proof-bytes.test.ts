import { describe, expect, it } from "vitest";
import { inspectProof, MAX_PROOF_BYTES } from "./proof-bytes";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("inspectProof", () => {
  it("accepts a png header and rejects html, a script, and an oversized buffer", () => {
    expect(inspectProof("image/png", png)).toBe(true);
    expect(inspectProof("image/png", Buffer.from("<script>alert(1)</script>"))).toBe(false);
    expect(inspectProof("text/html", png)).toBe(false);
    expect(inspectProof("application/pdf", Buffer.from("%PDF-1.7"))).toBe(true);
    expect(inspectProof("image/jpeg", Buffer.alloc(MAX_PROOF_BYTES + 1, 0xff))).toBe(false);
  });
});