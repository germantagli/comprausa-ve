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

export const authChannelSchema = z.enum(["email", "phone"]);
export const clientPlatformSchema = z.enum(["IOS", "ANDROID", "WEB"]);
export const deviceIdSchema = z.string().uuid();
export const otpCodeSchema = z.string().regex(/^\d{6}$/);
export const personNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[\p{L}][\p{L}\s'.-]*$/u);

const destinationShape = {
  channel: authChannelSchema,
  destination: z.string().trim().min(1).max(320),
};

function refineDestination(
  value: { channel: "email" | "phone"; destination: string },
  ctx: z.RefinementCtx,
): void {
  const parsed = value.channel === "email" ? emailSchema.safeParse(value.destination) : phoneE164Schema.safeParse(value.destination);
  if (!parsed.success) {
    ctx.addIssue({ code: "custom", path: ["destination"], message: "invalid destination" });
  }
}

function normalizeAuthFields<T extends { channel: "email" | "phone"; destination: string }>(value: T): T {
  return {
    ...value,
    destination: value.channel === "email" ? value.destination.toLowerCase() : value.destination,
  };
}

export const otpChallengeSchema = z
  .object({
    ...destinationShape,
    deviceId: deviceIdSchema,
  })
  .strict()
  .superRefine(refineDestination)
  .transform(normalizeAuthFields);

export const otpVerificationSchema = z
  .object({
    ...destinationShape,
    code: otpCodeSchema,
    deviceId: deviceIdSchema,
    platform: clientPlatformSchema,
  })
  .strict()
  .superRefine(refineDestination)
  .transform(normalizeAuthFields);

export const devOtpSchema = z
  .object(destinationShape)
  .strict()
  .superRefine(refineDestination)
  .transform(normalizeAuthFields);

export const registrationSchema = z
  .object({
    registrationToken: z.string().min(1).max(4096),
    givenName: personNameSchema,
    familyName: personNameSchema,
    deviceId: deviceIdSchema,
    platform: clientPlatformSchema,
  })
  .strict();

export const refreshSessionSchema = z
  .object({
    refreshToken: z.string().min(1).max(512),
  })
  .strict();

export type MoneyInput = z.infer<typeof moneySchema>;
export type CatalogSearchInput = z.infer<typeof catalogSearchSchema>;
export type OtpChallengeInput = z.infer<typeof otpChallengeSchema>;
export type OtpVerificationInput = z.infer<typeof otpVerificationSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
