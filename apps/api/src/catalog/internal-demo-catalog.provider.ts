import type {
  ProductAvailability,
  ProductDetails,
  ProductPricing,
  ProductProvider,
  ProductSearchQuery,
  ProductSearchResult,
} from "@comprausa/types";

const DISCLAIMER =
  "Producto ficticio del catálogo interno de demostración. No es una oferta, no tiene precio ni existencia, y no pertenece a ninguna tienda.";

const ITEMS: readonly ProductDetails[] = [
  {
    id: "demo-norte",
    name: "Caja de demostración Norte",
    description: "Objeto inventado para ejercer el contrato de catálogo. No se compra y no se envía.",
    fictional: true,
    catalog: "internal-demo",
    disclaimer: DISCLAIMER,
  },
  {
    id: "demo-centro",
    name: "Sobre de demostración Centro",
    description: "Otro objeto inventado, sin marca y sin imagen, para pruebas de búsqueda.",
    fictional: true,
    catalog: "internal-demo",
    disclaimer: DISCLAIMER,
  },
  {
    id: "demo-sur",
    name: "Kit de demostración Sur",
    description: "Pieza ficticia usada solo para comprobar que el proveedor no publica precios.",
    fictional: true,
    catalog: "internal-demo",
    disclaimer: DISCLAIMER,
  },
];

const UNPRICED_NOTE = "El catálogo de demostración no publica precios, descuentos ni fechas.";
const UNKNOWN_STOCK_NOTE = "No hay existencia real asociada a este artículo.";

export class InternalDemoCatalogProvider implements ProductProvider {
  readonly id = "internal-demo" as const;

  async searchProducts(query: ProductSearchQuery): Promise<ProductSearchResult> {
    const text = query.text.trim().toLocaleLowerCase("es");
    const items = ITEMS.filter((item) => text.length === 0 || item.name.toLocaleLowerCase("es").includes(text)).slice(
      0,
      query.limit,
    );
    return {
      source: "internal-demo",
      items: items.map(toSummary),
    };
  }

  async getProduct(id: string): Promise<ProductDetails | null> {
    return ITEMS.find((item) => item.id === id) ?? null;
  }

  async getAvailability(id: string): Promise<ProductAvailability | null> {
    const item = await this.getProduct(id);
    if (item === null) {
      return null;
    }
    return {
      productId: item.id,
      status: "UNKNOWN",
      quantity: null,
      note: UNKNOWN_STOCK_NOTE,
    };
  }

  async getPricing(id: string): Promise<ProductPricing | null> {
    const item = await this.getProduct(id);
    if (item === null) {
      return null;
    }
    return {
      productId: item.id,
      status: "UNPRICED",
      amount: null,
      note: UNPRICED_NOTE,
    };
  }
}

function toSummary(item: ProductDetails) {
  return {
    id: item.id,
    name: item.name,
    fictional: item.fictional,
    catalog: item.catalog,
    disclaimer: item.disclaimer,
  };
}

export const demoCatalogItems = ITEMS;
