/** USD minor units (cents). Never a binary float. */
export interface Money {
  amountMinor: number;
  currency: "USD";
}

export const orderStatuses = [
  "DRAFT",
  "QUOTE_PENDING",
  "AWAITING_PAYMENT",
  "PAYMENT_UNDER_REVIEW",
  "PAID",
  "PROCUREMENT_PENDING",
  "PURCHASED_FROM_STORE",
  "RECEIVED_AT_US_WAREHOUSE",
  "INTERNATIONAL_TRANSIT",
  "CUSTOMS_PROCESSING",
  "IN_VENEZUELA",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUND_PENDING",
  "REFUNDED",
  "EXCEPTION",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const paymentStatuses = [
  "PENDING",
  "PROOF_SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export const procurementStatuses = [
  "NOT_STARTED",
  "PENDING",
  "ORDERED_AT_STORE",
  "FAILED",
  "CANCELLED",
] as const;

export type ProcurementStatus = (typeof procurementStatuses)[number];
