import type { Money } from "./money";

export type CatalogKind = "internal-demo";

export interface ProductSummary {
  id: string;
  name: string;
  fictional: boolean;
  catalog: CatalogKind;
  disclaimer: string;
}

export interface ProductSearchQuery {
  text: string;
  limit: number;
}

export interface ProductSearchResult {
  items: ProductSummary[];
  source: "internal-demo";
}

export interface ProductDetails extends ProductSummary {
  description: string;
}

export interface ProductAvailability {
  productId: string;
  status: "UNKNOWN";
  quantity: null;
  note: string;
}

export interface ProductPricing {
  productId: string;
  status: "UNPRICED" | "PRICED";
  amount: Money | null;
  note: string;
}

/**
 * Internal contract for catalog access.
 * The only implementation in this phase is the fictional demo catalog.
 * Affiliate or seller APIs are not implementations of this port.
 */
export interface ProductProvider {
  readonly id: "internal-demo";
  searchProducts(query: ProductSearchQuery): Promise<ProductSearchResult>;
  getProduct(id: string): Promise<ProductDetails | null>;
  getAvailability(id: string): Promise<ProductAvailability | null>;
  getPricing(id: string): Promise<ProductPricing | null>;
}
