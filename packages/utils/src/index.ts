/** Shown when the catalog has no price. Never invents an amount. */
export function catalogPriceLabel(pricing: {
  status: string;
  amount: { amountMinor: number } | null;
}): string {
  if (pricing.status === "PRICED" && pricing.amount !== null && Number.isSafeInteger(pricing.amount.amountMinor)) {
    return formatUsdFromMinor(pricing.amount.amountMinor);
  }
  return "Precio por cotización";
}

export interface MinorLine {
  unitAmountMinor: number | null;
  quantity: number;
  savedForLater?: boolean;
}

export interface KnownMinorSum {
  knownMinor: number | null;
  includesUnknown: boolean;
}

/** Sums integer cents. A null amount is omitted. It is not stored as zero. */
export function sumKnownMinor(lines: readonly MinorLine[]): KnownMinorSum {
  let sum = 0;
  let priced = 0;
  let includesUnknown = false;
  for (const line of lines) {
    if (line.savedForLater) {
      continue;
    }
    if (line.unitAmountMinor === null) {
      includesUnknown = true;
      continue;
    }
    if (!Number.isSafeInteger(line.unitAmountMinor) || line.unitAmountMinor < 0) {
      throw new Error("Amount must be a non-negative safe integer in minor units");
    }
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) {
      throw new Error("Quantity must be a positive safe integer");
    }
    const next = sum + line.unitAmountMinor * line.quantity;
    if (!Number.isSafeInteger(next)) {
      throw new Error("Amount must be a non-negative safe integer in minor units");
    }
    sum = next;
    priced += 1;
  }
  return { knownMinor: priced === 0 ? null : sum, includesUnknown };
}

export function subtotalLabel(subtotal: KnownMinorSum): string {
  if (subtotal.knownMinor === null) {
    return "Subtotal por cotización";
  }
  const money = formatUsdFromMinor(subtotal.knownMinor);
  if (subtotal.includesUnknown) {
    return `${money}. Hay precios por cotización que no entran en esta suma.`;
  }
  return money;
}

export function groupByStore<T extends { storeName: string | null }>(
  items: readonly T[],
): { storeName: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = item.storeName ?? "Sin tienda";
    const list = groups.get(name) ?? [];
    list.push(item);
    groups.set(name, list);
  }
  return [...groups.entries()].map(([storeName, grouped]) => ({ storeName, items: grouped }));
}

export interface PastedQuoteLine {
  description: string;
  sourceUrl: string;
  quantity: 1;
  unitAmountMinor: null;
  storeName: null;
}

/** Stores the URL as text. Does not call fetch. */
export function rememberPastedUrl(url: string): PastedQuoteLine {
  const trimmed = url.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) {
    throw new Error("invalid url");
  }
  return {
    description: "Enlace pegado",
    sourceUrl: trimmed,
    quantity: 1,
    unitAmountMinor: null,
    storeName: null,
  };
}

/** Formats integer cents with integer arithmetic. Not a parser for user input. */
export function formatUsdFromMinor(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error("Amount must be a non-negative safe integer in minor units");
  }
  const whole = Math.trunc(amountMinor / 100);
  const fraction = String(amountMinor % 100).padStart(2, "0");
  return `USD ${whole}.${fraction}`;
}
