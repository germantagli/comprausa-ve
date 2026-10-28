import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { paymentRequestSchema, proofUploadSchema } from "@comprausa/validation";
import type { RequestAccess } from "../auth/access.guard";
import { AccessGuard } from "../auth/access.guard";
import { PaymentService } from "./payment.service";

@ApiTags("payments")
@ApiBearerAuth()
@UseGuards(AccessGuard)
@Controller("v1")
export class PaymentController {
  constructor(@Inject(PaymentService) private readonly payments: PaymentService) {}

  @Get("payments/methods")
  @ApiOperation({ summary: "Métodos de pago. Stripe solo aparece configurado con una clave de prueba." })
  methods() {
    return this.payments.methods();
  }

  @Post("quotes/:id/payments")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Elige un método después de aceptar la cotización final. No marca el pago como verificado." })
  create(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string, @Body() body: unknown) {
    const parsed = paymentRequestSchema.parse(body);
    return this.payments.create(request.accessContext.userId, id, parsed);
  }

  @Get("payments/:id")
  read(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string) {
    return this.payments.read(request.accessContext.userId, id);
  }

  @Post("payments/:id/proof")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Sube un comprobante. Deja el pago en PROOF_SUBMITTED y el pedido en revisión." })
  proof(@Req() request: { accessContext: RequestAccess }, @Param("id") id: string, @Body() body: unknown) {
    const parsed = proofUploadSchema.parse(body);
    return this.payments.submitProof(request.accessContext.userId, id, parsed.contentType, parsed.dataBase64);
  }
}
