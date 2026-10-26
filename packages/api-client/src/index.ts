export {
  ApiClientError,
  refreshSession,
  registerAccount,
  requestOtpChallenge,
  revokeSession,
  verifyOtp,
} from "./auth";
export type { AuthenticatedSession, OtpChallengeResponse, OtpDestination, OtpVerificationResponse } from "./auth";
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
  addCartItem,
  createQuote,
  getCart,
  getQuote,
  removeCartItem,
  saveCartItem,
  setCartQuantity,
} from "./commerce";
export type { CartView, QuoteView, VenezuelaAddressInput } from "./commerce";

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
