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

  it("lists Home directory labels without inventing priced inventory", () => {
    const controller = new CatalogController();
    expect(controller.filters()).toEqual({ fields: [{ id: "text", label: "Nombre" }] });
    const categories = controller.categories();
    const stores = controller.stores();
    expect(categories.items.length).toBeGreaterThan(0);
    expect(stores.items.length).toBeGreaterThan(0);
    for (const item of [...categories.items, ...stores.items]) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(0);
    }
    // Partner codes may appear as directory ids; purchase connectors stay blocked.
    for (const store of storeIntegrationRegistry) {
      if (stores.items.some((item) => item.id === store.code)) {
        expect(store.purchaseConnector).toBe(false);
        expect(store.mode).toBe("BLOCKED");
      }
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
