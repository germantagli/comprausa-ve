import { describe, expect, it } from "vitest";
import { parseOtpDestinationKey } from "./otp-destination-key";

describe("parseOtpDestinationKey", () => {
  it("parses email and phone keys", () => {
    expect(parseOtpDestinationKey("email:a@b.c")).toEqual({ channel: "email", destination: "a@b.c" });
    expect(parseOtpDestinationKey("phone:+58412")).toEqual({ channel: "phone", destination: "+58412" });
  });

  it("rejects malformed keys", () => {
    expect(parseOtpDestinationKey("email")).toBeNull();
    expect(parseOtpDestinationKey(":x")).toBeNull();
    expect(parseOtpDestinationKey("sms:+1")).toBeNull();
  });
});
