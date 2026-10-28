import { describe, expect, it } from "vitest";
import { finalizeBySystem, publishOperatorAmount, type QuoteLine, type StoredQuote } from "./quote-policy";

function line(partial: Partial<QuoteLine> & Pick<QuoteLine, "unitAmountMinor">): QuoteLine {
  return {
    description: "Pieza",
    sourceUrl: null,
    storeName: null,
    productId: "demo",
    quantity: 1,
    savedForLater: false,
    ...partial,
  };
}

function pending(lines: QuoteLine[]): StoredQuote {
  return { id: "q1", status: "PENDING_VALIDATION", lines, snapshot: null };
}

describe("finalizeBySystem", () => {
  it("keeps a quote pending when a price is missing and does not store zero", () => {
    const quote = finalizeBySystem(pending([line({ unitAmountMinor: null, quantity: 3 })]));
    expect(quote.status).toBe("PENDING_VALIDATION");
    expect(quote.snapshot).toBeNull();
    expect(quote.lines[0]?.unitAmountMinor).toBeNull();
  });

  it("freezes a final snapshot only when every cent is known", () => {
    const quote = finalizeBySystem(
      pending([line({ unitAmountMinor: 250, quantity: 2, storeName: "A" }), line({ unitAmountMinor: 50, productId: "b" })]),
    );
    expect(quote.status).toBe("FINAL");
    expect(quote.snapshot?.knownMinor).toBe(550);
    expect(() => {
      (quote.snapshot?.lines[0] as { quantity: number }).quantity = 9;
    }).toThrow();
    const again = finalizeBySystem(quote);
    expect(again.snapshot).toBe(quote.snapshot);
  });
});

describe("publishOperatorAmount", () => {
  it("freezes the cents the operator wrote and leaves an unknown price null", () => {
    const quote = publishOperatorAmount(pending([line({ unitAmountMinor: null, quantity: 2 })]), 1800);
    expect(quote.status).toBe("FINAL");
    expect(quote.snapshot?.knownMinor).toBe(1800);
    expect(quote.lines[0]?.unitAmountMinor).toBeNull();
    expect(quote.snapshot?.lines[0]?.unitAmountMinor).toBeNull();
    const again = publishOperatorAmount(quote, 9999);
    expect(again.snapshot).toBe(quote.snapshot);
    expect(again.snapshot?.knownMinor).toBe(1800);
  });
});
