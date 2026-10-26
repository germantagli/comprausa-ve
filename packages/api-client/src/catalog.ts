import { z } from "zod";
import { ApiClientError } from "./auth";

const summarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    fictional: z.literal(true),
    catalog: z.literal("internal-demo"),
    disclaimer: z.string(),
  })
  .strict();

const searchSchema = z
  .object({
    source: z.literal("internal-demo"),
    items: z.array(summarySchema),
  })
  .strict();

const namedListSchema = z
  .object({
    items: z.array(z.object({ id: z.string(), name: z.string() }).strict()),
  })
  .strict();

const pricingSchema = z
  .object({
    productId: z.string(),
    status: z.enum(["UNPRICED", "PRICED"]),
    amount: z
      .object({
        amountMinor: z.number().int().nonnegative(),
        currency: z.literal("USD"),
      })
      .strict()
      .nullable(),
    note: z.string(),
  })
  .strict();

const detailSchema = summarySchema
  .extend({
    description: z.string(),
    brand: z.string().nullable(),
    store: z.object({ id: z.string(), name: z.string() }).strict().nullable(),
    photos: z.array(z.string()),
    variants: z.array(z.object({ id: z.string(), name: z.string() }).strict()),
  })
  .strict();

const filtersSchema = z
  .object({
    fields: z.array(z.object({ id: z.literal("text"), label: z.string() }).strict()),
  })
  .strict();

const availabilitySchema = z.discriminatedUnion("status", [
  z.object({ productId: z.string(), status: z.literal("UNKNOWN"), quantity: z.null(), note: z.string() }).strict(),
  z
    .object({
      productId: z.string(),
      status: z.literal("KNOWN"),
      quantity: z.number().int().nonnegative(),
      note: z.string(),
    })
    .strict(),
]);

const profileSchema = z
  .object({
    givenName: z.string().nullable(),
    familyName: z.string().nullable(),
    role: z.enum([
      "SUPER_ADMIN",
      "OPERATIONS_ADMIN",
      "PROCUREMENT_AGENT",
      "FINANCE_AGENT",
      "LOGISTICS_AGENT",
      "SUPPORT_AGENT",
      "CUSTOMER",
    ]),
    mfaSatisfied: z.boolean(),
  })
  .strict();

export type CatalogSummary = z.infer<typeof summarySchema>;
export type CatalogDetail = z.infer<typeof detailSchema>;
export type CatalogFilters = z.infer<typeof filtersSchema>;
export type CatalogPricing = z.infer<typeof pricingSchema>;
export type CatalogAvailability = z.infer<typeof availabilitySchema>;
export type AccountProfile = z.infer<typeof profileSchema>;
export type NamedCatalogList = z.infer<typeof namedListSchema>;

async function getJson(baseUrl: string, path: string, token: string | undefined, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(new URL(path, baseUrl), {
      headers: token ? { authorization: `Bearer ${token}`, accept: "application/json" } : { accept: "application/json" },
    });
  } catch {
    throw new ApiClientError(0, { error: "network" });
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiClientError(response.status, payload);
  }
  return payload;
}

export async function searchCatalog(
  baseUrl: string,
  text = "",
  fetchImpl: typeof fetch = fetch,
): Promise<z.infer<typeof searchSchema>> {
  const path = text.trim().length > 0 ? `/v1/catalog/products?text=${encodeURIComponent(text.trim())}` : "/v1/catalog/products";
  return searchSchema.parse(await getJson(baseUrl, path, undefined, fetchImpl));
}

export async function getCatalogProduct(baseUrl: string, productId: string, fetchImpl: typeof fetch = fetch): Promise<CatalogDetail> {
  return detailSchema.parse(await getJson(baseUrl, `/v1/catalog/products/${encodeURIComponent(productId)}`, undefined, fetchImpl));
}

export async function listCatalogFilters(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<CatalogFilters> {
  return filtersSchema.parse(await getJson(baseUrl, "/v1/catalog/filters", undefined, fetchImpl));
}

export async function listCatalogCategories(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<NamedCatalogList> {
  return namedListSchema.parse(await getJson(baseUrl, "/v1/catalog/categories", undefined, fetchImpl));
}

export async function listInternalStores(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<NamedCatalogList> {
  return namedListSchema.parse(await getJson(baseUrl, "/v1/catalog/stores", undefined, fetchImpl));
}

export async function getCatalogPricing(
  baseUrl: string,
  productId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CatalogPricing> {
  return pricingSchema.parse(await getJson(baseUrl, `/v1/catalog/products/${encodeURIComponent(productId)}/pricing`, undefined, fetchImpl));
}

export async function getCatalogAvailability(
  baseUrl: string,
  productId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CatalogAvailability> {
  return availabilitySchema.parse(
    await getJson(baseUrl, `/v1/catalog/products/${encodeURIComponent(productId)}/availability`, undefined, fetchImpl),
  );
}

export async function getAccountProfile(
  baseUrl: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AccountProfile> {
  return profileSchema.parse(await getJson(baseUrl, "/v1/account/profile", accessToken, fetchImpl));
}
