import { describe, expect, it } from "vitest";
import { onboardingSteps } from "./onboarding";

describe("onboardingSteps", () => {
  it("keeps the four TraeLo bienvenida screens", () => {
    expect(onboardingSteps).toHaveLength(4);
    expect(onboardingSteps.map((step) => step.id)).toEqual(["1", "2", "3", "4"]);
    expect(onboardingSteps[0]?.title).toBe("¡Bienvenido a TraeLo!");
    expect(onboardingSteps[3]?.primaryLabel).toBe("Empezar a comprar");
    expect(onboardingSteps.every((step) => step.bullets.length >= 3)).toBe(true);
  });
});
