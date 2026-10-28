import type { OtpIssueResult, OtpProvider, OtpVerifyResult } from "@comprausa/types";
import { parseOtpDestinationKey } from "./otp-destination-key";

export interface TwilioVerifyConfig {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
}

type FetchLike = typeof fetch;

const EXPIRES_IN_SECONDS = 120;

/**
 * SMS and email OTP via Twilio Verify. Twilio generates and checks the code.
 * The one-time code never passes through our process logs.
 */
export class TwilioVerifyOtpProvider implements OtpProvider {
  readonly name = "TwilioVerifyOtpProvider";
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(
    config: TwilioVerifyConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    if (!config.accountSid.trim() || !config.authToken.trim() || !config.verifyServiceSid.trim()) {
      throw new Error("TwilioVerifyOtpProvider requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID");
    }
    this.authHeader = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;
    this.baseUrl = `https://verify.twilio.com/v2/Services/${config.verifyServiceSid}`;
  }

  async issue(destinationKey: string): Promise<OtpIssueResult> {
    const parsed = parseOtpDestinationKey(destinationKey);
    if (!parsed) {
      return { status: "unsupported" };
    }
    const channel = parsed.channel === "phone" ? "sms" : "email";
    const response = await this.fetchImpl(`${this.baseUrl}/Verifications`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: parsed.destination, Channel: channel }).toString(),
    });
    if (response.status === 429) {
      return { status: "throttled", expiresInSeconds: 0 };
    }
    if (!response.ok) {
      return { status: "throttled", expiresInSeconds: 0 };
    }
    return { status: "accepted", expiresInSeconds: EXPIRES_IN_SECONDS };
  }

  async verify(destinationKey: string, code: string): Promise<OtpVerifyResult> {
    const parsed = parseOtpDestinationKey(destinationKey);
    if (!parsed) {
      return "rejected";
    }
    const response = await this.fetchImpl(`${this.baseUrl}/VerificationCheck`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: parsed.destination, Code: code }).toString(),
    });
    if (!response.ok) {
      return "rejected";
    }
    const body = (await response.json()) as { status?: string };
    return body.status === "approved" ? "approved" : "rejected";
  }
}
