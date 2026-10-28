import { randomInt, timingSafeEqual } from "node:crypto";
import type { Clock } from "./clock";
import { systemClock } from "./clock";

const DEFAULT_TTL_MS = 120_000;
const DEFAULT_MAX_ATTEMPTS = 5;

interface Challenge {
  code: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
}

/**
 * In-process OTP ledger. Used by SimulatedOtpProvider and ResendOtpProvider.
 * Codes must never be logged by callers.
 */
export class OtpChallengeLedger {
  private readonly challenges = new Map<string, Challenge>();

  constructor(
    private readonly clock: Clock = systemClock,
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly maxAttempts = DEFAULT_MAX_ATTEMPTS,
  ) {}

  get expiresInSeconds(): number {
    return this.ttlMs / 1000;
  }

  /** Creates a fresh 6-digit code for the destination key. Does not return the code. */
  issue(destinationKey: string): { code: string; expiresInSeconds: number } {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    this.challenges.set(destinationKey, {
      code,
      expiresAt: this.clock.now() + this.ttlMs,
      attempts: 0,
      used: false,
    });
    return { code, expiresInSeconds: this.expiresInSeconds };
  }

  /** Live code for development peek only. Undefined when no open challenge. */
  peek(destinationKey: string): string | undefined {
    const challenge = this.challenges.get(destinationKey);
    if (!this.isOpen(challenge)) {
      return undefined;
    }
    return challenge.code;
  }

  verify(destinationKey: string, code: string): "approved" | "rejected" {
    const challenge = this.challenges.get(destinationKey);
    if (!this.isOpen(challenge)) {
      return "rejected";
    }
    challenge.attempts += 1;
    const matched = sameCode(challenge.code, code);
    if (!matched) {
      if (challenge.attempts >= this.maxAttempts) {
        challenge.code = "";
      }
      return "rejected";
    }
    challenge.used = true;
    challenge.code = "";
    return "approved";
  }

  private isOpen(challenge: Challenge | undefined): challenge is Challenge {
    return (
      challenge !== undefined &&
      !challenge.used &&
      challenge.attempts < this.maxAttempts &&
      challenge.expiresAt > this.clock.now() &&
      challenge.code.length === 6
    );
  }
}

function sameCode(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
