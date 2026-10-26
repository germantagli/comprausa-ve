import type { Clock } from "./clock";
import { systemClock } from "./clock";
import type { RateLimitDecision, RateLimiter } from "./rate-limiter";

/**
 * Process-local sliding window for development and tests.
 * Not Redis, and not shared across instances.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly clock: Clock = systemClock) {}

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    const now = this.clock.now();
    const recent = (this.hits.get(key) ?? []).filter((hit) => now - hit < windowMs);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return { allowed: false };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true };
  }
}
