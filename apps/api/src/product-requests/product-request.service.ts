import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { ProductQuoteWriteInput, ProductRequestCreateInput } from "@comprausa/validation";
import type { RequestAccess } from "../auth/access.guard";
import { isAdminRole } from "../auth/roles";
import {
  PRODUCT_REQUEST_REPOSITORY,
  type ListProductRequestsQuery,
  type ProductRequestRepository,
} from "./product-request.repository";
import type { ProductQuoteRecord, ProductRequestRecord } from "./product-request.types";

@Injectable()
export class ProductRequestService {
  constructor(@Inject(PRODUCT_REQUEST_REPOSITORY) private readonly repository: ProductRequestRepository) {}

  async create(userId: string, input: ProductRequestCreateInput) {
    const request = await this.repository.createRequest(userId, input);
    const staffIds = await this.repository.listStaffUserIds();
    await Promise.all(
      staffIds.map((staffId) =>
        this.repository.createNotification(staffId, {
          type: "PRODUCT_REQUEST_RECEIVED",
          title: "Nueva solicitud",
          message: `${request.requestNumber} espera revisión.`,
          relatedEntityType: "ProductRequest",
          relatedEntityId: request.id,
        }),
      ),
    );
    return this.presentRequest(request);
  }

  async listMine(userId: string, query: ListProductRequestsQuery) {
    const page = await this.repository.listRequestsForUser(userId, query);
    const items = await Promise.all(page.items.map(async (item) => this.presentRequest(item, true)));
    return { ...page, items };
  }

  async getMine(userId: string, id: string) {
    const request = await this.requireOwned(userId, id);
    return this.presentDetail(request, false);
  }

