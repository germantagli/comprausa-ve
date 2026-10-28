import { describe, expect, it, vi } from "vitest";
import { TwilioVerifyOtpProvider } from "./twilio-verify-otp.provider";

const config = {
  accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authToken: "auth-token-test",
  verifyServiceSid: "VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
};

describe("TwilioVerifyOtpProvider", () => {
  it("refuses construction without credentials", () => {
    expect(
      () =>
        new TwilioVerifyOtpProvider({
          accountSid: "",
          authToken: "x",
          verifyServiceSid: "y",
        }),
    ).toThrow(/TWILIO/);
  });

  it("starts SMS and email verifications through Twilio Verify", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: "pending" }), { status: 201 }));
    const provider = new TwilioVerifyOtpProvider(config, fetchImpl as unknown as typeof fetch);

    await expect(provider.issue("phone:+584121234567")).resolves.toEqual({
      status: "accepted",
      expiresInSeconds: 120,
    });
    await expect(provider.issue("email:user@traelo.test")).resolves.toEqual({
      status: "accepted",
      expiresInSeconds: 120,
    });

    const smsCall = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const smsBody = String(smsCall[1].body);
    expect(smsBody).toContain("To=%2B584121234567");
    expect(smsBody).toContain("Channel=sms");
    const emailCall = fetchImpl.mock.calls[1] as unknown as [string, RequestInit];
    expect(String(emailCall[1].body)).toContain("Channel=email");
  });

  it("approves a matching VerificationCheck", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: "approved" }), { status: 200 }));
    const provider = new TwilioVerifyOtpProvider(config, fetchImpl as unknown as typeof fetch);
    await expect(provider.verify("phone:+584121234567", "123456")).resolves.toBe("approved");
  });

  it("rejects failed VerificationCheck responses", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: "pending" }), { status: 200 }));
    const provider = new TwilioVerifyOtpProvider(config, fetchImpl as unknown as typeof fetch);
    await expect(provider.verify("phone:+584121234567", "000000")).resolves.toBe("rejected");
  });

  it("maps Twilio rate limits to throttled", async () => {
    const fetchImpl = vi.fn(async () => new Response("slow", { status: 429 }));
    const provider = new TwilioVerifyOtpProvider(config, fetchImpl as unknown as typeof fetch);
    await expect(provider.issue("phone:+584121234567")).resolves.toEqual({
      status: "throttled",
      expiresInSeconds: 0,
    });
  });
});
