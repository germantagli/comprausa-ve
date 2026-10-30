import { Inject, Injectable, Optional } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { MemoryAuthRepository } from "../auth/memory-auth.repository";
import {
  computeQuoteTotals,
  formatRequestNumber,
  type CustomerSummary,
  type InboxNotificationRecord,
  type ProductQuoteRecord,
  type ProductRequestRecord,
  type ProductRequestStatus,
  type StatusHistoryRecord,
} from "./product-request.types";
import type {
  CreateProductRequestInput,
  ListProductRequestsQuery,
  ProductRequestRepository,
  SaveProductQuoteInput,
} from "./product-request.repository";

type UserSeed = CustomerSummary;

@Injectable()
export class MemoryProductRequestRepository implements ProductRequestRepository {
  private counter = 0;
  private readonly requests = new Map<string, ProductRequestRecord>();
  private readonly quotes = new Map<string, ProductQuoteRecord>();
  private readonly history: StatusHistoryRecord[] = [];
  private readonly notifications: InboxNotificationRecord[] = [];
  private readonly users = new Map<string, UserSeed>();
  private readonly orders = new Map<string, { id: string; userId: string; productQuoteId: string; grandTotalMinor: number; status: string }>();

  constructor(@Optional() @Inject(MemoryAuthRepository) private readonly auth: MemoryAuthRepository | null = null) {}

  seedUser(user: UserSeed): void {
    this.users.set(user.id, user);
  }

  async createRequest(userId: string, input: CreateProductRequestInput): Promise<ProductRequestRecord> {
    this.counter += 1;
    const now = new Date().toISOString();
    const record: ProductRequestRecord = {
      id: randomUUID(),
      requestNumber: formatRequestNumber(this.counter),
      userId,
      productUrl: input.productUrl,
      productName: input.productName ?? null,
      description: input.description ?? null,
      quantity: input.quantity,
      size: input.size ?? null,
      color: input.color ?? null,
      additionalNotes: input.additionalNotes ?? null,
      status: "RECEIVED",
      createdAt: now,
      updatedAt: now,
    };
    this.requests.set(record.id, record);
    await this.appendHistory(record.id, null, "RECEIVED", userId, "Solicitud creada");
    return record;
  }

  async getRequest(id: string): Promise<ProductRequestRecord | null> {
    return this.requests.get(id) ?? null;
  }

  async getRequestByNumber(requestNumber: string): Promise<ProductRequestRecord | null> {
    return [...this.requests.values()].find((item) => item.requestNumber === requestNumber) ?? null;
  }

  async listRequestsForUser(userId: string, query: ListProductRequestsQuery) {
    return this.paginate(
      [...this.requests.values()].filter((item) => item.userId === userId),
      query,
    );
  }

  async listRequestsForStaff(query: ListProductRequestsQuery) {
    return this.paginate([...this.requests.values()], query);
  }

  async updateRequestStatus(
    id: string,
    status: ProductRequestStatus,
    changedById: string | null,
    comment: string | null,
  ): Promise<ProductRequestRecord> {
    const current = this.requests.get(id);
    if (!current) {
      throw new Error("not_found");
    }
    const previous = current.status;
    const updated = { ...current, status, updatedAt: new Date().toISOString() };
    this.requests.set(id, updated);
    await this.appendHistory(id, previous, status, changedById, comment);
    return updated;
  }