  async accept(userId: string, requestId: string) {
    const request = await this.requireOwned(userId, requestId);
    const quote = await this.repository.getCurrentSentQuote(request.id);
    if (!quote || (quote.status !== "SENT" && quote.status !== "ACCEPTED")) {
      throw new HttpException({ error: "invalid_status" }, HttpStatus.CONFLICT);
    }
    try {
      const alreadyAccepted = quote.status === "ACCEPTED" && quote.orderId;
      const result = await this.repository.acceptQuote(quote.id, userId);
      if (!alreadyAccepted) {
        await this.notifyStaff(request, "PRODUCT_REQUEST_ACCEPTED", "Cotización aceptada", `${request.requestNumber} fue aceptada.`);
      }
      return {
        ...result.quote,
        orderId: result.orderId,
        request: await this.presentRequest((await this.repository.getRequest(request.id)) ?? request),
      };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  async reject(userId: string, requestId: string, reason: string | undefined) {
    const request = await this.requireOwned(userId, requestId);
    const quote = await this.repository.getCurrentSentQuote(request.id);
    if (!quote || quote.status !== "SENT") {
      throw new HttpException({ error: "invalid_status" }, HttpStatus.CONFLICT);
    }
    try {
      const rejected = await this.repository.rejectQuote(quote.id, userId, reason ?? null);
      await this.notifyStaff(request, "PRODUCT_REQUEST_REJECTED", "Cotización rechazada", `${request.requestNumber} fue rechazada.`);
      return rejected;
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  async adminMetrics() {
    return this.repository.metrics();
  }

  async adminList(query: ListProductRequestsQuery) {
    const page = await this.repository.listRequestsForStaff(query);
    const items = await Promise.all(
      page.items.map(async (item) => {
        const customer = await this.repository.getCustomer(item.userId);
        return { ...await this.presentRequest(item, true), customer };
      }),
    );
    return { ...page, items };
  }

  async adminGet(id: string) {
    const request = await this.repository.getRequest(id);
    if (!request) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    return this.presentDetail(request, true);
  }

  async adminUpdateStatus(access: RequestAccess, id: string, status: "IN_REVIEW" | "CANCELLED", comment?: string) {
    this.assertStaff(access);
    const request = await this.repository.getRequest(id);
    if (!request) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (status === "IN_REVIEW" && request.status !== "RECEIVED" && request.status !== "IN_REVIEW") {
      throw new HttpException({ error: "invalid_status" }, HttpStatus.CONFLICT);
    }
    const updated = await this.repository.updateRequestStatus(id, status, access.userId, comment ?? null);
    if (status === "IN_REVIEW") {
      await this.repository.createNotification(request.userId, {
        type: "PRODUCT_REQUEST_IN_REVIEW",
        title: "Solicitud en revisión",
        message: `Estamos revisando ${request.requestNumber}.`,
        relatedEntityType: "ProductRequest",
        relatedEntityId: request.id,
      });
    }
    return this.presentRequest(updated);
  }

  async adminSaveQuote(access: RequestAccess, requestId: string, input: ProductQuoteWriteInput) {
    this.assertStaff(access);
    const request = await this.repository.getRequest(requestId);
    if (!request) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (request.status === "ACCEPTED" || request.status === "CANCELLED") {
      throw new HttpException({ error: "immutable" }, HttpStatus.CONFLICT);
    }
    try {
      let quote = await this.repository.saveQuote({
        requestId,
        createdById: access.userId,
        quantity: request.quantity,
        productUnitPriceMinor: input.productUnitPriceMinor,
        domesticShippingMinor: input.domesticShippingMinor,
        internationalShippingMinor: input.internationalShippingMinor,
        serviceFeeMinor: input.serviceFeeMinor,
        taxesMinor: input.taxesMinor,
        additionalCostsMinor: input.additionalCostsMinor,
        discountMinor: input.discountMinor,
        estimatedDeliveryDays: input.estimatedDeliveryDays ?? null,
        validUntil: input.validUntil ?? null,
        adminNotes: input.adminNotes ?? null,
        customerMessage: input.customerMessage ?? null,
      });
      if (input.send) {
        quote = await this.repository.sendQuote(quote.id);
        await this.repository.createNotification(request.userId, {
          type: "PRODUCT_QUOTE_SENT",
          title: "Cotización lista",
          message: `Tu cotización para ${request.requestNumber} ya está disponible.`,
          relatedEntityType: "ProductRequest",
          relatedEntityId: request.id,
        });
      } else if (request.status === "RECEIVED") {
        await this.repository.updateRequestStatus(request.id, "IN_REVIEW", access.userId, "Preparando cotización");
      }
      return quote;
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  async notifications(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.repository.listNotifications(userId),
      this.repository.unreadNotificationCount(userId),
    ]);
    return { items, unreadCount };
  }

  async markRead(userId: string, id: string) {
    const item = await this.repository.markNotificationRead(userId, id);
    if (!item) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    return item;
  }

  private assertStaff(access: RequestAccess): void {
    if (!isAdminRole(access.role)) {
      throw new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
  }

  private async requireOwned(userId: string, id: string): Promise<ProductRequestRecord> {
    const request = await this.repository.getRequest(id);
    if (!request || request.userId !== userId) {
      throw new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    return request;
  }

  private async presentRequest(request: ProductRequestRecord, withQuote = false) {
    const quote = withQuote ? await this.repository.getCurrentSentQuote(request.id) : null;
    return {
      ...request,
      quote: quote ? this.publicQuote(quote) : null,
    };
  }

  private async presentDetail(request: ProductRequestRecord, includeAdminFields: boolean) {
    const [history, quotes, customer] = await Promise.all([
      this.repository.listHistory(request.id),
      this.repository.listQuotes(request.id),
      includeAdminFields ? this.repository.getCustomer(request.userId) : Promise.resolve(null),
    ]);
    const current = [...quotes].reverse().find((item) => item.status === "SENT" || item.status === "ACCEPTED" || item.status === "DRAFT") ?? null;
    return {
      ...request,
      customer: includeAdminFields ? customer : undefined,
      history,
      quotes: includeAdminFields ? quotes : quotes.filter((item) => item.status !== "DRAFT").map((item) => this.publicQuote(item)),
      quote: current && (includeAdminFields || current.status !== "DRAFT") ? (includeAdminFields ? current : this.publicQuote(current)) : null,
    };
  }

  private publicQuote(quote: ProductQuoteRecord) {
    const { adminNotes: _adminNotes, ...rest } = quote;
    return rest;
  }

  private async notifyStaff(request: ProductRequestRecord, type: string, title: string, message: string) {
    const staffIds = await this.repository.listStaffUserIds();
    await Promise.all(
      staffIds.map((staffId) =>
        this.repository.createNotification(staffId, {
          type,
          title,
          message,
          relatedEntityType: "ProductRequest",
          relatedEntityId: request.id,
        }),
      ),
    );
  }

  private mapDomainError(error: unknown): HttpException {
    const code = error instanceof Error ? error.message : "invalid_request";
    if (code === "not_found") {
      return new HttpException({ error: "not_found" }, HttpStatus.NOT_FOUND);
    }
    if (code === "forbidden") {
      return new HttpException({ error: "forbidden" }, HttpStatus.FORBIDDEN);
    }
    if (code === "expired") {
      return new HttpException({ error: "expired" }, HttpStatus.CONFLICT);
    }
    if (code === "negative_total" || code === "invalid_amount" || code === "invalid_quote" || code === "invalid_status") {
      return new HttpException({ error: code }, HttpStatus.BAD_REQUEST);
    }
    return new HttpException({ error: "invalid_request" }, HttpStatus.BAD_REQUEST);
  }
}
