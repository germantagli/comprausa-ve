export type ProductRequestStatus =
  | "RECEIVED"
  | "IN_REVIEW"
  | "QUOTED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export type ProductQuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "SUPERSEDED";

export type ProductRequestRecord = {
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
  createdAt: string;
  updatedAt: string;
};

export type ProductQuoteRecord = {
  id: string;
  requestId: string;
  version: number;
  status: ProductQuoteStatus;
  currency: "USD";
  productUnitPriceMinor: number;
  productSubtotalMinor: number;
  domesticShippingMinor: number;
  internationalShippingMinor: number;
  serviceFeeMinor: number;
  taxesMinor: number;
  additionalCostsMinor: number;
  discountMinor: number;
  totalMinor: number;
  estimatedDeliveryDays: number | null;
  adminNotes: string | null;
  customerMessage: string | null;
  validUntil: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  orderId: string | null;
};

export type StatusHistoryRecord = {
  id: string;
  requestId: string;
  previousStatus: ProductRequestStatus | null;
  newStatus: ProductRequestStatus;
  changedById: string | null;
  comment: string | null;
  createdAt: string;
};

export type InboxNotificationRecord = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type CustomerSummary = {
  id: string;
  email: string | null;
  phoneE164: string | null;
  givenName: string | null;
  familyName: string | null;
};

export type QuoteBreakdownInput = {
  productUnitPriceMinor: number;
  quantity: number;
  domesticShippingMinor: number;
  internationalShippingMinor: number;
  serviceFeeMinor: number;
  taxesMinor: number;
  additionalCostsMinor: number;
  discountMinor: number;
};

export function computeQuoteTotals(input: QuoteBreakdownInput): {
  productSubtotalMinor: number;
  totalMinor: number;
} {
  const productSubtotalMinor = input.productUnitPriceMinor * input.quantity;
  const totalMinor =
    productSubtotalMinor +
    input.domesticShippingMinor +
    input.internationalShippingMinor +
    input.serviceFeeMinor +
    input.taxesMinor +
    input.additionalCostsMinor -
    input.discountMinor;
  return { productSubtotalMinor, totalMinor };
}

export function formatRequestNumber(sequence: number): string {
  return `TRS-${String(sequence).padStart(6, "0")}`;
}
