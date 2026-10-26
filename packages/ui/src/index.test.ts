import { describe, expect, it } from "vitest";
import { plannedComponents } from "./index";

describe("plannedComponents", () => {
  it("keeps a unique inventory for later implementation", () => {
    expect(new Set(plannedComponents).size).toBe(plannedComponents.length);
    expect(plannedComponents).toContain("ProofUpload");
  });
});
