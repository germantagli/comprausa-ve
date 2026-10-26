import type { StoredOrder, StoredOrderStatus, StoredProcurementStatus } from "./payment-records";

/** One step at a time after PAID. DELIVERED is only the last step. */
export const fulfillmentPipeline = [
  "PAID",
  "PROCUREMENT_PENDING",
  "PURCHASED_FROM_STORE",
  "RECEIVED_AT_US_WAREHOUSE",
  "INTERNATIONAL_TRANSIT",
  "CUSTOMS_PROCESSING",
  "IN_VENEZUELA",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export const fulfillmentTargets = [
  "PROCUREMENT_PENDING",
  "PURCHASED_FROM_STORE",
  "RECEIVED_AT_US_WAREHOUSE",
  "INTERNATIONAL_TRANSIT",
  "CUSTOMS_PROCESSING",
  "IN_VENEZUELA",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "EXCEPTION",
] as const;

export type FulfillmentTarget = (typeof fulfillmentTargets)[number];

const purchasedStatuses = new Set<StoredOrderStatus>([
  "PURCHASED_FROM_STORE",
  "RECEIVED_AT_US_WAREHOUSE",
  "INTERNATIONAL_TRANSIT",
  "CUSTOMS_PROCESSING",
  "IN_VENEZUELA",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
]);

export function allowedFulfillmentTargets(status: StoredOrderStatus): FulfillmentTarget[] {
  if (status === "DELIVERED" || status === "CANCELLED") {
    return [];
  }
  if (status === "EXCEPTION") {
    return ["CANCELLED"];
  }
  const index = fulfillmentPipeline.indexOf(status as (typeof fulfillmentPipeline)[number]);
  if (index < 0) {
    return [];
  }
  const next = fulfillmentPipeline[index + 1];
  if (!next || next === "PAID") {
    return [];
  }
  return [next, "CANCELLED", "EXCEPTION"];
}

export function procurementFor(
  next: FulfillmentTarget,
  current: Pick<StoredOrder, "procurementStatus" | "purchasedFromStore">,
): { procurementStatus: StoredProcurementStatus; purchasedFromStore: boolean } {
  if (next === "PROCUREMENT_PENDING") {
    return { procurementStatus: "PENDING", purchasedFromStore: false };
  }
  if (purchasedStatuses.has(next)) {
    return { procurementStatus: "ORDERED_AT_STORE", purchasedFromStore: true };
  }
  if (next === "CANCELLED" && current.purchasedFromStore) {
    return { procurementStatus: "ORDERED_AT_STORE", purchasedFromStore: true };
  }
  if (next === "CANCELLED" && current.procurementStatus === "PENDING") {
    return { procurementStatus: "CANCELLED", purchasedFromStore: false };
  }
  return { procurementStatus: current.procurementStatus, purchasedFromStore: current.purchasedFromStore };
}

export function inFulfillmentQueue(status: StoredOrderStatus): boolean {
  return status === "PAID" || fulfillmentTargets.includes(status as FulfillmentTarget);
}
