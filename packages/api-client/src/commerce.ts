import { z } from "zod";
import { ApiClientError } from "./auth";

const minor = z.number().int().nonnegative();

const cartItemSchema = z
  .object({
    productId: z.string(),
    name: z.string(),
    quantity: z.number().int().positive(),
    unitAmountMinor: minor.nullable(),
    storeName: z.string().nullable(),
    savedForLater: z.boolean(),
    fictional: z.literal(true),
  })
  .strict();

const subtotalSchema = z
  .object({
    knownMinor: minor.nullable(),
    includesUnknown: z.boolean(),
  })
  .strict();

const cartSchema = z
  .object({
    groups: z.array(
      z
        .object({
          storeName: z.string(),
          items: z.array(cartItemSchema),
        })
        .strict(),
    ),
    saved: z.array(cartItemSchema),
    subtotal: subtotalSchema,
  })
  .strict();

const orderStatusSchema = z.enum([
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
  "EXCEPTION",
]);

const orderSummarySchema = z
  .object({
    id: z.string(),
    status: orderStatusSchema,
    procurementStatus: z.enum(["NOT_STARTED", "PENDING", "ORDERED_AT_STORE", "FAILED", "CANCELLED"]),
    purchasedFromStore: z.boolean(),
    grandTotalMinor: z.number().int().positive(),
  })
  .strict();

const quoteLineSchema = z
  .object({
    description: z.string(),
    sourceUrl: z.string().nullable(),
    quantity: z.number().int().positive(),
    unitAmountMinor: minor.nullable(),
    storeName: z.string().nullable(),
    productId: z.string().nullable(),
    savedForLater: z.boolean(),
  })
  .strict();

