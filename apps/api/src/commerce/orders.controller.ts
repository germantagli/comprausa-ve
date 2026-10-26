import { Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { RequestAccess } from "../auth/access.guard";
import { AccessGuard } from "../auth/access.guard";
import { FulfillmentService } from "./fulfillment.service";

@ApiTags("orders")
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller("v1/orders")
export class OrdersController {
  constructor(@Inject(FulfillmentService) private readonly fulfillment: FulfillmentService) {}

  @Get()
  @ApiOperation({ summary: "Pedidos de la persona, con la línea de tiempo ya registrada." })
  list(@Req() request: { accessContext: RequestAccess }) {
    return this.fulfillment.listForCustomer(request.accessContext.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Un pedido propio. El de otra persona responde not_found." })
  read(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string) {
    return this.fulfillment.readForCustomer(request.accessContext.userId, id);
  }

  @Post(":id/events")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "La persona no mueve la compra ni la logística." })
  record(): never {
    return this.fulfillment.rejectClientMove();
  }
}
