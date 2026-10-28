import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { ProductPricing } from "@comprausa/types";
import { groupByStore, rememberPastedUrl, sumKnownMinor } from "@comprausa/utils";
import { randomUUID } from "node:crypto";
import { publishOperatorAmount } from "./quote-policy";
import { InternalDemoCatalogProvider } from "../catalog/internal-demo-catalog.provider";
import type { CartLine, SavedQuote, VenezuelaAddress } from "./memory-commerce.repository";
import { MemoryCommerceRepository } from "./memory-commerce.repository";
import type { QuoteLine } from "./quote-policy";

@Injectable()
export class CommerceService {
  private readonly catalog = new InternalDemoCatalogProvider();

  constructor(@Inject(MemoryCommerceRepository) private readonly repository: MemoryCommerceRepository) {}

  async addItem(userId: string, productId: string, quantity: number): Promise<ReturnType<CommerceService["cart"]>> {
    const product = await this.catalog.getProduct(productId);
    const pricing = await this.catalog.getPricing(productId);
    if (!product || !pricing) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    const lines = this.repository.listCart(userId);
    const existing = lines.find((line) => line.productId === productId);
    const nextQuantity = Math.min(20, (existing?.quantity ?? 0) + quantity);
    const line: CartLine = {
      productId,
      name: product.name,
      quantity: nextQuantity,
      unitAmountMinor: unitMinor(pricing),
      storeName: product.store?.name ?? null,
      savedForLater: false,
      fictional: true,
    };
    const rest = lines.filter((item) => item.productId !== productId);
    this.repository.saveCart(userId, [...rest, line]);
    return this.cart(userId);
  }

  cart(userId: string) {
    const lines = this.repository.listCart(userId);
    const active = lines.filter((line) => !line.savedForLater);
    const saved = lines.filter((line) => line.savedForLater);
    return {
      groups: groupByStore(active),
      saved,
      subtotal: sumKnownMinor(active),
    };
  }

  setQuantity(userId: string, productId: string, quantity: number) {
    const lines = this.replace(userId, productId, (line) => ({ ...line, quantity }));
    if (!lines) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    return this.cart(userId);
  }

  remove(userId: string, productId: string) {
    const lines = this.repository.listCart(userId);
    if (!lines.some((line) => line.productId === productId)) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    this.repository.saveCart(
      userId,
      lines.filter((line) => line.productId !== productId),
    );
    return this.cart(userId);
  }

  saveForLater(userId: string, productId: string, savedForLater: boolean) {
    const lines = this.replace(userId, productId, (line) => ({ ...line, savedForLater }));
    if (!lines) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    return this.cart(userId);
  }

  async createQuote(userId: string, address: VenezuelaAddress, pastedUrl: string | undefined) {
    const active = this.repository.listCart(userId).filter((line) => !line.savedForLater);
    const lines: QuoteLine[] = active.map((line) => ({
      description: line.name,
      sourceUrl: null,
      quantity: line.quantity,
      unitAmountMinor: line.unitAmountMinor,
      storeName: line.storeName,
      productId: line.productId,
      savedForLater: false,
    }));
    if (pastedUrl) {
      const pasted = rememberPastedUrl(pastedUrl);
      lines.push({
        description: pasted.description,
        sourceUrl: pasted.sourceUrl,
        quantity: pasted.quantity,
        unitAmountMinor: pasted.unitAmountMinor,
        storeName: pasted.storeName,
        productId: null,
        savedForLater: false,
      });
    }
    if (lines.length === 0) {
      throw new HttpException({ error: "invalid_request" }, HttpStatus.BAD_REQUEST);
    }
    const quote = this.repository.saveQuote({
      id: randomUUID(),
      userId,
      status: "PENDING_VALIDATION",
      address,
      lines,
      snapshot: null,
      orderId: null,
    });
    return this.present(quote);
  }

  readQuote(userId: string, quoteId: string) {
    const quote = this.repository.readQuote(quoteId);
    if (!quote || quote.userId !== userId) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    return this.present(quote);
  }

  private present(quote: SavedQuote) {
    const payment = this.repository.latestPaymentForQuote(quote.id);
    const order = quote.orderId ? this.repository.readOrder(quote.orderId) : null;
    return {
      id: quote.id,
      status: quote.status,
      address: quote.address,
      lines: quote.lines,
      snapshot: quote.snapshot,
      subtotal: sumKnownMinor(quote.lines),
      orderId: quote.orderId,
      order: order
        ? {
            id: order.id,
            status: order.status,
            procurementStatus: order.procurementStatus,
            purchasedFromStore: order.purchasedFromStore,
            grandTotalMinor: order.grandTotalMinor,
          }
        : null,
      payment: payment
        ? {
            id: payment.id,
            method: payment.method,
            status: payment.status,
            amountMinor: payment.amountMinor,
            rejectionReason: payment.rejectionReason,
            reference: payment.reference,
          }
        : null,
    };
  }

  publishFinal(actorId: string, quoteId: string, amountMinor: number) {
    const quote = this.repository.readQuote(quoteId);
    if (!quote) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (quote.snapshot || quote.status !== "PENDING_VALIDATION") {
      throw new HttpException({ error: "immutable" }, HttpStatus.CONFLICT);
    }
    const published = publishOperatorAmount(quote, amountMinor);
    const saved = this.repository.saveQuote(published);
    this.repository.appendAudit({
      actorId,
      action: "quote.published",
      entityType: "quote",
      entityId: quoteId,
      metadata: { amountMinor },
    });
    return this.present(saved);
  }

  acceptQuote(userId: string, quoteId: string) {
    const quote = this.repository.readQuote(quoteId);
    if (!quote || quote.userId !== userId) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (quote.status !== "FINAL" || !quote.snapshot) {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    const order = this.repository.saveOrder({
      id: randomUUID(),
      userId,
      quoteId,
      status: "AWAITING_PAYMENT",
      procurementStatus: "NOT_STARTED",
      grandTotalMinor: quote.snapshot.knownMinor,
      purchasedFromStore: false,
      createdAt: new Date().toISOString(),
    });
    const saved = this.repository.saveQuote({ ...quote, status: "ACCEPTED", orderId: order.id });
    this.repository.appendAudit({
      actorId: userId,
      action: "quote.accepted",
      entityType: "quote",
      entityId: quoteId,
      metadata: { amountMinor: quote.snapshot.knownMinor, orderId: order.id },
    });
    return this.present(saved);
  }

  rejectClientClose(): never {
    throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
  }

  private replace(userId: string, productId: string, map: (line: CartLine) => CartLine): CartLine[] | null {
    const lines = this.repository.listCart(userId);
    if (!lines.some((line) => line.productId === productId)) {
      return null;
    }
    const next = lines.map((line) => (line.productId === productId ? map(line) : line));
    this.repository.saveCart(userId, next);
    return next;
  }
}

function unitMinor(pricing: ProductPricing): number | null {
  if (pricing.status !== "PRICED" || pricing.amount === null) {
    return null;
  }
  if (!Number.isSafeInteger(pricing.amount.amountMinor) || pricing.amount.amountMinor < 0) {
    return null;
  }
  return pricing.amount.amountMinor;
}
