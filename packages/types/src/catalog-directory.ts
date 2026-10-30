/**
 * Catalog directory labels for navigation.
 * Not live purchase connectors and not a claim of priced inventory.
 */

export type CatalogDirectoryItem = {
  id: string;
  name: string;
};

/**
 * Partner store codes retained for internal ops / explore — not shown on Home.
 * Home is TraeLo’s own catalog (no third-party store logos).
 */
export const catalogPartnerStores: readonly CatalogDirectoryItem[] = [
  { id: "amazon", name: "Amazon" },
  { id: "walmart", name: "Walmart" },
  { id: "ebay", name: "eBay" },
  { id: "shein", name: "SHEIN" },
  { id: "nike", name: "Nike" },
  { id: "best-buy", name: "Best Buy" },
  { id: "target", name: "Target" },
  { id: "apple", name: "Apple" },
] as const;

/** Full browse taxonomy. */
export const catalogBrowseCategories: readonly CatalogDirectoryItem[] = [
  { id: "electronica", name: "Tecnología" },
  { id: "ropa", name: "Moda" },
  { id: "calzado", name: "Calzado" },
  { id: "hogar", name: "Hogar" },
  { id: "belleza", name: "Belleza" },
  { id: "deportes", name: "Deportes" },
  { id: "juguetes", name: "Juguetes" },
  { id: "supermercado", name: "Supermercado" },
  { id: "videojuegos", name: "Videojuegos" },
  { id: "herramientas", name: "Herramientas" },
] as const;

/** Six categories featured on the TraeLo Home mock. */
export const homeFeaturedCategories: readonly CatalogDirectoryItem[] = [
  { id: "electronica", name: "Tecnología" },
  { id: "ropa", name: "Moda" },
  { id: "calzado", name: "Calzado" },
  { id: "hogar", name: "Hogar" },
  { id: "belleza", name: "Belleza" },
  { id: "deportes", name: "Deportes" },
] as const;
