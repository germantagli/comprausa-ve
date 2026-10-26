import { describe, expect, it, vi } from "vitest";
import { SimulatedOtpProvider } from "./simulated-otp.provider";

const allowed = { nodeEnv: "development", otpProvider: "simulated" };

describe("SimulatedOtpProvider", () => {
  it("refuses to construct outside development or without the simulated provider", () => {
    expect(() => new SimulatedOtpProvider({ nodeEnv: "production", otpProvider: "simulated" })).toThrow(/development/);
    expect(() => new SimulatedOtpProvider({ nodeEnv: "test", otpProvider: "simulated" })).toThrow(/development/);
    expect(() => new SimulatedOtpProvider({ nodeEnv: "development", otpProvider: "none" })).toThrow(/simulated/);
  });

  it("issues a random code that is readable only through peekCode", async () => {
    const logs: unknown[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(...args);
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logs.push(...args);
    });
    try {
      const provider = new SimulatedOtpProvider(allowed, { now: () => 1_000 });
      const issued = await provider.issue("email:ana@example.com");
      const code = provider.peekCode("email:ana@example.com");
      expect(issued).toEqual({ status: "accepted", expiresInSeconds: 120 });
      expect(code).toMatch(/^\d{6}$/);
      expect(JSON.stringify(issued)).not.toContain(code);
      expect(logs.join(" ")).not.toContain(code);
      expect(await provider.verify("email:ana@example.com", code ?? "")).toBe("approved");
      expect(provider.peekCode("email:ana@example.com")).toBeUndefined();
      expect(await provider.verify("email:ana@example.com", code ?? "")).toBe("rejected");
    } finally {
      spy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it("rejects a code after it expires", async () => {
    let now = 5_000;
    const provider = new SimulatedOtpProvider(allowed, { now: () => now });
    await provider.issue("phone:+584121112233");
    const code = provider.peekCode("phone:+584121112233");
    now += 121_000;
    expect(provider.peekCode("phone:+584121112233")).toBeUndefined();
    expect(await provider.verify("phone:+584121112233", code ?? "")).toBe("rejected");
  });

  it("rejects the real code after five wrong attempts", async () => {
    const provider = new SimulatedOtpProvider(allowed, { now: () => 5_000 });
    await provider.issue("email:ana@example.com");
    const code = provider.peekCode("email:ana@example.com") ?? "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(await provider.verify("email:ana@example.com", "000000")).toBe("rejected");
    }
    expect(await provider.verify("email:ana@example.com", code)).toBe("rejected");
  });

  it("returns the same rejection for an unknown destination", async () => {
    const provider = new SimulatedOtpProvider(allowed, { now: () => 5_000 });
    expect(await provider.verify("email:nadie@example.com", "000000")).toBe("rejected");
  });
});
