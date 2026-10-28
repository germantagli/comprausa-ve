import { sumKnownMinor, type KnownMinorSum, type MinorLine } from "@comprausa/utils";

export type QuoteLifecycle = "PENDING_VALIDATION" | "FINAL" | "ACCEPTED";

export interface QuoteLine extends MinorLine {
  description: string;
  sourceUrl: string | null;
  storeName: string | null;
  productId: string | null;
}

export interface QuoteSnapshot {
  status: "FINAL";
  knownMinor: number;
  lines: readonly QuoteLine[];
}

export interface StoredQuote {
  id: string;
  status: QuoteLifecycle;
  lines: QuoteLine[];
  snapshot: QuoteSnapshot | null;
}

export function quoteSubtotal(lines: readonly QuoteLine[]): KnownMinorSum {
  return sumKnownMinor(lines);
}

/**
 * The operator writes the final amount. Unknown line prices stay null.
 * A snapshot that already exists is not replaced.
 */
export function publishOperatorAmount<T extends StoredQuote>(quote: T, amountMinor: number): T {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 1) {
    throw new Error("invalid amount");
  }
  if (quote.snapshot) {
    return quote;
  }
  const lines = Object.freeze(quote.lines.map((line) => Object.freeze({ ...line })));
  const snapshot: QuoteSnapshot = Object.freeze({
    status: "FINAL",
    knownMinor: amountMinor,
    lines,
  });
  return { ...quote, status: "FINAL", snapshot };
}

/** A missing price stays pending. A complete price becomes final only here. */
export function finalizeBySystem(quote: StoredQuote): StoredQuote {
  if (quote.snapshot) {
    return quote;
  }
  const sum = quoteSubtotal(quote.lines);
  if (sum.knownMinor === null || sum.includesUnknown) {
    return { ...quote, status: "PENDING_VALIDATION", snapshot: null };
  }
  const lines = Object.freeze(quote.lines.map((line) => Object.freeze({ ...line })));
  const snapshot: QuoteSnapshot = Object.freeze({
    status: "FINAL",
    knownMinor: sum.knownMinor,
    lines,
  });
  return { ...quote, status: "FINAL", snapshot };
}
