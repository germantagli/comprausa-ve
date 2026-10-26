import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { normalizeReference, type StoredOrder, type StoredPayment } from "./payment-records";
import { inspectProof } from "./proof-bytes";
import { PROOF_STORAGE, type ProofStorage } from "./proof-storage";
import { PAYPAL_PORT, type PayPalCheckoutPort } from "./paypal-port";
import { STRIPE_CLIENT, STRIPE_WEBHOOK, type StripePaymentClient, type StripeWebhookVerifier } from "./stripe-client";
import { MemoryCommerceRepository } from "./memory-commerce.repository";

export interface PaymentInstructions {
  zelle: string | null;
  pagoMovil: { bank: string; phone: string; holder: string } | null;
}

export const PAYMENT_INSTRUCTIONS = Symbol("PAYMENT_INSTRUCTIONS");

@Injectable()
export class PaymentService {
  constructor(
    @Inject(MemoryCommerceRepository) private readonly repository: MemoryCommerceRepository,
    @Inject(STRIPE_CLIENT) private readonly stripe: StripePaymentClient | null,
    @Inject(STRIPE_WEBHOOK) private readonly webhook: StripeWebhookVerifier | null,
    @Inject(PAYPAL_PORT) private readonly paypal: PayPalCheckoutPort,
    @Inject(PROOF_STORAGE) private readonly storage: ProofStorage,
    @Inject(PAYMENT_INSTRUCTIONS) private readonly instructions: PaymentInstructions,
  ) {}

  methods() {
    return {
      stripe: this.stripe
        ? { configured: true, detail: "Stripe está en modo de prueba." }
        : { configured: false, detail: "Stripe no está configurado." },
      paypal: {
        configured: true,
        capture: false,
        detail: "PayPal no captura el pago en este corte.",
      },
      zelle: this.instructions.zelle
        ? { configured: true, detail: this.instructions.zelle, instructions: this.instructions.zelle }
        : { configured: false, detail: "Las instrucciones de Zelle no están configuradas.", instructions: null },
      pagoMovil: this.instructions.pagoMovil
        ? {
            configured: true,
            detail: `${this.instructions.pagoMovil.bank}, ${this.instructions.pagoMovil.phone}, ${this.instructions.pagoMovil.holder}`,
            instructions: this.instructions.pagoMovil,
          }
        : { configured: false, detail: "Las instrucciones de Pago Móvil no están configuradas.", instructions: null },
    };
  }

