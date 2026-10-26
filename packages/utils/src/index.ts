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

/** Formats integer cents with integer arithmetic. Not a parser for user input. */
export function formatUsdFromMinor(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error("Amount must be a non-negative safe integer in minor units");
  }
  const whole = Math.trunc(amountMinor / 100);
  const fraction = String(amountMinor % 100).padStart(2, "0");
  return `USD ${whole}.${fraction}`;
}
