export const paymentMethods = ["STRIPE", "PAYPAL", "ZELLE", "PAGO_MOVIL"] as const;
export type PaymentMethodCode = (typeof paymentMethods)[number];

export type ReviewPaymentStatus = "PENDING" | "PROOF_SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";

export type ReviewOrderStatus = "AWAITING_PAYMENT" | "PAYMENT_UNDER_REVIEW" | "PAID";

export interface StoredOrder {
  id: string;
  userId: string;
  quoteId: string;
  status: ReviewOrderStatus;
  procurementStatus: "NOT_STARTED";
  grandTotalMinor: number;
  purchasedFromStore: false;
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

export function normalizeReference(value: string): string {
  return value.trim().toUpperCase();
}
