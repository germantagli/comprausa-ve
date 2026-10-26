import { describe, expect, it } from "vitest";
import { SimulatedOtpProvider } from "./simulated-otp.provider";

const allowed = { nodeEnv: "test", simulatedOtpAllowed: true };

describe("SimulatedOtpProvider", () => {
  it("refuses to construct in production or when the flag is off", () => {
    expect(() => new SimulatedOtpProvider({ nodeEnv: "production", simulatedOtpAllowed: false })).toThrow(/refused/);
    expect(() => new SimulatedOtpProvider({ nodeEnv: "production", simulatedOtpAllowed: true })).toThrow(/refused/);
    expect(() => new SimulatedOtpProvider({ nodeEnv: "development", simulatedOtpAllowed: false })).toThrow(/refused/);
  });

  it("accepts the fixed code once and then rejects it", async () => {
    let clock = 1_000;
    const provider = new SimulatedOtpProvider(allowed, () => clock);
    const issued = await provider.issue("+584121112233");
    expect(issued.status).toBe("accepted");
    expect(JSON.stringify(issued)).not.toContain("424242");
    expect(await provider.verify("+584121112233", "424242")).toBe("approved");
    expect(await provider.verify("+584121112233", "424242")).toBe("rejected");
  });

  it("returns the same rejection for unknown, wrong, expired, and locked challenges", async () => {
    let clock = 5_000;
    const provider = new SimulatedOtpProvider(allowed, () => clock);
    expect(await provider.verify("+584121112233", "424242")).toBe("rejected");
    await provider.issue("+584121112233");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(await provider.verify("+584121112233", "000000")).toBe("rejected");
    }
    expect(await provider.verify("+584121112233", "424242")).toBe("rejected");
    await provider.issue("+584120000000");
    clock += 121_000;
    expect(await provider.verify("+584120000000", "424242")).toBe("rejected");
  });

  it("throttles repeated issues for a destination", async () => {
    const provider = new SimulatedOtpProvider(allowed, () => 10_000);
    expect((await provider.issue("a@example.com")).status).toBe("accepted");
    expect((await provider.issue("a@example.com")).status).toBe("accepted");
    expect((await provider.issue("a@example.com")).status).toBe("accepted");
    expect((await provider.issue("a@example.com")).status).toBe("throttled");
  });
});
