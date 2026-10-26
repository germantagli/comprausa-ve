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
    status: z.enum(["PENDING_VALIDATION", "FINAL"]),
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
