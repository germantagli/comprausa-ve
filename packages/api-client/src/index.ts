export {
  ApiClientError,
  refreshSession,
  registerAccount,
  requestOtpChallenge,
  enrollTotp,
  revokeSession,
  verifyOtp,
  verifyTotp,
} from "./auth";
export type { AuthenticatedSession, OtpChallengeResponse, OtpDestination, OtpVerificationResponse, TotpEnrollment, TotpSession } from "./auth";
export {
  getAccountProfile,
  getCatalogAvailability,
  getCatalogPricing,
  getCatalogProduct,
  listCatalogCategories,
  listCatalogFilters,
  listInternalStores,
  searchCatalog,
} from "./catalog";
export type { AccountProfile, CatalogAvailability, CatalogDetail, CatalogFilters, CatalogPricing, CatalogSummary, NamedCatalogList } from "./catalog";
export {
  acceptQuote,
  addCartItem,
  createPayment,
  createQuote,
  getCart,
  getPaymentMethods,
  getQuote,
  listProofQueue,
  publishQuoteAmount,
  rejectPayment,
  removeCartItem,
  saveCartItem,
  setCartQuantity,
  submitProof,
  verifyPayment,
} from "./commerce";
export type { CartView, PaymentMethods, PaymentView, QuoteView, VenezuelaAddressInput } from "./commerce";

import { z } from "zod";

const healthSchema = z
  .object({
    status: z.literal("ok"),
    service: z.literal("api"),
    displayName: z.string(),
    catalog: z.literal("internal-demo"),
    otp: z.enum(["simulated", "not_configured"]),
    payments: z.literal("not_configured"),
    stores: z.literal("no_external_connector"),
  })
  .strict();

export type HealthResponse = z.infer<typeof healthSchema>;

export async function getHealth(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  const response = await fetchImpl(new URL("/health", baseUrl));
  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }
  return healthSchema.parse(await response.json());
}
