import { randomInt, timingSafeEqual } from "node:crypto";
import type { OtpIssueResult, OtpProvider, OtpVerifyResult } from "@comprausa/types";
import type { Clock } from "./clock";
import { systemClock } from "./clock";

const TTL_MS = 120_000;
const MAX_ATTEMPTS = 5;

interface Challenge {
  code: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
}

/**
 * Development-only OTP. A fresh code is random. issue() does not return it.
 * Tests and the development endpoint read it through peekCode(). Nothing here writes a log.
 * The process must refuse this class unless NODE_ENV is development and OTP_PROVIDER is simulated.
 */
export class SimulatedOtpProvider implements OtpProvider {
  readonly name = "SimulatedOtpProvider";
  private readonly challenges = new Map<string, Challenge>();

  constructor(
    env: { nodeEnv: string; otpProvider: string },
    private readonly clock: Clock = systemClock,
  ) {
    if (env.nodeEnv !== "development" || env.otpProvider !== "simulated") {
      throw new Error("SimulatedOtpProvider is refused unless NODE_ENV is development and OTP_PROVIDER is simulated");
    }
  }

  async issue(destination: string): Promise<OtpIssueResult> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    this.challenges.set(destination, {
      code,
      expiresAt: this.clock.now() + TTL_MS,
      attempts: 0,
      used: false,
    });
    return { status: "accepted", expiresInSeconds: TTL_MS / 1000 };
  }

  /**
   * Test and development hook. Returns the live code, or undefined when none can be used.
   * Callers must not log the return value.
   */
  peekCode(destination: string): string | undefined {
    const challenge = this.challenges.get(destination);
    if (!this.isOpen(challenge)) {
      return undefined;
    }
    return challenge.code;
  }

  async verify(destination: string, code: string): Promise<OtpVerifyResult> {
    const challenge = this.challenges.get(destination);
    if (!this.isOpen(challenge)) {
      return "rejected";
    }
    challenge.attempts += 1;
    const matched = sameCode(challenge.code, code);
    if (!matched) {
      if (challenge.attempts >= MAX_ATTEMPTS) {
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
      challenge.attempts < MAX_ATTEMPTS &&
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
