import type { CatalogAvailability, CatalogDetail, CatalogPricing, CatalogSummary } from "@comprausa/api-client";

/**
 * Espejo del catálogo internal-demo de la API.
 * Se usa en la home si el API no responde, para que las fichas siempre se vean.
 * Sin precios inventados.
 */
const DISCLAIMER =
  "Producto ficticio del catálogo interno de demostración. No es una oferta, no tiene precio ni existencia, y no pertenece a ninguna tienda.";

export interface DemoProductCard {
  item: CatalogSummary;
  pricing: CatalogPricing;
  availability: CatalogAvailability;
  /** Precio solo de maqueta, marcado como no real en la UI. */
  maquetaPriceLabel?: string;
  fromFallback?: boolean;
}

/** Montos visibles de la maqueta: no son oferta ni cotización real. */
const MAQUETA_PRICES: Record<string, string> = {
  "demo-norte": "USD 24.90 · maqueta (no real)",
  "demo-centro": "USD 12.50 · maqueta (no real)",
  "demo-sur": "USD 39.00 · maqueta (no real)",
};

const DEMO_DETAILS: readonly CatalogDetail[] = [
  {
    id: "demo-norte",
    name: "Caja de demostración Norte",
    description: "Objeto inventado para ejercer el contrato de catálogo. No se compra y no se envía.",
    fictional: true,
    catalog: "internal-demo",
    disclaimer: DISCLAIMER,
    brand: null,
    store: null,
    photos: [],
    variants: [],
  },
  {
    id: "demo-centro",
    name: "Sobre de demostración Centro",
    description: "Otro objeto inventado, sin marca y sin imagen, para pruebas de búsqueda.",
    fictional: true,
    catalog: "internal-demo",
    disclaimer: DISCLAIMER,
    brand: null,
    store: null,
    photos: [],
    variants: [],
  },
  {
    id: "demo-sur",
    name: "Kit de demostración Sur",
    description: "Pieza ficticia usada solo para comprobar que el proveedor no publica precios.",
    fictional: true,
    catalog: "internal-demo",
    disclaimer: DISCLAIMER,
    brand: null,
    store: null,
    photos: [],
    variants: [],
  },
];

const DEMO_ITEMS: readonly CatalogSummary[] = DEMO_DETAILS.map(({ id, name, fictional, catalog, disclaimer }) => ({
  id,
  name,
  fictional,
  catalog,
  disclaimer,
}));

function unpriced(productId: string): CatalogPricing {
  return {
    productId,
    status: "UNPRICED",
    amount: null,
    note: "El catálogo de demostración no publica precios, descuentos ni fechas.",
  };
}

function unknownStock(productId: string): CatalogAvailability {
  return {
    productId,
    status: "UNKNOWN",
    quantity: null,
    note: "No hay existencia real asociada a este artículo.",
  };
}

export function demoProductCards(query = ""): DemoProductCard[] {
  const text = query.trim().toLocaleLowerCase("es");
  return DEMO_ITEMS.filter((item) => text.length === 0 || item.name.toLocaleLowerCase("es").includes(text)).map((item) => ({
    item,
    pricing: unpriced(item.id),
    availability: unknownStock(item.id),
    maquetaPriceLabel: MAQUETA_PRICES[item.id],
    fromFallback: true,
  }));
}

export function demoProductDetail(productId: string): {
  product: CatalogDetail;
  pricing: CatalogPricing;
  availability: CatalogAvailability;
  maquetaPriceLabel?: string;
} | null {
  const product = DEMO_DETAILS.find((item) => item.id === productId) ?? null;
  if (!product) {
    return null;
  }
  return {
    product,
    pricing: unpriced(product.id),
    availability: unknownStock(product.id),
    maquetaPriceLabel: MAQUETA_PRICES[product.id],
  };
}

export function maquetaPriceFor(productId: string): string | undefined {
  return MAQUETA_PRICES[productId];
}

export const referenceStoreCards = [
  { id: "ref-amazon", name: "Amazon", note: "Tienda de referencia. Sin logo oficial ni conector." },
  { id: "ref-walmart", name: "Walmart", note: "Tienda de referencia. Sin logo oficial ni conector." },
  { id: "ref-ebay", name: "eBay", note: "Tienda de referencia. Sin logo oficial ni conector." },
  { id: "ref-shein", name: "SHEIN", note: "Tienda de referencia. Sin logo oficial ni conector." },
  { id: "ref-temu", name: "Temu", note: "Tienda de referencia. Sin logo oficial ni conector." },
  { id: "ref-nike", name: "Nike", note: "Tienda de referencia. Sin logo oficial ni conector." },
  { id: "ref-bestbuy", name: "Best Buy", note: "Tienda de referencia. Sin logo oficial ni conector." },
  { id: "ref-target", name: "Target", note: "Tienda de referencia. Sin logo oficial ni conector." },
] as const;
