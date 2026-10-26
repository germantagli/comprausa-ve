import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { trackingEventSchema } from "@comprausa/validation";
import type { RequestAccess } from "../auth/access.guard";
import { AccessGuard } from "../auth/access.guard";
import { FulfillmentGuard } from "../auth/fulfillment.guard";
import { FulfillmentService } from "./fulfillment.service";

@ApiTags("operator")
@ApiBearerAuth()
@UseGuards(AccessGuard, FulfillmentGuard)
@Controller("v1/operator")
export class FulfillmentController {
  constructor(@Inject(FulfillmentService) private readonly fulfillment: FulfillmentService) {}

  @Get("orders")
  @ApiOperation({ summary: "Cola de pedidos pagados para compra y logística manual." })
  queue() {
    return this.fulfillment.listForOperator();
  }

  @Post("orders/:id/events")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Registra el siguiente estado, con nota. No acepta una fecha prometida." })
  record(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string, @Body() body: unknown) {
    const parsed = trackingEventSchema.parse(body);
    return this.fulfillment.record(request.accessContext.userId, id, parsed.status, parsed.note);
  }
}
