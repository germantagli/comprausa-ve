export const paymentMethods = ["STRIPE", "PAYPAL", "ZELLE", "PAGO_MOVIL"] as const;
export type PaymentMethodCode = (typeof paymentMethods)[number];

export type ReviewPaymentStatus = "PENDING" | "PROOF_SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";

export type ReviewOrderStatus = "AWAITING_PAYMENT" | "PAYMENT_UNDER_REVIEW" | "PAID";

export type StoredOrderStatus =
  | ReviewOrderStatus
  | "PROCUREMENT_PENDING"
  | "PURCHASED_FROM_STORE"
  | "RECEIVED_AT_US_WAREHOUSE"
  | "INTERNATIONAL_TRANSIT"
  | "CUSTOMS_PROCESSING"
  | "IN_VENEZUELA"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "EXCEPTION";

export type StoredProcurementStatus = "NOT_STARTED" | "PENDING" | "ORDERED_AT_STORE" | "FAILED" | "CANCELLED";

export interface StoredOrder {
  id: string;
  userId: string;
  quoteId: string;
  status: StoredOrderStatus;
  procurementStatus: StoredProcurementStatus;
  grandTotalMinor: number;
  purchasedFromStore: boolean;
  createdAt: string;
}

export interface StoredProof {
  storageKey: string;
  contentType: "image/jpeg" | "image/png" | "application/pdf";
  byteLength: number;
}

export interface StoredPayment {
  id: string;
  userId: string;
  orderId: string;
  quoteId: string;
  method: PaymentMethodCode;
  status: ReviewPaymentStatus;
  amountMinor: number;
  idempotencyKey: string;
  reference: string | null;
  payerBank: string | null;
  payerPhone: string | null;
  providerReference: string | null;
  rejectionReason: string | null;
  proof: StoredProof | null;
}

export interface AuditRecord {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface TrackingRecord {
  id: string;
  orderId: string;
  status: StoredOrderStatus;
  actorId: string;
  note: string;
  occurredAt: string;
  source: "MANUAL_ADMIN";
}

export interface InternalNotice {
  id: string;
  userId: string;
  orderId: string;
  channel: "INTERNAL";
  message: string;
  createdAt: string;
}

export function normalizeReference(value: string): string {
  return value.trim().toUpperCase();
}
