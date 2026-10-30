import type { AccountProfile, ProductRequestView } from "@comprausa/api-client";
import { formatUsdFromMinor } from "@comprausa/utils";

export const PRODUCT_REQUEST_DRAFT_KEY = "traelo.productRequest.draft.v1";

export const requestStatusLabel: Record<ProductRequestView["status"], string> = {
  RECEIVED: "Recibida",
  IN_REVIEW: "En revisión",
  QUOTED: "Cotizada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

export const requestStatusColor: Record<ProductRequestView["status"], string> = {
  RECEIVED: "#1B5FC7",
  IN_REVIEW: "#D97706",
  QUOTED: "#15803D",
  ACCEPTED: "#0F766E",
  REJECTED: "#B91C1C",
  CANCELLED: "#64748B",
};

/** Staff = any non-CUSTOMER role (aligned with API `isAdminRole`). */
export function isStaffProfile(profile: Pick<AccountProfile, "role"> | null | undefined): boolean {
  return Boolean(profile && profile.role !== "CUSTOMER");
}

export function formatUsdCents(minor: number): string {
  return formatUsdFromMinor(minor);
}

export function dollarsInputToMinor(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const [whole, fraction = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

export function minorToDollarsInput(minor: number): string {
  return (minor / 100).toFixed(2);
}

export function requestTitle(request: Pick<ProductRequestView, "productName" | "description" | "productUrl" | "requestNumber">): string {
  return request.productName?.trim() || request.description?.trim() || request.requestNumber;
}

export function isQuoteActionable(quote: NonNullable<ProductRequestView["quote"]> | null | undefined): boolean {
  if (!quote || quote.status !== "SENT") {
    return false;
  }
  if (!quote.validUntil) {
    return true;
  }
  return new Date(quote.validUntil).getTime() > Date.now();
}

export type ProductRequestDraft = {
  productUrl: string;
  productName: string;
  description: string;
  quantity: number;
  size: string;
  color: string;
  additionalNotes: string;
};

export function readProductRequestDraft(): ProductRequestDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(PRODUCT_REQUEST_DRAFT_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ProductRequestDraft;
  } catch {
    return null;
  }
}

export function writeProductRequestDraft(draft: ProductRequestDraft): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(PRODUCT_REQUEST_DRAFT_KEY, JSON.stringify(draft));
}

export function clearProductRequestDraft(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(PRODUCT_REQUEST_DRAFT_KEY);
}

export function formatRequestDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("es-VE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
