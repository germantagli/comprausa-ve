import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  productQuoteWriteSchema,
  productRequestListQuerySchema,
  productRequestStatusUpdateSchema,
} from "@comprausa/validation";
import type { RequestAccess } from "../auth/access.guard";
import { AccessGuard } from "../auth/access.guard";
import { StaffGuard } from "../auth/staff.guard";
import { ProductRequestService } from "./product-request.service";

@ApiTags("admin-product-requests")
@ApiBearerAuth()
@UseGuards(AccessGuard, StaffGuard)
@Controller("v1/admin/product-requests")
export class AdminProductRequestController {
  constructor(@Inject(ProductRequestService) private readonly service: ProductRequestService) {}

  @Get("metrics")
  @ApiOperation({ summary: "Indicadores del módulo de solicitudes." })
  metrics() {
    return this.service.adminMetrics();
  }

  @Get()
  @ApiOperation({ summary: "Lista todas las solicitudes para el personal." })
  list(@Query() query: unknown) {
    const parsed = productRequestListQuerySchema.parse(query);
    return this.service.adminList(parsed);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalle administrativo de una solicitud." })
  get(@Param("id") id: string) {
    return this.service.adminGet(id);
  }

  @Post(":id/status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cambia el estado autorizado (En revisión / Cancelada)." })
  status(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string, @Body() body: unknown) {
    const parsed = productRequestStatusUpdateSchema.parse(body);
    return this.service.adminUpdateStatus(request.accessContext, id, parsed.status, parsed.comment);
  }

  @Post(":id/quotes")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Guarda un borrador o envía una cotización. El total se calcula en el servidor." })
  quote(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string, @Body() body: unknown) {
    const parsed = productQuoteWriteSchema.parse(body);
    return this.service.adminSaveQuote(request.accessContext, id, parsed);
  }
}
