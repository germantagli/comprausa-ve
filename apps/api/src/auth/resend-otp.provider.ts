import type { OtpIssueResult, OtpProvider, OtpVerifyResult } from "@comprausa/types";
import type { Clock } from "./clock";
import { systemClock } from "./clock";
import { OtpChallengeLedger } from "./otp-challenge-ledger";
import { parseOtpDestinationKey } from "./otp-destination-key";

export interface ResendOtpConfig {
  apiKey: string;
  from: string;
  appDisplayName: string;
}

type FetchLike = typeof fetch;

/**
 * Email OTP via Resend. Phone destinations are unsupported (use Twilio Verify).
 * The one-time code is never logged and never returned from issue().
 */
export class ResendOtpProvider implements OtpProvider {
  readonly name = "ResendOtpProvider";
  private readonly ledger: OtpChallengeLedger;

  constructor(
    private readonly config: ResendOtpConfig,
    clock: Clock = systemClock,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    if (!config.apiKey.trim() || !config.from.trim()) {
      throw new Error("ResendOtpProvider requires RESEND_API_KEY and OTP_EMAIL_FROM");
    }
    this.ledger = new OtpChallengeLedger(clock);
  }

  async issue(destinationKey: string): Promise<OtpIssueResult> {
    const parsed = parseOtpDestinationKey(destinationKey);
    if (!parsed || parsed.channel !== "email") {
      return { status: "unsupported" };
    }
    const issued = this.ledger.issue(destinationKey);
    const sent = await this.sendEmail(parsed.destination, issued.code);
    if (!sent) {
      return { status: "throttled", expiresInSeconds: 0 };
    }
    return { status: "accepted", expiresInSeconds: issued.expiresInSeconds };
  }

  async verify(destinationKey: string, code: string): Promise<OtpVerifyResult> {
    const parsed = parseOtpDestinationKey(destinationKey);
    if (!parsed || parsed.channel !== "email") {
      return "rejected";
    }
    return this.ledger.verify(destinationKey, code);
  }

  private async sendEmail(to: string, code: string): Promise<boolean> {
    const brand = this.config.appDisplayName;
    const response = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.from,
        to: [to],
        subject: `${brand}: tu código de acceso`,
        text: `Tu código de ${brand} es ${code}. Caduca en 2 minutos. Si no pediste este código, ignora el mensaje.`,
        html: `<p>Tu código de <strong>${escapeHtml(brand)}</strong> es <strong style="font-size:24px;letter-spacing:4px">${escapeHtml(code)}</strong>.</p><p>Caduca en 2 minutos. Si no pediste este código, ignora el mensaje.</p>`,
      }),
    });
    return response.ok;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
