/**
 * Partner destinations and browse categories shown on Home.
 * These are directory labels for navigation/search — not live purchase connectors
 * and not a claim of priced inventory.
 */

export type CatalogDirectoryItem = {
  id: string;
  name: string;
};

/** Popular partner destinations from the product mock (Home grid). */
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

/** Browse categories shown on Home. No priced products attached. */
export const catalogBrowseCategories: readonly CatalogDirectoryItem[] = [
  { id: "electronica", name: "Electrónica" },
  { id: "ropa", name: "Ropa y Moda" },
  { id: "calzado", name: "Calzado" },
  { id: "hogar", name: "Hogar" },
  { id: "belleza", name: "Belleza" },
  { id: "deportes", name: "Deportes" },
  { id: "juguetes", name: "Juguetes" },
  { id: "supermercado", name: "Supermercado" },
  { id: "videojuegos", name: "Videojuegos" },
  { id: "herramientas", name: "Herramientas" },
] as const;
