import { z } from "zod";

const MAX_SAFE_MINOR = Number.MAX_SAFE_INTEGER;

/** Integer USD cents. Rejects fractional numbers. Does not coerce strings. */
export const usdMinorSchema = z
  .number()
  .int()
  .nonnegative()
  .max(MAX_SAFE_MINOR);

export const moneySchema = z
  .object({
    amountMinor: usdMinorSchema,
    currency: z.literal("USD"),
  })
  .strict();

/** Format only. Does not prove the mailbox exists. */
export const emailSchema = z.string().trim().email().max(320);

/**
 * E.164 format only, including +58.
 * Does not prove the line exists or which carrier owns it.
 */
export const phoneE164Schema = z.string().regex(/^\+[1-9]\d{7,14}$/);

export const catalogSearchSchema = z
  .object({
    text: z.string().trim().max(80).default(""),
    limit: z.number().int().min(1).max(20).default(20),
  })
  .strict();

export type MoneyInput = z.infer<typeof moneySchema>;
export type CatalogSearchInput = z.infer<typeof catalogSearchSchema>;
