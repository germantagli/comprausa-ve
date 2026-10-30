import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  productQuoteRejectSchema,
  productRequestCreateSchema,
  productRequestListQuerySchema,
} from "@comprausa/validation";
import type { RequestAccess } from "../auth/access.guard";
import { AccessGuard } from "../auth/access.guard";
import { ProductRequestService } from "./product-request.service";

@ApiTags("product-requests")
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller("v1/product-requests")
export class ProductRequestController {
  constructor(@Inject(ProductRequestService) private readonly service: ProductRequestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Crea una solicitud de producto. Guarda la URL como texto; no la descarga." })
  create(@Req() request: { accessContext: RequestAccess }, @Body() body: unknown) {
    const parsed = productRequestCreateSchema.parse(body);
    return this.service.create(request.accessContext.userId, parsed);
  }

  @Get()
  @ApiOperation({ summary: "Lista las solicitudes del cliente autenticado." })
  list(@Req() request: { accessContext: RequestAccess }, @Query() query: unknown) {
    const parsed = productRequestListQuerySchema.parse(query);
    return this.service.listMine(request.accessContext.userId, parsed);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalle de una solicitud propia, con cotización vigente si existe." })
  get(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string) {
    return this.service.getMine(request.accessContext.userId, id);
  }

  @Post(":id/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Acepta la cotización vigente y crea un pedido pendiente de pago." })
  accept(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string) {
    return this.service.accept(request.accessContext.userId, id);
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rechaza la cotización vigente." })
  reject(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string, @Body() body: unknown) {
    const parsed = productQuoteRejectSchema.parse(body ?? {});
    return this.service.reject(request.accessContext.userId, id, parsed.reason);
  }
}
