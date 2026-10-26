import { Module } from "@nestjs/common";
import { parseAppEnv } from "@comprausa/config";
import { CommerceController } from "./commerce.controller";
import { CommerceService } from "./commerce.service";
import { MemoryCommerceRepository } from "./memory-commerce.repository";
import { OperatorController } from "./operator.controller";
import { PaymentController } from "./payment.controller";
import { PAYMENT_INSTRUCTIONS, PaymentService } from "./payment.service";
import { NoCapturePayPalPort, PAYPAL_PORT } from "./paypal-port";
import { LocalDiskProofStorage, MemoryProofStorage, PROOF_STORAGE, S3ProofStorage } from "./proof-storage";
import { createOfficialStripeClient, createOfficialWebhookVerifier, STRIPE_CLIENT, STRIPE_WEBHOOK } from "./stripe-client";
import { StripeWebhookController } from "./stripe-webhook.controller";

@Module({
  controllers: [CommerceController, PaymentController, OperatorController, StripeWebhookController],
  providers: [
    CommerceService,
    PaymentService,
    MemoryCommerceRepository,
    { provide: PAYPAL_PORT, useClass: NoCapturePayPalPort },
    {
      provide: STRIPE_CLIENT,
      useFactory: () => {
        const env = parseAppEnv(process.env);
        return env.stripeTestKey ? createOfficialStripeClient(env.stripeTestKey) : null;
      },
    },
    {
      provide: STRIPE_WEBHOOK,
      useFactory: () => {
        const env = parseAppEnv(process.env);
        return env.stripeWebhookSecret ? createOfficialWebhookVerifier(env.stripeWebhookSecret) : null;
      },
    },
    {
      provide: PROOF_STORAGE,
      useFactory: () => {
        const env = parseAppEnv(process.env);
        if (env.nodeEnv === "development") {
          return new LocalDiskProofStorage();
        }
        if (env.nodeEnv === "production") {
          return new S3ProofStorage();
        }
        return new MemoryProofStorage();
      },
    },
    {
      provide: PAYMENT_INSTRUCTIONS,
      useFactory: () => {
        const env = parseAppEnv(process.env);
        return { zelle: env.zelleInstructions ?? null, pagoMovil: env.pagoMovil ?? null };
      },
    },
  ],
})
export class CommerceModule {}
