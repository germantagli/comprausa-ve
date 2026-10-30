import type {
  CustomerSummary,
  InboxNotificationRecord,
  ProductQuoteRecord,
  ProductRequestRecord,
  ProductRequestStatus,
  StatusHistoryRecord,
} from "./product-request.types";

export const PRODUCT_REQUEST_REPOSITORY = Symbol("PRODUCT_REQUEST_REPOSITORY");

export type CreateProductRequestInput = {
  productUrl: string;
  productName?: string;
  description?: string;
  quantity: number;
  size?: string;
  color?: string;
  additionalNotes?: string;
};

export type ListProductRequestsQuery = {
  status?: ProductRequestStatus;
  q?: string;
  page: number;
  pageSize: number;
};

export type SaveProductQuoteInput = {
  requestId: string;
  createdById: string;
  quantity: number;
  productUnitPriceMinor: number;
  domesticShippingMinor: number;
  internationalShippingMinor: number;
  serviceFeeMinor: number;
  taxesMinor: number;
  additionalCostsMinor: number;
  discountMinor: number;
  estimatedDeliveryDays: number | null;
  validUntil: string | null;
  adminNotes: string | null;
  customerMessage: string | null;
};

export interface ProductRequestRepository {
  createRequest(userId: string, input: CreateProductRequestInput): Promise<ProductRequestRecord>;
  getRequest(id: string): Promise<ProductRequestRecord | null>;
  getRequestByNumber(requestNumber: string): Promise<ProductRequestRecord | null>;
  listRequestsForUser(
    userId: string,
    query: ListProductRequestsQuery,
  ): Promise<{ items: ProductRequestRecord[]; total: number; page: number; pageSize: number }>;
  listRequestsForStaff(
    query: ListProductRequestsQuery,
  ): Promise<{ items: ProductRequestRecord[]; total: number; page: number; pageSize: number }>;
  updateRequestStatus(
    id: string,
    status: ProductRequestStatus,
    changedById: string | null,
    comment: string | null,
  ): Promise<ProductRequestRecord>;
  listHistory(requestId: string): Promise<StatusHistoryRecord[]>;
  listQuotes(requestId: string): Promise<ProductQuoteRecord[]>;
  getQuote(id: string): Promise<ProductQuoteRecord | null>;
  getCurrentSentQuote(requestId: string): Promise<ProductQuoteRecord | null>;
  saveQuote(input: SaveProductQuoteInput): Promise<ProductQuoteRecord>;
  sendQuote(quoteId: string): Promise<ProductQuoteRecord>;
  acceptQuote(quoteId: string, userId: string): Promise<{ quote: ProductQuoteRecord; orderId: string }>;
  rejectQuote(quoteId: string, userId: string, reason: string | null): Promise<ProductQuoteRecord>;
  metrics(): Promise<{
    total: number;
    received: number;
    inReview: number;
    quoted: number;
    accepted: number;
    rejected: number;
  }>;
  getCustomer(userId: string): Promise<CustomerSummary | null>;
  createNotification(
    userId: string,
    input: { type: string; title: string; message: string; relatedEntityType?: string; relatedEntityId?: string },
  ): Promise<InboxNotificationRecord>;
  listNotifications(userId: string): Promise<InboxNotificationRecord[]>;
  unreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(userId: string, id: string): Promise<InboxNotificationRecord | null>;
  listStaffUserIds(): Promise<string[]>;
}