  async listHistory(requestId: string): Promise<StatusHistoryRecord[]> {
    return this.history.filter((item) => item.requestId === requestId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listQuotes(requestId: string): Promise<ProductQuoteRecord[]> {
    return [...this.quotes.values()]
      .filter((item) => item.requestId === requestId)
      .sort((a, b) => a.version - b.version);
  }

  async getQuote(id: string): Promise<ProductQuoteRecord | null> {
    return this.quotes.get(id) ?? null;
  }

  async getCurrentSentQuote(requestId: string): Promise<ProductQuoteRecord | null> {
    const quotes = await this.listQuotes(requestId);
    return [...quotes].reverse().find((item) => item.status === "SENT" || item.status === "ACCEPTED") ?? null;
  }

  async saveQuote(input: SaveProductQuoteInput): Promise<ProductQuoteRecord> {
    const existing = await this.listQuotes(input.requestId);
    const draft = existing.find((item) => item.status === "DRAFT");
    const now = new Date().toISOString();
    const totals = computeQuoteTotals({
      productUnitPriceMinor: input.productUnitPriceMinor,
      quantity: input.quantity,
      domesticShippingMinor: input.domesticShippingMinor,
      internationalShippingMinor: input.internationalShippingMinor,
      serviceFeeMinor: input.serviceFeeMinor,
      taxesMinor: input.taxesMinor,
      additionalCostsMinor: input.additionalCostsMinor,
      discountMinor: input.discountMinor,
    });
    if (totals.totalMinor < 0) {
      throw new Error("negative_total");
    }
    if (draft) {
      const updated: ProductQuoteRecord = {
        ...draft,
        ...totals,
        productUnitPriceMinor: input.productUnitPriceMinor,
        domesticShippingMinor: input.domesticShippingMinor,
        internationalShippingMinor: input.internationalShippingMinor,
        serviceFeeMinor: input.serviceFeeMinor,
        taxesMinor: input.taxesMinor,
        additionalCostsMinor: input.additionalCostsMinor,
        discountMinor: input.discountMinor,
        estimatedDeliveryDays: input.estimatedDeliveryDays,
        adminNotes: input.adminNotes,
        customerMessage: input.customerMessage,
        validUntil: input.validUntil,
        updatedAt: now,
      };
      this.quotes.set(updated.id, updated);
      return updated;
    }
    for (const quote of existing.filter((item) => item.status === "SENT")) {
      this.quotes.set(quote.id, { ...quote, status: "SUPERSEDED", updatedAt: now });
    }
    const created: ProductQuoteRecord = {
      id: randomUUID(),
      requestId: input.requestId,
      version: existing.length + 1,
      status: "DRAFT",
      currency: "USD",
      productUnitPriceMinor: input.productUnitPriceMinor,
      productSubtotalMinor: totals.productSubtotalMinor,
      domesticShippingMinor: input.domesticShippingMinor,
      internationalShippingMinor: input.internationalShippingMinor,
      serviceFeeMinor: input.serviceFeeMinor,
      taxesMinor: input.taxesMinor,
      additionalCostsMinor: input.additionalCostsMinor,
      discountMinor: input.discountMinor,
      totalMinor: totals.totalMinor,
      estimatedDeliveryDays: input.estimatedDeliveryDays,
      adminNotes: input.adminNotes,
      customerMessage: input.customerMessage,
      validUntil: input.validUntil,
      createdById: input.createdById,
      createdAt: now,
      updatedAt: now,
      sentAt: null,
      acceptedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      orderId: null,
    };
    this.quotes.set(created.id, created);
    return created;
  }

  async sendQuote(quoteId: string): Promise<ProductQuoteRecord> {
    const quote = this.quotes.get(quoteId);
    if (!quote || quote.status !== "DRAFT") {
      throw new Error("invalid_quote");
    }
    if (quote.totalMinor <= 0 || quote.productUnitPriceMinor <= 0) {
      throw new Error("invalid_amount");
    }
    const now = new Date().toISOString();
    for (const other of [...this.quotes.values()].filter(
      (item) => item.requestId === quote.requestId && item.id !== quoteId && item.status === "SENT",
    )) {
      this.quotes.set(other.id, { ...other, status: "SUPERSEDED", updatedAt: now });
    }
    const sent = { ...quote, status: "SENT" as const, sentAt: now, updatedAt: now };
    this.quotes.set(quoteId, sent);
    await this.updateRequestStatus(quote.requestId, "QUOTED", quote.createdById, "Cotización enviada");
    return sent;
  }

  async acceptQuote(quoteId: string, userId: string): Promise<{ quote: ProductQuoteRecord; orderId: string }> {
    const quote = this.quotes.get(quoteId);
    if (!quote) {
      throw new Error("not_found");
    }
    const request = this.requests.get(quote.requestId);
    if (!request || request.userId !== userId) {
      throw new Error("forbidden");
    }
    if (quote.status === "ACCEPTED" && quote.orderId) {
      return { quote, orderId: quote.orderId };
    }
    if (quote.status !== "SENT") {
      throw new Error("invalid_status");
    }
    if (quote.validUntil && Date.parse(quote.validUntil) < Date.now()) {
      this.quotes.set(quoteId, { ...quote, status: "EXPIRED", updatedAt: new Date().toISOString() });
      throw new Error("expired");
    }
    const orderId = randomUUID();
    const now = new Date().toISOString();
    this.orders.set(orderId, {
      id: orderId,
      userId,
      productQuoteId: quoteId,
      grandTotalMinor: quote.totalMinor,
      status: "AWAITING_PAYMENT",
    });
    const accepted = { ...quote, status: "ACCEPTED" as const, acceptedAt: now, updatedAt: now, orderId };
    this.quotes.set(quoteId, accepted);
    await this.updateRequestStatus(request.id, "ACCEPTED", userId, "Cliente aceptó la cotización");
    return { quote: accepted, orderId };
  }

  async rejectQuote(quoteId: string, userId: string, reason: string | null): Promise<ProductQuoteRecord> {
    const quote = this.quotes.get(quoteId);
    if (!quote) {
      throw new Error("not_found");
    }
    const request = this.requests.get(quote.requestId);
    if (!request || request.userId !== userId) {
      throw new Error("forbidden");
    }
    if (quote.status === "REJECTED") {
      return quote;
    }
    if (quote.status !== "SENT") {
      throw new Error("invalid_status");
    }
    const now = new Date().toISOString();
    const rejected = {
      ...quote,
      status: "REJECTED" as const,
      rejectedAt: now,
      rejectionReason: reason,
      updatedAt: now,
    };
    this.quotes.set(quoteId, rejected);
    await this.updateRequestStatus(request.id, "REJECTED", userId, reason ?? "Cliente rechazó la cotización");
    return rejected;
  }

  async metrics() {
    const all = [...this.requests.values()];
    return {
      total: all.length,
      received: all.filter((item) => item.status === "RECEIVED").length,
      inReview: all.filter((item) => item.status === "IN_REVIEW").length,
      quoted: all.filter((item) => item.status === "QUOTED").length,
      accepted: all.filter((item) => item.status === "ACCEPTED").length,
      rejected: all.filter((item) => item.status === "REJECTED").length,
    };
  }

  async getCustomer(userId: string): Promise<CustomerSummary | null> {
    const seeded = this.users.get(userId);
    if (seeded && (seeded.email || seeded.givenName || seeded.phoneE164)) {
      return seeded;
    }
    const fromAuth = this.auth?.peekContact(userId);
    if (fromAuth) {
      return {
        id: fromAuth.id,
        email: fromAuth.email,
        phoneE164: fromAuth.phoneE164,
        givenName: fromAuth.givenName,
        familyName: fromAuth.familyName,
      };
    }
    return seeded ?? { id: userId, email: null, phoneE164: null, givenName: null, familyName: null };
  }

  async createNotification(
    userId: string,
    input: { type: string; title: string; message: string; relatedEntityType?: string; relatedEntityId?: string },
  ): Promise<InboxNotificationRecord> {
    const record: InboxNotificationRecord = {
      id: randomUUID(),
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    this.notifications.push(record);
    return record;
  }

  async listNotifications(userId: string): Promise<InboxNotificationRecord[]> {
    return this.notifications
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async unreadNotificationCount(userId: string): Promise<number> {
    return this.notifications.filter((item) => item.userId === userId && item.readAt === null).length;
  }

  async markNotificationRead(userId: string, id: string): Promise<InboxNotificationRecord | null> {
    const index = this.notifications.findIndex((item) => item.id === id && item.userId === userId);
    if (index < 0) {
      return null;
    }
    const current = this.notifications[index]!;
    const updated = { ...current, readAt: current.readAt ?? new Date().toISOString() };
    this.notifications[index] = updated;
    return updated;
  }

  async listStaffUserIds(): Promise<string[]> {
    const fromAuth = this.auth?.listStaffUserIds() ?? [];
    if (fromAuth.length > 0) {
      return fromAuth;
    }
    return [...this.users.values()]
      .filter((user) => user.email?.includes("admin") || user.email?.includes("finanzas"))
      .map((user) => user.id);
  }

  private async appendHistory(
    requestId: string,
    previousStatus: ProductRequestStatus | null,
    newStatus: ProductRequestStatus,
    changedById: string | null,
    comment: string | null,
  ): Promise<void> {
    this.history.push({
      id: randomUUID(),
      requestId,
      previousStatus,
      newStatus,
      changedById,
      comment,
      createdAt: new Date().toISOString(),
    });
  }

  private paginate(items: ProductRequestRecord[], query: ListProductRequestsQuery) {
    let filtered = items;
    if (query.status) {
      filtered = filtered.filter((item) => item.status === query.status);
    }
    if (query.q) {
      const needle = query.q.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.requestNumber.toLowerCase().includes(needle) ||
          (item.productName ?? "").toLowerCase().includes(needle) ||
          item.productUrl.toLowerCase().includes(needle),
      );
    }
    filtered = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = filtered.length;
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
