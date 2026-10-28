/** Borrador de checkout de maqueta (sin cobro). Solo sessionStorage del navegador. */

export const CHECKOUT_DRAFT_KEY = "comprausa.checkout.draft";
export const DEMO_ORDER_KEY = "comprausa.demo.order";

export interface CheckoutAddress {
  state: string;
  city: string;
  municipality: string;
  reference: string;
}

export type PaymentMethodId = "card" | "paypal" | "zelle" | "pago-movil";

export interface CheckoutDraft {
  address: CheckoutAddress;
  paymentMethodId: PaymentMethodId | null;
  note?: string;
}

export interface DemoOrder {
  id: string;
  createdAt: string;
  address: CheckoutAddress;
  paymentMethodId: PaymentMethodId;
  statusLabel: string;
}

const emptyAddress: CheckoutAddress = {
  state: "",
  city: "",
  municipality: "",
  reference: "",
};

export function emptyCheckoutDraft(): CheckoutDraft {
  return { address: { ...emptyAddress }, paymentMethodId: null };
}

export function readCheckoutDraft(): CheckoutDraft {
  if (typeof sessionStorage === "undefined") {
    return emptyCheckoutDraft();
  }
  const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
  if (!raw) {
    return emptyCheckoutDraft();
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CheckoutDraft>;
    return {
      address: {
        state: String(parsed.address?.state ?? ""),
        city: String(parsed.address?.city ?? ""),
        municipality: String(parsed.address?.municipality ?? ""),
        reference: String(parsed.address?.reference ?? ""),
      },
      paymentMethodId: isPaymentMethod(parsed.paymentMethodId) ? parsed.paymentMethodId : null,
      note: typeof parsed.note === "string" ? parsed.note : undefined,
    };
  } catch {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    return emptyCheckoutDraft();
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
}

export function clearCheckoutDraft(): void {
  sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
}

export function readDemoOrder(): DemoOrder | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(DEMO_ORDER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as DemoOrder;
  } catch {
    sessionStorage.removeItem(DEMO_ORDER_KEY);
    return null;
  }
}

export function saveDemoOrder(order: DemoOrder): void {
  sessionStorage.setItem(DEMO_ORDER_KEY, JSON.stringify(order));
}

function isPaymentMethod(value: unknown): value is PaymentMethodId {
  return value === "card" || value === "paypal" || value === "zelle" || value === "pago-movil";
}
