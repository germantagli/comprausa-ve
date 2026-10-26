import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { AuditRecord, StoredOrder, StoredPayment } from "./payment-records";
import type { QuoteLifecycle, QuoteLine, QuoteSnapshot } from "./quote-policy";

export interface CartLine {
  productId: string;
  name: string;
  quantity: number;
  unitAmountMinor: number | null;
  storeName: string | null;
  savedForLater: boolean;
  fictional: true;
}

export interface VenezuelaAddress {
  state: string;
  city: string;
  municipality: string;
  reference: string;
}

export interface SavedQuote {
  id: string;
  userId: string;
  status: QuoteLifecycle;
  address: VenezuelaAddress;
  lines: QuoteLine[];
  snapshot: QuoteSnapshot | null;
  orderId: string | null;
}

@Injectable()
export class MemoryCommerceRepository {
  private readonly carts = new Map<string, CartLine[]>();
  private readonly quotes = new Map<string, SavedQuote>();
  private readonly orders = new Map<string, StoredOrder>();
  private readonly payments = new Map<string, StoredPayment>();
  private readonly audits: AuditRecord[] = [];
  private readonly webhookEvents = new Set<string>();

  listCart(userId: string): CartLine[] {
    return (this.carts.get(userId) ?? []).map((line) => ({ ...line }));
  }

  saveCart(userId: string, lines: CartLine[]): void {
    this.carts.set(userId, lines.map((line) => ({ ...line })));
  }

  saveQuote(quote: SavedQuote): SavedQuote {
    const stored = {
      ...quote,
      address: { ...quote.address },
      lines: quote.lines.map((line) => ({ ...line })),
      snapshot: quote.snapshot,
      orderId: quote.orderId,
    };
    this.quotes.set(quote.id, stored);
    return this.readQuote(quote.id) as SavedQuote;
  }

  readQuote(id: string): SavedQuote | null {
    const quote = this.quotes.get(id);
    if (!quote) {
      return null;
    }
    return {
      ...quote,
      address: { ...quote.address },
      lines: quote.lines.map((line) => ({ ...line })),
      snapshot: quote.snapshot,
      orderId: quote.orderId,
    };
  }

  saveOrder(order: StoredOrder): StoredOrder {
    const stored: StoredOrder = { ...order, purchasedFromStore: false, procurementStatus: "NOT_STARTED" };
    this.orders.set(order.id, stored);
    return { ...stored };
  }

  readOrder(id: string): StoredOrder | null {
    const order = this.orders.get(id);
    return order ? { ...order } : null;
  }

  savePayment(payment: StoredPayment): StoredPayment {
    const stored: StoredPayment = { ...payment, proof: payment.proof ? { ...payment.proof } : null };
    this.payments.set(payment.id, stored);
    return this.readPayment(payment.id) as StoredPayment;
  }

  readPayment(id: string): StoredPayment | null {
    const payment = this.payments.get(id);
    return payment ? { ...payment, proof: payment.proof ? { ...payment.proof } : null } : null;
  }

  latestPaymentForQuote(quoteId: string): StoredPayment | null {
    const matches = [...this.payments.values()].filter((payment) => payment.quoteId === quoteId);
    const payment = matches.at(-1);
    return payment ? this.readPayment(payment.id) : null;
  }

  listPaymentsByStatus(status: StoredPayment["status"]): StoredPayment[] {
    return [...this.payments.values()].filter((payment) => payment.status === status).map((payment) => this.readPayment(payment.id) as StoredPayment);
  }

  findByIdempotency(key: string): StoredPayment | null {
    const payment = [...this.payments.values()].find((item) => item.idempotencyKey === key);
    return payment ? this.readPayment(payment.id) : null;
  }

  findByReference(method: StoredPayment["method"], reference: string): StoredPayment | null {
    const payment = [...this.payments.values()].find((item) => item.method === method && item.reference === reference);
    return payment ? this.readPayment(payment.id) : null;
  }

  findByProviderReference(providerReference: string): StoredPayment | null {
    const payment = [...this.payments.values()].find((item) => item.providerReference === providerReference);
    return payment ? this.readPayment(payment.id) : null;
  }

  appendAudit(input: Omit<AuditRecord, "id" | "createdAt">): AuditRecord {
    const record: AuditRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), metadata: { ...input.metadata } };
    this.audits.push(record);
    return { ...record, metadata: { ...record.metadata } };
  }

  listAudit(entityId: string): AuditRecord[] {
    return this.audits.filter((record) => record.entityId === entityId).map((record) => ({ ...record, metadata: { ...record.metadata } }));
  }

  /** Returns false when this event id was already recorded. */
  rememberWebhook(eventId: string): boolean {
    if (this.webhookEvents.has(eventId)) {
      return false;
    }
    this.webhookEvents.add(eventId);
    return true;
  }
}
