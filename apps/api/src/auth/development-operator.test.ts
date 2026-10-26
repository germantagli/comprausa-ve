import { describe, expect, it } from "vitest";
import { developmentOperator } from "./development-operator";

describe("developmentOperator", () => {
  it("assigns the finance role in development and stays empty otherwise", () => {
    expect(developmentOperator("development")).toEqual({ email: "finanzas@comprausa.test", role: "FINANCE_AGENT" });
    expect(developmentOperator("test")).toBeNull();
    expect(developmentOperator("production")).toBeNull();
  });
});
