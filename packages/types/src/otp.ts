export type OtpIssueResult =
  | { status: "accepted"; expiresInSeconds: number }
  | { status: "throttled"; expiresInSeconds: 0 }
  | { status: "unsupported" };

export type OtpVerifyResult = "approved" | "rejected";

/**
 * Auth port. Implementations must not log the one-time code.
 * A rejected result is the same for an unknown destination, a wrong code,
 * an expired code, and a locked challenge.
 */
export interface OtpProvider {
  readonly name: string;
  issue(destination: string): Promise<OtpIssueResult>;
  verify(destination: string, code: string): Promise<OtpVerifyResult>;
}
