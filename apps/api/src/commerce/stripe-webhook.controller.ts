import { Controller, HttpCode, HttpStatus, Inject, Post, Req, type RawBodyRequest } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PaymentService } from "./payment.service";

interface SignedRequest {
  header(name: string): string | undefined;
}

@ApiTags("payments")
@Controller("v1")
export class StripeWebhookController {
  constructor(@Inject(PaymentService) private readonly payments: PaymentService) {}

  @Post("payments/stripe/webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Webhook firmado de Stripe. Sin verificador configurado no acepta el cuerpo." })
  webhook(@Req() request: RawBodyRequest<SignedRequest>) {
    const raw = request.rawBody?.toString("utf8") ?? "";
    const signature = request.header("stripe-signature") ?? undefined;
    return this.payments.ingestStripeWebhook(raw, signature);
  }
}
