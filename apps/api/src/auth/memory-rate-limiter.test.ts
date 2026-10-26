import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "./memory-rate-limiter";
import { defaultAuthRatePolicy } from "./rate-limiter";

describe("MemoryRateLimiter", () => {
  it("blocks a key inside the window and allows it again after the window", async () => {
    let now = 10_000;
    const limiter = new MemoryRateLimiter({ now: () => now });
    expect((await limiter.consume("ip:203.0.113.1", 2, 1_000)).allowed).toBe(true);
    expect((await limiter.consume("ip:203.0.113.1", 2, 1_000)).allowed).toBe(true);
    expect((await limiter.consume("ip:203.0.113.1", 2, 1_000)).allowed).toBe(false);
    expect((await limiter.consume("ip:203.0.113.2", 2, 1_000)).allowed).toBe(true);
    now += 1_000;
    expect((await limiter.consume("ip:203.0.113.1", 2, 1_000)).allowed).toBe(true);
  });

  it("keeps the verify bucket above the OTP attempt cap", () => {
    expect(defaultAuthRatePolicy.challenge.identity).toBe(5);
    expect(defaultAuthRatePolicy.verify.identity).toBeGreaterThan(5);
  });
});
