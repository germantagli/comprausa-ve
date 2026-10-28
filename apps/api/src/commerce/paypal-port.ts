export interface PayPalCheckoutPort {
  createOrder(input: { amountMinor: number; currency: "USD" }): Promise<{ captured: false }>;
}

/** No Orders v2 call and no capture. */
export class NoCapturePayPalPort implements PayPalCheckoutPort {
  async createOrder(): Promise<{ captured: false }> {
    return { captured: false };
  }
}

export const PAYPAL_PORT = Symbol("PAYPAL_PORT");