  async create(userId: string, quoteId: string, input: PaymentRequestInput) {
    const quote = this.repository.readQuote(quoteId);
    if (!quote || quote.userId !== userId) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (quote.status !== "ACCEPTED" || !quote.orderId || !quote.snapshot) {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    const order = this.repository.readOrder(quote.orderId);
    if (!order || order.userId !== userId) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (order.status === "PAID" || order.status === "PAYMENT_UNDER_REVIEW") {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    if (input.method === "STRIPE") {
      return this.createStripe(userId, order, input.idempotencyKey);
    }
    if (input.method === "PAYPAL") {
      return this.createPayPal(userId, order);
    }
    if (input.method === "ZELLE") {
      return this.createManual(userId, order, {
        method: "ZELLE",
        reference: normalizeReference(input.reference),
        payerBank: null,
        payerPhone: null,
        amountMinor: order.grandTotalMinor,
      });
    }
    if (input.amountMinor !== order.grandTotalMinor) {
      throw new HttpException({ error: "invalid_request" }, HttpStatus.BAD_REQUEST);
    }
    return this.createManual(userId, order, {
      method: "PAGO_MOVIL",
      reference: normalizeReference(input.reference),
      payerBank: input.bank.trim(),
      payerPhone: input.phone.trim(),
      amountMinor: input.amountMinor,
    });
  }

  read(userId: string, paymentId: string) {
    const payment = this.repository.readPayment(paymentId);
    if (!payment || payment.userId !== userId) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    return this.present(payment);
  }

  async submitProof(userId: string, paymentId: string, contentType: string, dataBase64: string) {
    const payment = this.repository.readPayment(paymentId);
    if (!payment || payment.userId !== userId) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (payment.method !== "ZELLE" && payment.method !== "PAGO_MOVIL") {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    if (payment.status !== "PENDING" && payment.status !== "REJECTED") {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    const bytes = decodeProof(dataBase64);
    if (!bytes || !inspectProof(contentType, bytes)) {
      throw new HttpException({ error: "invalid_request" }, HttpStatus.BAD_REQUEST);
    }
    let stored: { storageKey: string };
    try {
      stored = await this.storage.put(bytes);
    } catch {
      throw new HttpException({ error: "storage_not_configured" }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    const next = this.repository.savePayment({
      ...payment,
      status: "PROOF_SUBMITTED",
      rejectionReason: null,
      proof: { storageKey: stored.storageKey, contentType, byteLength: bytes.length },
    });
    const order = this.repository.readOrder(payment.orderId);
    if (order) {
      this.repository.saveOrder({ ...order, status: "PAYMENT_UNDER_REVIEW" });
    }
    this.repository.appendAudit({
      actorId: userId,
      action: "payment.proof_submitted",
      entityType: "payment",
      entityId: payment.id,
      metadata: { contentType, byteLength: bytes.length, storageKey: stored.storageKey },
    });
    return this.present(next);
  }

  queue() {
    return {
      items: this.repository.listPaymentsByStatus("PROOF_SUBMITTED").map((payment) => this.present(payment)),
    };
  }

  verify(actorId: string, paymentId: string) {
    const payment = this.repository.readPayment(paymentId);
    if (!payment) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (payment.status !== "PROOF_SUBMITTED") {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    const order = this.repository.readOrder(payment.orderId);
    if (!order) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    const verified = this.repository.savePayment({ ...payment, status: "VERIFIED" });
    const paid = this.repository.saveOrder({
      ...order,
      status: "PAID",
      procurementStatus: "NOT_STARTED",
      purchasedFromStore: false,
    });
    this.repository.appendAudit({
      actorId,
      action: "payment.verified",
      entityType: "payment",
      entityId: payment.id,
      metadata: { orderStatus: "PAID", purchasedFromStore: false },
    });
    return { payment: this.present(verified), order: this.presentOrder(paid) };
  }

  reject(actorId: string, paymentId: string, reason: string) {
    const payment = this.repository.readPayment(paymentId);
    if (!payment) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (payment.status !== "PROOF_SUBMITTED") {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    const order = this.repository.readOrder(payment.orderId);
    const rejected = this.repository.savePayment({ ...payment, status: "REJECTED", rejectionReason: reason });
    if (order) {
      this.repository.saveOrder({ ...order, status: "AWAITING_PAYMENT" });
    }
    this.repository.appendAudit({
      actorId,
      action: "payment.rejected",
      entityType: "payment",
      entityId: payment.id,
      metadata: { reason },
    });
    return this.present(rejected);
  }

  ingestStripeWebhook(rawBody: string, signature: string | undefined) {
    if (!this.webhook) {
      throw new HttpException({ error: "not_configured" }, HttpStatus.NOT_FOUND);
    }
    const event = this.webhook.verify(rawBody, signature);
    if (!event) {
      throw new HttpException({ error: "invalid_signature" }, HttpStatus.BAD_REQUEST);
    }
    if (!this.repository.rememberWebhook(event.eventId)) {
      return { status: "duplicate" as const };
    }
    const payment = event.paymentIntentId ? this.repository.findByProviderReference(event.paymentIntentId) : null;
    if (!payment || payment.method !== "STRIPE" || event.type !== "payment_intent.succeeded") {
      this.repository.appendAudit({
        actorId: null,
        action: "payment.stripe_event",
        entityType: "stripe_event",
        entityId: event.eventId,
        metadata: { type: event.type, applied: false },
      });
      return { status: "ignored" as const };
    }
    const next = this.repository.savePayment({ ...payment, status: "UNDER_REVIEW" });
    const order = this.repository.readOrder(payment.orderId);
    if (order && order.status !== "PAID") {
      this.repository.saveOrder({ ...order, status: "PAYMENT_UNDER_REVIEW" });
    }
    this.repository.appendAudit({
      actorId: null,
      action: "payment.stripe_event",
      entityType: "payment",
      entityId: payment.id,
      metadata: { eventId: event.eventId, type: event.type, applied: true },
    });
    return { status: "recorded" as const, payment: this.present(next) };
  }

  private async createStripe(userId: string, order: StoredOrder, idempotencyKey: string) {
    if (!this.stripe) {
      throw new HttpException({ error: "not_configured" }, HttpStatus.CONFLICT);
    }
    const existing = this.repository.findByIdempotency(idempotencyKey);
    if (existing) {
      if (existing.userId !== userId) {
        throw new HttpException({ error: "duplicate_reference" }, HttpStatus.CONFLICT);
      }
      return { payment: this.present(existing), clientSecret: null, idempotent: true };
    }
    const intent = await this.stripe.createPaymentIntent({
      amountMinor: order.grandTotalMinor,
      currency: "USD",
      idempotencyKey,
    });
    const payment = this.storePayment(userId, order, {
      method: "STRIPE",
      reference: null,
      payerBank: null,
      payerPhone: null,
      amountMinor: order.grandTotalMinor,
      idempotencyKey,
      providerReference: intent.id,
    });
    return { payment: this.present(payment), clientSecret: intent.clientSecret, idempotent: false };
  }

  private async createPayPal(userId: string, order: StoredOrder) {
    const result = await this.paypal.createOrder({ amountMinor: order.grandTotalMinor, currency: "USD" });
    const payment = this.storePayment(userId, order, {
      method: "PAYPAL",
      reference: null,
      payerBank: null,
      payerPhone: null,
      amountMinor: order.grandTotalMinor,
      idempotencyKey: randomUUID(),
      providerReference: null,
    });
    return {
      payment: this.present(payment),
      capture: result.captured,
      detail: "PayPal no captura el pago en este corte.",
    };
  }

  private createManual(
    userId: string,
    order: StoredOrder,
    input: {
      method: "ZELLE" | "PAGO_MOVIL";
      reference: string;
      payerBank: string | null;
      payerPhone: string | null;
      amountMinor: number;
    },
  ) {
    if (this.repository.findByReference(input.method, input.reference)) {
      throw new HttpException({ error: "duplicate_reference" }, HttpStatus.CONFLICT);
    }
    const payment = this.storePayment(userId, order, { ...input, idempotencyKey: randomUUID(), providerReference: null });
    return { payment: this.present(payment) };
  }

  private storePayment(
    userId: string,
    order: StoredOrder,
    input: {
      method: StoredPayment["method"];
      reference: string | null;
      payerBank: string | null;
      payerPhone: string | null;
      amountMinor: number;
      idempotencyKey: string;
      providerReference: string | null;
    },
  ): StoredPayment {
    const payment = this.repository.savePayment({
      id: randomUUID(),
      userId,
      orderId: order.id,
      quoteId: order.quoteId,
      method: input.method,
      status: "PENDING",
      amountMinor: input.amountMinor,
      idempotencyKey: input.idempotencyKey,
      reference: input.reference,
      payerBank: input.payerBank,
      payerPhone: input.payerPhone,
      providerReference: input.providerReference,
      rejectionReason: null,
      proof: null,
    });
    this.repository.appendAudit({
      actorId: userId,
      action: "payment.created",
      entityType: "payment",
      entityId: payment.id,
      metadata: { method: input.method, amountMinor: input.amountMinor, reference: input.reference },
    });
    return payment;
  }

  private present(payment: StoredPayment) {
    const order = this.repository.readOrder(payment.orderId);
    return {
      id: payment.id,
      quoteId: payment.quoteId,
      method: payment.method,
      status: payment.status,
      amountMinor: payment.amountMinor,
      reference: payment.reference,
      payerBank: payment.payerBank,
      payerPhone: payment.payerPhone,
      rejectionReason: payment.rejectionReason,
      proof: payment.proof ? { contentType: payment.proof.contentType, byteLength: payment.proof.byteLength } : null,
      order: order ? this.presentOrder(order) : null,
    };
  }

  private presentOrder(order: StoredOrder) {
    return {
      id: order.id,
      status: order.status,
      procurementStatus: order.procurementStatus,
      purchasedFromStore: order.purchasedFromStore,
      grandTotalMinor: order.grandTotalMinor,
    };
  }
}

function decodeProof(dataBase64: string): Buffer | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64)) {
    return null;
  }
  const bytes = Buffer.from(dataBase64, "base64");
  return bytes.length > 0 ? bytes : null;
}

export type PaymentRequestInput =
  | { method: "STRIPE"; idempotencyKey: string }
  | { method: "PAYPAL" }
  | { method: "ZELLE"; reference: string }
  | { method: "PAGO_MOVIL"; bank: string; phone: string; reference: string; amountMinor: number };
