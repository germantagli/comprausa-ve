export interface RateLimitDecision {
  allowed: boolean;
}

/**
 * Port for request limiting. The in-memory adapter is for a single process
 * in development and tests. It is not a Redis client.
 */
export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision>;
}

export interface RateBucket {
  identity: number;
  ip: number;
  device: number;
  windowMs: number;
}

export interface AuthRatePolicy {
  challenge: RateBucket;
  verify: RateBucket;
}

/**
 * Verify allows more hits than the OTP attempt cap (5) so a locked code
 * still answers `rejected` instead of `throttled`.
 */
export const defaultAuthRatePolicy: AuthRatePolicy = {
  challenge: { identity: 5, ip: 30, device: 10, windowMs: 10 * 60_000 },
  verify: { identity: 20, ip: 60, device: 30, windowMs: 10 * 60_000 },
};
