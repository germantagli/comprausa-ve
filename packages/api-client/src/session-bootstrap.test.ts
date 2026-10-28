import { describe, expect, it } from "vitest";
import { decideEntryGate } from "./session-bootstrap";

describe("decideEntryGate", () => {
  it("shows splash for phone visitors without a session", () => {
    expect(
      decideEntryGate({ requiresSplash: true, hasValidSession: false, onboardingCompleted: false }),
    ).toBe("splash");
  });

  it("does not show onboarding before login even if the flag is unset", () => {
    expect(
      decideEntryGate({ requiresSplash: false, hasValidSession: false, onboardingCompleted: false }),
    ).toBe("app");
  });

  it("sends newly authenticated users to onboarding", () => {
    expect(
      decideEntryGate({ requiresSplash: true, hasValidSession: true, onboardingCompleted: false }),
    ).toBe("onboarding");
    expect(
      decideEntryGate({ requiresSplash: false, hasValidSession: true, onboardingCompleted: false }),
    ).toBe("onboarding");
  });

  it("sends authenticated users who finished onboarding to the app", () => {
    expect(
      decideEntryGate({ requiresSplash: true, hasValidSession: true, onboardingCompleted: true }),
    ).toBe("app");
  });

  it("does not force splash on desktop-width web", () => {
    expect(
      decideEntryGate({ requiresSplash: false, hasValidSession: false, onboardingCompleted: true }),
    ).toBe("app");
  });
});
