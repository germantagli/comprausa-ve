import { storeIntegrationRegistry } from "@comprausa/types";
import { describe, expect, it } from "vitest";
import { demoCatalogItems, InternalDemoCatalogProvider } from "./internal-demo-catalog.provider";

describe("InternalDemoCatalogProvider", () => {
  const provider = new InternalDemoCatalogProvider();

  it("returns only fictional unpriced items", async () => {
    const result = await provider.searchProducts({ text: "", limit: 20 });
    expect(result.source).toBe("internal-demo");
    expect(result.items.length).toBeGreaterThan(0);
    for (const item of demoCatalogItems) {
      expect(item.fictional).toBe(true);
      const pricing = await provider.getPricing(item.id);
      const availability = await provider.getAvailability(item.id);
      expect(pricing).toMatchObject({ status: "UNPRICED", amount: null });
      expect(availability).toMatchObject({ status: "UNKNOWN", quantity: null });
    }
  });

  it("does not use target store names in demo copy", () => {
    const banned = storeIntegrationRegistry.flatMap((store) => [store.code, store.legalName.toLocaleLowerCase("es")]);
    for (const item of demoCatalogItems) {
      const blob = `${item.name} ${item.description} ${item.disclaimer}`.toLocaleLowerCase("es");
      for (const word of banned) {
        expect(blob.includes(word)).toBe(false);
      }
    }
  });
});
