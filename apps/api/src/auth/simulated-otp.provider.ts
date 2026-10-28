import type { OtpIssueResult, OtpProvider, OtpVerifyResult } from "@comprausa/types";
import type { Clock } from "./clock";
import { systemClock } from "./clock";
import { OtpChallengeLedger } from "./otp-challenge-ledger";

/**
 * Development-only OTP. A fresh code is random. issue() does not return it.
 * Tests and the development endpoint read it through peekCode(). Nothing here writes a log.
 * The process must refuse this class unless NODE_ENV is development and OTP_PROVIDER is simulated.
 */
export class SimulatedOtpProvider implements OtpProvider {
  readonly name = "SimulatedOtpProvider";
  private readonly ledger: OtpChallengeLedger;

  constructor(
    env: { nodeEnv: string; otpProvider: string },
    clock: Clock = systemClock,
  ) {
    if (env.nodeEnv !== "development" || env.otpProvider !== "simulated") {
      throw new Error("SimulatedOtpProvider is refused unless NODE_ENV is development and OTP_PROVIDER is simulated");
    }
    this.ledger = new OtpChallengeLedger(clock);
  }

  async issue(destination: string): Promise<OtpIssueResult> {
    const issued = this.ledger.issue(destination);
    return { status: "accepted", expiresInSeconds: issued.expiresInSeconds };
  }

  /**
   * Test and development hook. Returns the live code, or undefined when none can be used.
   * Callers must not log the return value.
   */
  peekCode(destination: string): string | undefined {
    return this.ledger.peek(destination);
  }

  async verify(destination: string, code: string): Promise<OtpVerifyResult> {
    return this.ledger.verify(destination, code);
  }
}
