import { storeIntegrationRegistry } from "@comprausa/types";
import { describe, expect, it } from "vitest";
import { CatalogController } from "./catalog.controller";
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
      expect(item.brand).toBeNull();
      expect(item.store).toBeNull();
      expect(item.photos).toEqual([]);
      expect(item.variants).toEqual([]);
    }
  });

  it("does not list categories or internal stores", () => {
    const controller = new CatalogController();
    expect(controller.filters()).toEqual({ fields: [{ id: "text", label: "Nombre" }] });
    expect(controller.categories()).toEqual({ items: [] });
    expect(controller.stores()).toEqual({ items: [] });
    const blob = JSON.stringify([controller.categories(), controller.stores()]);
    for (const store of storeIntegrationRegistry) {
      expect(blob.includes(store.code)).toBe(false);
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
