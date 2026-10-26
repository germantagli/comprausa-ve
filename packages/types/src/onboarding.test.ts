import { describe, expect, it } from "vitest";
import { onboardingSteps } from "./onboarding";

describe("onboardingSteps", () => {
  it("keeps the three Venezuelan Spanish lines", () => {
    expect(onboardingSteps).toEqual([
      "Encuentra tus productos favoritos en Estados Unidos",
      "Compra desde Venezuela con nuestros métodos de pago disponibles",
      "Nos encargamos de gestionar tu pedido y coordinar su envío a Venezuela",
    ]);
  });
});
