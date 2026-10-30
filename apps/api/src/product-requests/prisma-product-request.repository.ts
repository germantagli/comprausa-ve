import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateProductRequestInput,
  ListProductRequestsQuery,
  ProductRequestRepository,
  SaveProductQuoteInput,
} from "./product-request.repository";
import {
  computeQuoteTotals,
  formatRequestNumber,
  type CustomerSummary,
  type InboxNotificationRecord,
  type ProductQuoteRecord,
  type ProductQuoteStatus,
  type ProductRequestRecord,
  type ProductRequestStatus,
  type StatusHistoryRecord,
} from "./product-request.types";

@Injectable()
export class PrismaProductRequestRepository implements ProductRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(userId: string, input: CreateProductRequestInput): Promise<ProductRequestRecord> {
    return this.prisma.$transaction(async (tx) => {
      await tx.productRequestCounter.upsert({
        where: { id: 1 },
        create: { id: 1, lastValue: 0 },
        update: {},
      });
      const counter = await tx.productRequestCounter.update({
        where: { id: 1 },
        data: { lastValue: { increment: 1 } },
      });
      const created = await tx.productRequest.create({
        data: {
          id: randomUUID(),
          requestNumber: formatRequestNumber(counter.lastValue),
          userId,
          productUrl: input.productUrl,
          productName: input.productName,
          description: input.description,
          quantity: input.quantity,
          size: input.size,
          color: input.color,
          additionalNotes: input.additionalNotes,
          status: "RECEIVED",
          statusHistory: {
            create: {
              id: randomUUID(),
              previousStatus: null,
              newStatus: "RECEIVED",
              changedById: userId,
              comment: "Solicitud creada",
            },
          },
        },
      });
      return mapRequest(created);
    });
  }

  async getRequest(id: string): Promise<ProductRequestRecord | null> {
    const row = await this.prisma.productRequest.findUnique({ where: { id } });
    return row ? mapRequest(row) : null;
  }

  async getRequestByNumber(requestNumber: string): Promise<ProductRequestRecord | null> {
    const row = await this.prisma.productRequest.findUnique({ where: { requestNumber } });
    return row ? mapRequest(row) : null;
  }

  async listRequestsForUser(userId: string, query: ListProductRequestsQuery) {
    return this.list({ ...query, userId });
  }

  async listRequestsForStaff(query: ListProductRequestsQuery) {
    return this.list(query);
  }

  async updateRequestStatus(
    id: string,
    status: ProductRequestStatus,
    changedById: string | null,
    comment: string | null,
  ): Promise<ProductRequestRecord> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.productRequest.findUnique({ where: { id } });
      if (!current) {
        throw new Error("not_found");
      }
      const updated = await tx.productRequest.update({
        where: { id },
        data: { status },
      });
      await tx.productRequestStatusHistory.create({
        data: {
          id: randomUUID(),
          requestId: id,
          previousStatus: current.status,
          newStatus: status,
          changedById,
          comment,
        },
      });
      return mapRequest(updated);
    });
  }

  async listHistory(requestId: string): Promise<StatusHistoryRecord[]> {
    const rows = await this.prisma.productRequestStatusHistory.findMany({
      where: { requestId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapHistory);
  }

  async listQuotes(requestId: string): Promise<ProductQuoteRecord[]> {
    const rows = await this.prisma.productQuote.findMany({
      where: { requestId },
      include: { order: true },
      orderBy: { version: "asc" },
    });
    return rows.map(mapQuote);
  }

  async getQuote(id: string): Promise<ProductQuoteRecord | null> {
    const row = await this.prisma.productQuote.findUnique({ where: { id }, include: { order: true } });
    return row ? mapQuote(row) : null;
  }

  async getCurrentSentQuote(requestId: string): Promise<ProductQuoteRecord | null> {
    const row = await this.prisma.productQuote.findFirst({
      where: { requestId, status: { in: ["SENT", "ACCEPTED"] } },
      include: { order: true },
      orderBy: { version: "desc" },
    });
    return row ? mapQuote(row) : null;
  }

  async saveQuote(input: SaveProductQuoteInput): Promise<ProductQuoteRecord> {
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
    return this.prisma.$transaction(async (tx) => {
      const draft = await tx.productQuote.findFirst({
        where: { requestId: input.requestId, status: "DRAFT" },
        include: { order: true },
      });
      const data = {
        productUnitPriceMinor: BigInt(input.productUnitPriceMinor),
        productSubtotalMinor: BigInt(totals.productSubtotalMinor),
        domesticShippingMinor: BigInt(input.domesticShippingMinor),
        internationalShippingMinor: BigInt(input.internationalShippingMinor),
        serviceFeeMinor: BigInt(input.serviceFeeMinor),
        taxesMinor: BigInt(input.taxesMinor),
        additionalCostsMinor: BigInt(input.additionalCostsMinor),
        discountMinor: BigInt(input.discountMinor),
        totalMinor: BigInt(totals.totalMinor),
        estimatedDeliveryDays: input.estimatedDeliveryDays,
        adminNotes: input.adminNotes,
        customerMessage: input.customerMessage,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
      };
      if (draft) {
        const updated = await tx.productQuote.update({
          where: { id: draft.id },
          data,
          include: { order: true },
        });
        return mapQuote(updated);
      }
      const count = await tx.productQuote.count({ where: { requestId: input.requestId } });
      const created = await tx.productQuote.create({
        data: {
          id: randomUUID(),
          requestId: input.requestId,
          version: count + 1,
          status: "DRAFT",
          currency: "USD",
          createdById: input.createdById,
          ...data,
        },
        include: { order: true },
      });
      return mapQuote(created);
    });
  }

  async sendQuote(quoteId: string): Promise<ProductQuoteRecord> {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.productQuote.findUnique({ where: { id: quoteId }, include: { order: true } });
      if (!quote || quote.status !== "DRAFT") {
        throw new Error("invalid_quote");
      }
      if (quote.totalMinor <= 0n || quote.productUnitPriceMinor <= 0n) {
        throw new Error("invalid_amount");
      }
      await tx.productQuote.updateMany({
        where: { requestId: quote.requestId, status: "SENT", id: { not: quoteId } },
        data: { status: "SUPERSEDED" },
      });
      const sent = await tx.productQuote.update({
        where: { id: quoteId },
        data: { status: "SENT", sentAt: new Date() },
        include: { order: true },
      });
      const request = await tx.productRequest.findUnique({ where: { id: quote.requestId } });
      if (request && request.status !== "QUOTED") {
        await tx.productRequest.update({ where: { id: request.id }, data: { status: "QUOTED" } });
        await tx.productRequestStatusHistory.create({
          data: {
            id: randomUUID(),
            requestId: request.id,
            previousStatus: request.status,
            newStatus: "QUOTED",
            changedById: quote.createdById,
            comment: "Cotización enviada",
          },
        });
      }
      return mapQuote(sent);
    });
  }

  async acceptQuote(quoteId: string, userId: string): Promise<{ quote: ProductQuoteRecord; orderId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.productQuote.findUnique({ where: { id: quoteId }, include: { order: true, request: true } });
      if (!quote) {
        throw new Error("not_found");
      }
      if (quote.request.userId !== userId) {
        throw new Error("forbidden");
      }
      if (quote.status === "ACCEPTED" && quote.order) {
        return { quote: mapQuote(quote), orderId: quote.order.id };
      }
      if (quote.status !== "SENT") {
        throw new Error("invalid_status");
      }
      if (quote.validUntil && quote.validUntil.getTime() < Date.now()) {
        await tx.productQuote.update({ where: { id: quoteId }, data: { status: "EXPIRED" } });
        throw new Error("expired");
      }
      const orderId = randomUUID();
      await tx.order.create({
        data: {
          id: orderId,
          userId,
          productQuoteId: quoteId,
          status: "AWAITING_PAYMENT",
          procurementStatus: "NOT_STARTED",
          currency: "USD",
          itemsTotalMinor: quote.productSubtotalMinor,
          shippingTotalMinor: quote.domesticShippingMinor + quote.internationalShippingMinor,
          feesTotalMinor: quote.serviceFeeMinor + quote.taxesMinor + quote.additionalCostsMinor - quote.discountMinor,
          grandTotalMinor: quote.totalMinor,
          items: {
            create: [
              {
                id: randomUUID(),
                description: quote.request.productName ?? quote.request.productUrl,
                sourceUrl: quote.request.productUrl,
                quantity: quote.request.quantity,
                unitAmountMinor: quote.productUnitPriceMinor,
                lineAmountMinor: quote.productSubtotalMinor,
              },
            ],
          },
        },
      });
      const accepted = await tx.productQuote.update({
        where: { id: quoteId },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
        include: { order: true },
      });
      await tx.productRequest.update({ where: { id: quote.requestId }, data: { status: "ACCEPTED" } });
      await tx.productRequestStatusHistory.create({
        data: {
          id: randomUUID(),
          requestId: quote.requestId,
          previousStatus: quote.request.status,
          newStatus: "ACCEPTED",
          changedById: userId,
          comment: "Cliente aceptó la cotización",
        },
      });
      return { quote: mapQuote(accepted), orderId };
    });
  }

  async rejectQuote(quoteId: string, userId: string, reason: string | null): Promise<ProductQuoteRecord> {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.productQuote.findUnique({ where: { id: quoteId }, include: { order: true, request: true } });
      if (!quote) {
        throw new Error("not_found");
      }
      if (quote.request.userId !== userId) {
        throw new Error("forbidden");
      }
      if (quote.status === "REJECTED") {
        return mapQuote(quote);
      }
      if (quote.status !== "SENT") {
        throw new Error("invalid_status");
      }
      const rejected = await tx.productQuote.update({
        where: { id: quoteId },
        data: { status: "REJECTED", rejectedAt: new Date(), rejectionReason: reason },
        include: { order: true },
      });
      await tx.productRequest.update({ where: { id: quote.requestId }, data: { status: "REJECTED" } });
      await tx.productRequestStatusHistory.create({
        data: {
          id: randomUUID(),
          requestId: quote.requestId,
          previousStatus: quote.request.status,
          newStatus: "REJECTED",
          changedById: userId,
          comment: reason ?? "Cliente rechazó la cotización",
        },
      });
      return mapQuote(rejected);
    });
  }

  async metrics() {
    const [total, received, inReview, quoted, accepted, rejected] = await Promise.all([
      this.prisma.productRequest.count(),
      this.prisma.productRequest.count({ where: { status: "RECEIVED" } }),
      this.prisma.productRequest.count({ where: { status: "IN_REVIEW" } }),
      this.prisma.productRequest.count({ where: { status: "QUOTED" } }),
      this.prisma.productRequest.count({ where: { status: "ACCEPTED" } }),
      this.prisma.productRequest.count({ where: { status: "REJECTED" } }),
    ]);
    return { total, received, inReview, quoted, accepted, rejected };
  }

  async getCustomer(userId: string): Promise<CustomerSummary | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      phoneE164: user.phoneE164,
      givenName: user.profile?.givenName ?? null,
      familyName: user.profile?.familyName ?? null,
    };
  }

  async createNotification(
    userId: string,
    input: { type: string; title: string; message: string; relatedEntityType?: string; relatedEntityId?: string },
  ): Promise<InboxNotificationRecord> {
    const row = await this.prisma.inboxNotification.create({
      data: {
        id: randomUUID(),
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      },
    });
    return mapNotification(row);
  }

  async listNotifications(userId: string): Promise<InboxNotificationRecord[]> {
    const rows = await this.prisma.inboxNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map(mapNotification);
  }

  async unreadNotificationCount(userId: string): Promise<number> {
    return this.prisma.inboxNotification.count({ where: { userId, readAt: null } });
  }

  async markNotificationRead(userId: string, id: string): Promise<InboxNotificationRecord | null> {
    const existing = await this.prisma.inboxNotification.findFirst({ where: { id, userId } });
    if (!existing) {
      return null;
    }
    const row = await this.prisma.inboxNotification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });
    return mapNotification(row);
  }

  async listStaffUserIds(): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { role: { code: { not: "CUSTOMER" } } },
      select: { userId: true },
    });
    return [...new Set(roles.map((item) => item.userId))];
  }

  private async list(query: ListProductRequestsQuery & { userId?: string }) {
    const where: Prisma.ProductRequestWhereInput = {};
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.q) {
      where.OR = [
        { requestNumber: { contains: query.q, mode: "insensitive" } },
        { productName: { contains: query.q, mode: "insensitive" } },
        { productUrl: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.productRequest.count({ where }),
      this.prisma.productRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map(mapRequest),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}

function mapRequest(row: {
  id: string;
  requestNumber: string;
  userId: string;
  productUrl: string;
  productName: string | null;
  description: string | null;
  quantity: number;
  size: string | null;
  color: string | null;
  additionalNotes: string | null;
  status: ProductRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}): ProductRequestRecord {
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    userId: row.userId,
    productUrl: row.productUrl,
    productName: row.productName,
    description: row.description,
    quantity: row.quantity,
    size: row.size,
    color: row.color,
    additionalNotes: row.additionalNotes,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapQuote(row: {
  id: string;
  requestId: string;
  version: number;
  status: ProductQuoteStatus;
  currency: string;
  productUnitPriceMinor: bigint;
  productSubtotalMinor: bigint;
  domesticShippingMinor: bigint;
  internationalShippingMinor: bigint;
  serviceFeeMinor: bigint;
  taxesMinor: bigint;
  additionalCostsMinor: bigint;
  discountMinor: bigint;
  totalMinor: bigint;
  estimatedDeliveryDays: number | null;
  adminNotes: string | null;
  customerMessage: string | null;
  validUntil: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  order?: { id: string } | null;
}): ProductQuoteRecord {
  return {
    id: row.id,
    requestId: row.requestId,
    version: row.version,
    status: row.status,
    currency: "USD",
    productUnitPriceMinor: Number(row.productUnitPriceMinor),
    productSubtotalMinor: Number(row.productSubtotalMinor),
    domesticShippingMinor: Number(row.domesticShippingMinor),
    internationalShippingMinor: Number(row.internationalShippingMinor),
    serviceFeeMinor: Number(row.serviceFeeMinor),
    taxesMinor: Number(row.taxesMinor),
    additionalCostsMinor: Number(row.additionalCostsMinor),
    discountMinor: Number(row.discountMinor),
    totalMinor: Number(row.totalMinor),
    estimatedDeliveryDays: row.estimatedDeliveryDays,
    adminNotes: row.adminNotes,
    customerMessage: row.customerMessage,
    validUntil: row.validUntil?.toISOString() ?? null,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    orderId: row.order?.id ?? null,
  };
}

function mapHistory(row: {
  id: string;
  requestId: string;
  previousStatus: ProductRequestStatus | null;
  newStatus: ProductRequestStatus;
  changedById: string | null;
  comment: string | null;
  createdAt: Date;
}): StatusHistoryRecord {
  return {
    id: row.id,
    requestId: row.requestId,
    previousStatus: row.previousStatus,
    newStatus: row.newStatus,
    changedById: row.changedById,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapNotification(row: {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): InboxNotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedEntityType: row.relatedEntityType,
    relatedEntityId: row.relatedEntityId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
