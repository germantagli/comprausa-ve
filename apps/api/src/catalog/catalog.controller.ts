import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { catalogBrowseCategories, catalogPartnerStores, type ProductProvider } from "@comprausa/types";
import { catalogSearchSchema } from "@comprausa/validation";
import { InternalDemoCatalogProvider } from "./internal-demo-catalog.provider";

@ApiTags("catalog")
@Controller("v1/catalog")
export class CatalogController {
  private readonly products: ProductProvider = new InternalDemoCatalogProvider();

  @Get("filters")
  @ApiOperation({ summary: "Filtros que el catálogo demo realmente trae. Hoy solo el texto del nombre." })
  filters() {
    return { fields: [{ id: "text" as const, label: "Nombre" }] };
  }

  @Get("categories")
  @ApiOperation({
    summary:
      "Categorías de navegación del Home. Son rubros de exploración, no inventario cotizado ni existencias.",
  })
  categories() {
    return { items: catalogBrowseCategories.map((item) => ({ id: item.id, name: item.name })) };
  }

  @Get("stores")
  @ApiOperation({
    summary:
      "Tiendas partner del directorio Home. Etiquetas de destino para buscar/cotizar; no abren conectores de compra.",
  })
  stores() {
    return { items: catalogPartnerStores.map((item) => ({ id: item.id, name: item.name })) };
  }

  @Get("products")
  @ApiOperation({ summary: "Busca el catálogo interno ficticio. No consulta tiendas." })
  @ApiOkResponse({ description: "Artículos ficticios, sin precio ni existencia." })
  search(@Query("text") text?: string, @Query("limit") limit?: string) {
    const parsedLimit = limit === undefined || limit === "" ? undefined : Number(limit);
    const query = catalogSearchSchema.parse({
      text: text ?? "",
      ...(parsedLimit === undefined ? {} : { limit: parsedLimit }),
    });
    return this.products.searchProducts(query);
  }

  @Get("products/:id")
  @ApiOperation({ summary: "Detalle de un artículo ficticio." })
  async getOne(@Param("id") id: string) {
    const product = await this.products.getProduct(id);
    if (product === null) {
      throw new NotFoundException({ error: "not_found" });
    }
    return product;
  }

  @Get("products/:id/availability")
  async availability(@Param("id") id: string) {
    const availability = await this.products.getAvailability(id);
    if (availability === null) {
      throw new NotFoundException({ error: "not_found" });
    }
    return availability;
  }

  @Get("products/:id/pricing")
  async pricing(@Param("id") id: string) {
    const pricing = await this.products.getPricing(id);
    if (pricing === null) {
      throw new NotFoundException({ error: "not_found" });
    }
    return pricing;
  }
}
