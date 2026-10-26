import type { OtpIssueResult, OtpProvider, OtpVerifyResult } from "@comprausa/types";

const SIMULATED_CODE = "424242";
const TTL_MS = 120_000;
const MAX_ATTEMPTS = 5;
const MAX_ISSUES = 3;
const ISSUE_WINDOW_MS = 10 * 60_000;

interface Challenge {
  expiresAt: number;
  attempts: number;
  used: boolean;
}

/**
 * Development-only OTP. The fixed code is not a production secret:
 * this class refuses to construct when NODE_ENV is production.
 * It never writes the code to a log.
 */
export class SimulatedOtpProvider implements OtpProvider {
  readonly name = "SimulatedOtpProvider";
  private readonly challenges = new Map<string, Challenge>();
  private readonly issues = new Map<string, number[]>();

  constructor(
    env: { nodeEnv: string; simulatedOtpAllowed: boolean },
    private readonly now: () => number = Date.now,
  ) {
    if (env.nodeEnv === "production" || !env.simulatedOtpAllowed) {
      throw new Error("SimulatedOtpProvider is refused unless simulated OTP is explicitly allowed outside production");
    }
  }

  async issue(destination: string): Promise<OtpIssueResult> {
    const now = this.now();
    const recent = (this.issues.get(destination) ?? []).filter((issuedAt) => now - issuedAt < ISSUE_WINDOW_MS);
    if (recent.length >= MAX_ISSUES) {
      this.issues.set(destination, recent);
      return { status: "throttled", expiresInSeconds: 0 };
    }
    recent.push(now);
    this.issues.set(destination, recent);
    this.challenges.set(destination, {
      expiresAt: now + TTL_MS,
      attempts: 0,
      used: false,
    });
    return { status: "accepted", expiresInSeconds: TTL_MS / 1000 };
  }

  async verify(destination: string, code: string): Promise<OtpVerifyResult> {
    const challenge = this.challenges.get(destination);
    if (challenge === undefined || challenge.used || challenge.expiresAt <= this.now() || challenge.attempts >= MAX_ATTEMPTS) {
      return "rejected";
    }
    challenge.attempts += 1;
    if (code !== SIMULATED_CODE) {
      return "rejected";
    }
    challenge.used = true;
    return "approved";
  }
}