const quoteSchema = z
  .object({
    id: z.string(),
    status: z.enum(["PENDING_VALIDATION", "FINAL", "ACCEPTED"]),
    address: z
      .object({
        state: z.string(),
        city: z.string(),
        municipality: z.string(),
        reference: z.string(),
      })
      .strict(),
    lines: z.array(quoteLineSchema),
    snapshot: z
      .object({
        status: z.literal("FINAL"),
        knownMinor: minor,
        lines: z.array(quoteLineSchema),
      })
      .strict()
      .nullable(),
    subtotal: subtotalSchema,
    orderId: z.string().nullable(),
    order: orderSummarySchema.nullable(),
    payment: z
      .object({
        id: z.string(),
        method: z.enum(["STRIPE", "PAYPAL", "ZELLE", "PAGO_MOVIL"]),
        status: z.enum(["PENDING", "PROOF_SUBMITTED", "UNDER_REVIEW", "VERIFIED", "REJECTED"]),
        amountMinor: z.number().int().positive(),
        rejectionReason: z.string().nullable(),
        reference: z.string().nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export type CartView = z.infer<typeof cartSchema>;
export type QuoteView = z.infer<typeof quoteSchema>;

export interface VenezuelaAddressInput {
  state: string;
  city: string;
  municipality: string;
  reference: string;
}

async function send(baseUrl: string, path: string, token: string, method: "GET" | "POST", body: unknown, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(new URL(path, baseUrl), {
      method,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(0, { error: "network" });
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiClientError(response.status, payload);
  }
  return payload;
}

export async function getCart(baseUrl: string, accessToken: string, fetchImpl: typeof fetch = fetch): Promise<CartView> {
  return cartSchema.parse(await send(baseUrl, "/v1/cart", accessToken, "GET", undefined, fetchImpl));
}

export async function addCartItem(
  baseUrl: string,
  accessToken: string,
  productId: string,
  quantity = 1,
  fetchImpl: typeof fetch = fetch,
): Promise<CartView> {
  return cartSchema.parse(await send(baseUrl, "/v1/cart/items", accessToken, "POST", { productId, quantity }, fetchImpl));
}

export async function setCartQuantity(
  baseUrl: string,
  accessToken: string,
  productId: string,
  quantity: number,
  fetchImpl: typeof fetch = fetch,
): Promise<CartView> {
  return cartSchema.parse(
    await send(baseUrl, `/v1/cart/items/${encodeURIComponent(productId)}/quantity`, accessToken, "POST", { quantity }, fetchImpl),
  );
}

export async function removeCartItem(
  baseUrl: string,
  accessToken: string,
  productId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CartView> {
  return cartSchema.parse(
    await send(baseUrl, `/v1/cart/items/${encodeURIComponent(productId)}/remove`, accessToken, "POST", {}, fetchImpl),
  );
}

export async function saveCartItem(
  baseUrl: string,
  accessToken: string,
  productId: string,
  savedForLater: boolean,
  fetchImpl: typeof fetch = fetch,
): Promise<CartView> {
  return cartSchema.parse(
    await send(baseUrl, `/v1/cart/items/${encodeURIComponent(productId)}/save`, accessToken, "POST", { savedForLater }, fetchImpl),
  );
}

export async function createQuote(
  baseUrl: string,
  accessToken: string,
  input: { address: VenezuelaAddressInput; pastedUrl?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<QuoteView> {
  return quoteSchema.parse(await send(baseUrl, "/v1/quotes", accessToken, "POST", input, fetchImpl));
}

export async function getQuote(baseUrl: string, accessToken: string, quoteId: string, fetchImpl: typeof fetch = fetch): Promise<QuoteView> {
  return quoteSchema.parse(await send(baseUrl, `/v1/quotes/${encodeURIComponent(quoteId)}`, accessToken, "GET", undefined, fetchImpl));
}

const methodsSchema = z
  .object({
    stripe: z.object({ configured: z.boolean(), detail: z.string() }).strict(),
    paypal: z.object({ configured: z.boolean(), capture: z.literal(false), detail: z.string() }).strict(),
    zelle: z.object({ configured: z.boolean(), detail: z.string(), instructions: z.string().nullable() }).strict(),
    pagoMovil: z
      .object({
        configured: z.boolean(),
        detail: z.string(),
        instructions: z.object({ bank: z.string(), phone: z.string(), holder: z.string() }).strict().nullable(),
      })
      .strict(),
  })
  .strict();

const paymentViewSchema = z
  .object({
    id: z.string(),
    quoteId: z.string(),
    method: z.enum(["STRIPE", "PAYPAL", "ZELLE", "PAGO_MOVIL"]),
    status: z.enum(["PENDING", "PROOF_SUBMITTED", "UNDER_REVIEW", "VERIFIED", "REJECTED"]),
    amountMinor: z.number().int().positive(),
    reference: z.string().nullable(),
    payerBank: z.string().nullable(),
    payerPhone: z.string().nullable(),
    rejectionReason: z.string().nullable(),
    proof: z.object({ contentType: z.string(), byteLength: z.number().int().nonnegative() }).strict().nullable(),
    order: orderSummarySchema.nullable(),
  })
  .strict();

const operatorQueueSchema = z.object({ items: z.array(paymentViewSchema) }).strict();

export type PaymentMethods = z.infer<typeof methodsSchema>;
export type PaymentView = z.infer<typeof paymentViewSchema>;

export async function acceptQuote(baseUrl: string, accessToken: string, quoteId: string, fetchImpl: typeof fetch = fetch): Promise<QuoteView> {
  return quoteSchema.parse(await send(baseUrl, `/v1/quotes/${encodeURIComponent(quoteId)}/accept`, accessToken, "POST", {}, fetchImpl));
}

export async function getPaymentMethods(baseUrl: string, accessToken: string, fetchImpl: typeof fetch = fetch): Promise<PaymentMethods> {
  return methodsSchema.parse(await send(baseUrl, "/v1/payments/methods", accessToken, "GET", undefined, fetchImpl));
}

export async function createPayment(
  baseUrl: string,
  accessToken: string,
  quoteId: string,
  body: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<{ payment: PaymentView; clientSecret?: string | null; idempotent?: boolean; capture?: false; detail?: string }> {
  const payload = await send(baseUrl, `/v1/quotes/${encodeURIComponent(quoteId)}/payments`, accessToken, "POST", body, fetchImpl);
  return z
    .object({
      payment: paymentViewSchema,
      clientSecret: z.string().nullable().optional(),
      idempotent: z.boolean().optional(),
      capture: z.literal(false).optional(),
      detail: z.string().optional(),
    })
    .strict()
    .parse(payload);
}

export async function submitProof(
  baseUrl: string,
  accessToken: string,
  paymentId: string,
  proof: { contentType: "image/jpeg" | "image/png" | "application/pdf"; dataBase64: string },
  fetchImpl: typeof fetch = fetch,
): Promise<PaymentView> {
  return paymentViewSchema.parse(
    await send(baseUrl, `/v1/payments/${encodeURIComponent(paymentId)}/proof`, accessToken, "POST", proof, fetchImpl),
  );
}

export async function publishQuoteAmount(
  baseUrl: string,
  accessToken: string,
  quoteId: string,
  amountMinor: number,
  fetchImpl: typeof fetch = fetch,
): Promise<QuoteView> {
  return quoteSchema.parse(
    await send(baseUrl, `/v1/operator/quotes/${encodeURIComponent(quoteId)}/publish`, accessToken, "POST", { amountMinor }, fetchImpl),
  );
}

export async function listProofQueue(baseUrl: string, accessToken: string, fetchImpl: typeof fetch = fetch) {
  return operatorQueueSchema.parse(await send(baseUrl, "/v1/operator/payments", accessToken, "GET", undefined, fetchImpl));
}

export async function verifyPayment(baseUrl: string, accessToken: string, paymentId: string, fetchImpl: typeof fetch = fetch) {
  return z
    .object({ payment: paymentViewSchema, order: paymentViewSchema.shape.order.unwrap() })
    .strict()
    .parse(await send(baseUrl, `/v1/operator/payments/${encodeURIComponent(paymentId)}/verify`, accessToken, "POST", {}, fetchImpl));
}

const timelineEventSchema = z
  .object({
    id: z.string(),
    status: orderStatusSchema,
    note: z.string(),
    occurredAt: z.string(),
  })
  .strict();

const noticeSchema = z
  .object({
    id: z.string(),
    message: z.string(),
    createdAt: z.string(),
  })
  .strict();

const customerOrderSchema = orderSummarySchema
  .extend({
    timeline: z.array(timelineEventSchema),
    notices: z.array(noticeSchema),
  })
  .strict();

const operatorOrderSchema = customerOrderSchema
  .extend({
    allowed: z.array(orderStatusSchema),
    timeline: z.array(timelineEventSchema.extend({ actorId: z.string() }).strict()),
  })
  .strict();

export type CustomerOrder = z.infer<typeof customerOrderSchema>;
export type OperatorOrder = z.infer<typeof operatorOrderSchema>;

export async function listOrders(baseUrl: string, accessToken: string, fetchImpl: typeof fetch = fetch) {
  return z.object({ items: z.array(customerOrderSchema) }).strict().parse(await send(baseUrl, "/v1/orders", accessToken, "GET", undefined, fetchImpl));
}

export async function getOrder(baseUrl: string, accessToken: string, orderId: string, fetchImpl: typeof fetch = fetch): Promise<CustomerOrder> {
  return customerOrderSchema.parse(await send(baseUrl, `/v1/orders/${encodeURIComponent(orderId)}`, accessToken, "GET", undefined, fetchImpl));
}

export async function listFulfillmentQueue(baseUrl: string, accessToken: string, fetchImpl: typeof fetch = fetch) {
  return z.object({ items: z.array(operatorOrderSchema) }).strict().parse(await send(baseUrl, "/v1/operator/orders", accessToken, "GET", undefined, fetchImpl));
}

export async function recordTrackingEvent(
  baseUrl: string,
  accessToken: string,
  orderId: string,
  body: { status: string; note: string },
  fetchImpl: typeof fetch = fetch,
): Promise<OperatorOrder> {
  return operatorOrderSchema.parse(
    await send(baseUrl, `/v1/operator/orders/${encodeURIComponent(orderId)}/events`, accessToken, "POST", body, fetchImpl),
  );
}

export async function rejectPayment(
  baseUrl: string,
  accessToken: string,
  paymentId: string,
  reason: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PaymentView> {
  return paymentViewSchema.parse(
    await send(baseUrl, `/v1/operator/payments/${encodeURIComponent(paymentId)}/reject`, accessToken, "POST", { reason }, fetchImpl),
  );
}
