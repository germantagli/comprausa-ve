import { describe, expect, it, vi } from "vitest";
import { ResendOtpProvider } from "./resend-otp.provider";

const config = {
  apiKey: "re_test_key",
  from: "TraeLo <otp@traelo.test>",
  appDisplayName: "TraeLo",
};

describe("ResendOtpProvider", () => {
  it("refuses construction without credentials", () => {
    expect(() => new ResendOtpProvider({ apiKey: "", from: "a@b.c", appDisplayName: "TraeLo" })).toThrow(/RESEND/);
  });

  it("rejects phone destinations as unsupported", async () => {
    const provider = new ResendOtpProvider(config, { now: () => 1 }, vi.fn() as unknown as typeof fetch);
    await expect(provider.issue("phone:+584121234567")).resolves.toEqual({ status: "unsupported" });
  });

  it("sends email OTP and verifies the code without exposing it from issue()", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "email_1" }), { status: 200 }));
    const provider = new ResendOtpProvider(config, { now: () => 1_000 }, fetchImpl as unknown as typeof fetch);
    const issued = await provider.issue("email:user@traelo.test");
    expect(issued).toEqual({ status: "accepted", expiresInSeconds: 120 });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(call[1].body)) as { to: string[]; subject: string; text: string };
    expect(body.to).toEqual(["user@traelo.test"]);
    expect(body.subject).toContain("código");
    const match = body.text.match(/\b(\d{6})\b/);
    expect(match).not.toBeNull();
    const code = match![1]!;
    await expect(provider.verify("email:user@traelo.test", code)).resolves.toBe("approved");
    await expect(provider.verify("email:user@traelo.test", code)).resolves.toBe("rejected");
  });

  it("returns throttled when Resend rejects the send", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate", { status: 429 }));
    const provider = new ResendOtpProvider(config, { now: () => 1 }, fetchImpl as unknown as typeof fetch);
    await expect(provider.issue("email:user@traelo.test")).resolves.toEqual({
      status: "throttled",
      expiresInSeconds: 0,
    });
  });
});
