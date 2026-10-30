/**
 * Home catalog adapter.
 * Featured products come from GET /v1/catalog/products (demo today via searchCatalog).
 * Prices/ratings/discounts are NEVER invented — only what pricing API returns.
 *
 * Existing endpoints reused:
 * - GET /v1/catalog/categories
 * - GET /v1/catalog/products (search)
 * - GET /v1/catalog/products/:id/pricing
 * - GET /v1/cart
 * - POST /v1/quotes { address, pastedUrl }
 *
 * Still needed for full mock fidelity (not invented here):
 * - GET featured/home products (dedicated ranking)
 * - GET product images / media
 * - GET ratings & review counts
 * - GET published discounts / special offers
 * - GET favorites + notification badge counts
 */
import {
  getCatalogPricing,
  searchCatalog,
  type CatalogPricing,
  type CatalogSummary,
} from "@comprausa/api-client";
import { catalogPriceLabel } from "@comprausa/utils";

export type HomeFeaturedProduct = {
  id: string;
  name: string;
  fictional: true;
  priceLabel: string;
  pricingStatus: CatalogPricing["status"];
  disclaimer: string;
};

export async function loadHomeFeaturedProducts(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<HomeFeaturedProduct[]> {
  const result = await searchCatalog(baseUrl, "", fetchImpl);
  const cards: HomeFeaturedProduct[] = [];
  for (const item of result.items) {
    cards.push(await toFeaturedCard(baseUrl, item, fetchImpl));
  }
  return cards;
}

async function toFeaturedCard(
  baseUrl: string,
  item: CatalogSummary,
  fetchImpl: typeof fetch,
): Promise<HomeFeaturedProduct> {
  let pricing: CatalogPricing = {
    productId: item.id,
    status: "UNPRICED",
    amount: null,
    note: "Sin precio publicado.",
  };
  try {
    pricing = await getCatalogPricing(baseUrl, item.id, fetchImpl);
  } catch {
    /* keep unpriced */
  }
  return {
    id: item.id,
    name: item.name,
    fictional: true,
    priceLabel: catalogPriceLabel(pricing),
    pricingStatus: pricing.status,
    disclaimer: item.disclaimer,
  };
}
