/** Formats integer cents with integer arithmetic. Not a parser for user input. */
export function formatUsdFromMinor(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error("Amount must be a non-negative safe integer in minor units");
  }
  const whole = Math.trunc(amountMinor / 100);
  const fraction = String(amountMinor % 100).padStart(2, "0");
  return `USD ${whole}.${fraction}`;
}
