import { describe, expect, it } from "vitest";
import { catalogPriceLabel, formatUsdFromMinor, fulfillmentLabel, groupByStore, recordedAtLabel, rememberPastedUrl, subtotalLabel, sumKnownMinor } from "./index";

describe("formatUsdFromMinor", () => {
  it("formats cents without binary floating point", () => {
    expect(formatUsdFromMinor(0)).toBe("USD 0.00");
    expect(formatUsdFromMinor(1)).toBe("USD 0.01");
    expect(formatUsdFromMinor(1250)).toBe("USD 12.50");
  });

  it("says the price is by quote when the catalog has no amount", () => {
    expect(catalogPriceLabel({ status: "UNPRICED", amount: null })).toBe("Precio por cotización");
    expect(catalogPriceLabel({ status: "UNPRICED", amount: { amountMinor: 100 } })).toBe("Precio por cotización");
    expect(catalogPriceLabel({ status: "PRICED", amount: { amountMinor: 1250 } })).toBe("USD 12.50");
  });

  it("sums only known cents and leaves an unknown price out", () => {
    expect(sumKnownMinor([{ unitAmountMinor: null, quantity: 2 }])).toEqual({
      knownMinor: null,
      includesUnknown: true,
    });
    expect(subtotalLabel({ knownMinor: null, includesUnknown: true })).toBe("Subtotal por cotización");
    expect(
      sumKnownMinor([
        { unitAmountMinor: 150, quantity: 2 },
        { unitAmountMinor: null, quantity: 4 },
        { unitAmountMinor: 50, quantity: 1, savedForLater: true },
      ]),
    ).toEqual({ knownMinor: 300, includesUnknown: true });
    expect(subtotalLabel({ knownMinor: 300, includesUnknown: true })).toBe(
      "USD 3.00. Hay precios por cotización que no entran en esta suma.",
    );
  });

  it("groups lines by store and keeps a missing store in its own group", () => {
    expect(
      groupByStore([
        { storeName: "Norte", id: "a" },
        { storeName: null, id: "b" },
        { storeName: "Norte", id: "c" },
      ]),
    ).toEqual([
      { storeName: "Norte", items: [{ storeName: "Norte", id: "a" }, { storeName: "Norte", id: "c" }] },
      { storeName: "Sin tienda", items: [{ storeName: null, id: "b" }] },
    ]);
  });

  it("stores a pasted link as text and does not fetch it", () => {
    const calls: unknown[] = [];
    const target = globalThis as { fetch?: (...args: unknown[]) => unknown };
    const original = target.fetch;
    target.fetch = (...args: unknown[]) => {
      calls.push(args);
      return Promise.resolve();
    };
    try {
      expect(rememberPastedUrl("https://example.com/item/1")).toEqual({
        description: "Enlace pegado",
        sourceUrl: "https://example.com/item/1",
        quantity: 1,
        unitAmountMinor: null,
        storeName: null,
      });
      expect(calls).toEqual([]);
      expect(() => rememberPastedUrl("javascript:alert(1)")).toThrow(/invalid url/);
    } finally {
      target.fetch = original;
    }
  });

  it("names a recorded movement without promising a delivery date", () => {
    expect(fulfillmentLabel("PURCHASED_FROM_STORE")).toBe("Comprado en la tienda");
    expect(fulfillmentLabel("PAID")).toBe("Pagado");
    const recorded = recordedAtLabel("2026-10-26T15:04:00.000Z");
    expect(recorded.startsWith("Registrado el ")).toBe(true);
    expect(recorded).toContain("2026");
    expect(recorded.toLowerCase()).not.toMatch(/estimad|llega el|fecha de entrega/);
  });

  it("rejects fractional numbers", () => {
    expect(() => formatUsdFromMinor(10.5)).toThrow(/minor units/);
    expect(() => formatUsdFromMinor(-1)).toThrow(/minor units/);
  });
});
