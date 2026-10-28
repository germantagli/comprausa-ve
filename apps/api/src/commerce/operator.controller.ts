import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { operatorAmountSchema, paymentRejectionSchema } from "@comprausa/validation";
import type { RequestAccess } from "../auth/access.guard";
import { AccessGuard } from "../auth/access.guard";
import { FinanceGuard } from "../auth/finance.guard";
import { CommerceService } from "./commerce.service";
import { PaymentService } from "./payment.service";

@ApiTags("operator")
@ApiBearerAuth()
@UseGuards(AccessGuard, FinanceGuard)
@Controller("v1/operator")
export class OperatorController {
  constructor(
    @Inject(CommerceService) private readonly commerce: CommerceService,
    @Inject(PaymentService) private readonly payments: PaymentService,
  ) {}

  @Post("quotes/:id/publish")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Un operador escribe el importe final en centavos y publica la instantánea." })
  publish(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string, @Body() body: unknown) {
    const parsed = operatorAmountSchema.parse(body);
    return this.commerce.publishFinal(request.accessContext.userId, id, parsed.amountMinor);
  }

  @Get("payments")
  @ApiOperation({ summary: "Comprobantes esperando revisión." })
  queue() {
    return this.payments.queue();
  }

  @Post("payments/:id/verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verifica el pago. El pedido pasa a PAID y no se compra en la tienda." })
  verify(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string) {
    return this.payments.verify(request.accessContext.userId, id);
  }

  @Post("payments/:id/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rechaza el comprobante con un motivo." })
  reject(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string, @Body() body: unknown) {
    const parsed = paymentRejectionSchema.parse(body);
    return this.payments.reject(request.accessContext.userId, id, parsed.reason);
  }
}
