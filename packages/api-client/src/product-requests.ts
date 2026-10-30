import { z } from "zod";
import { ApiClientError } from "./auth";

const requestStatusSchema = z.enum(["RECEIVED", "IN_REVIEW", "QUOTED", "ACCEPTED", "REJECTED", "CANCELLED"]);
const quoteStatusSchema = z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "SUPERSEDED"]);

const quoteSchema = z
  .object({
    id: z.string(),
    requestId: z.string(),
    version: z.number().int(),
    status: quoteStatusSchema,
    currency: z.literal("USD"),
    productUnitPriceMinor: z.number().int().nonnegative(),
    productSubtotalMinor: z.number().int().nonnegative(),
    domesticShippingMinor: z.number().int().nonnegative(),
    internationalShippingMinor: z.number().int().nonnegative(),
    serviceFeeMinor: z.number().int().nonnegative(),
    taxesMinor: z.number().int().nonnegative(),
    additionalCostsMinor: z.number().int().nonnegative(),
    discountMinor: z.number().int().nonnegative(),
    totalMinor: z.number().int(),
    estimatedDeliveryDays: z.number().int().nullable(),
    customerMessage: z.string().nullable().optional(),
    adminNotes: z.string().nullable().optional(),
    validUntil: z.string().nullable(),
    createdById: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    sentAt: z.string().nullable(),
    acceptedAt: z.string().nullable(),
    rejectedAt: z.string().nullable(),
    rejectionReason: z.string().nullable(),
    orderId: z.string().nullable().optional(),
  })
  .passthrough();

const requestSchema = z
  .object({
    id: z.string(),
    requestNumber: z.string(),
    userId: z.string(),
    productUrl: z.string(),
    productName: z.string().nullable(),
    description: z.string().nullable(),
    quantity: z.number().int(),
    size: z.string().nullable(),
    color: z.string().nullable(),
    additionalNotes: z.string().nullable(),
    status: requestStatusSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    quote: quoteSchema.nullable().optional(),
    customer: z
      .object({
        id: z.string(),
        email: z.string().nullable(),
        phoneE164: z.string().nullable(),
        givenName: z.string().nullable(),
        familyName: z.string().nullable(),
      })
      .nullable()
      .optional(),
    history: z
      .array(
        z.object({
          id: z.string(),
          requestId: z.string(),
          previousStatus: requestStatusSchema.nullable(),
          newStatus: requestStatusSchema,
          changedById: z.string().nullable(),
          comment: z.string().nullable(),
          createdAt: z.string(),
        }),
      )
      .optional(),
    quotes: z.array(quoteSchema).optional(),
  })
  .passthrough();

const pageSchema = z.object({
  items: z.array(requestSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const metricsSchema = z.object({
  total: z.number().int(),
  received: z.number().int(),
  inReview: z.number().int(),
  quoted: z.number().int(),
  accepted: z.number().int(),
  rejected: z.number().int(),
});

const inboxSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      type: z.string(),
      title: z.string(),
      message: z.string(),
      relatedEntityType: z.string().nullable(),
      relatedEntityId: z.string().nullable(),
      readAt: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  unreadCount: z.number().int(),
});

export type ProductRequestView = z.infer<typeof requestSchema>;
export type ProductQuoteView = z.infer<typeof quoteSchema>;
export type ProductRequestMetrics = z.infer<typeof metricsSchema>;

async function send(
  baseUrl: string,
  path: string,
  accessToken: string,
  method: "GET" | "POST",
  body?: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(new URL(path, baseUrl), {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

export async function createProductRequest(
  baseUrl: string,
  accessToken: string,
  input: {
    productUrl: string;
    productName?: string;
    description?: string;
    quantity: number;
    size?: string;
    color?: string;
    additionalNotes?: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<ProductRequestView> {
  return requestSchema.parse(await send(baseUrl, "/v1/product-requests", accessToken, "POST", input, fetchImpl));
}

export async function listMyProductRequests(
  baseUrl: string,
  accessToken: string,
  query: { status?: string; page?: number; pageSize?: number } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<z.infer<typeof pageSchema>> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const suffix = params.toString() ? `?${params}` : "";
  return pageSchema.parse(await send(baseUrl, `/v1/product-requests${suffix}`, accessToken, "GET", undefined, fetchImpl));
}

export async function getMyProductRequest(
  baseUrl: string,
  accessToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProductRequestView> {
  return requestSchema.parse(await send(baseUrl, `/v1/product-requests/${encodeURIComponent(id)}`, accessToken, "GET", undefined, fetchImpl));
}

export async function acceptProductQuote(
  baseUrl: string,
  accessToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProductQuoteView & { orderId?: string | null }> {
  return quoteSchema.parse(
    await send(baseUrl, `/v1/product-requests/${encodeURIComponent(id)}/accept`, accessToken, "POST", {}, fetchImpl),
  );
}

export async function rejectProductQuote(
  baseUrl: string,
  accessToken: string,
  id: string,
  reason?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProductQuoteView> {
  return quoteSchema.parse(
    await send(baseUrl, `/v1/product-requests/${encodeURIComponent(id)}/reject`, accessToken, "POST", { reason }, fetchImpl),
  );
}

export async function getProductRequestMetrics(
  baseUrl: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProductRequestMetrics> {
  return metricsSchema.parse(await send(baseUrl, "/v1/admin/product-requests/metrics", accessToken, "GET", undefined, fetchImpl));
}

export async function listAdminProductRequests(
  baseUrl: string,
  accessToken: string,
  query: { status?: string; q?: string; page?: number; pageSize?: number } = {},
  fetchImpl: typeof fetch = fetch,
): Promise<z.infer<typeof pageSchema>> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const suffix = params.toString() ? `?${params}` : "";
  return pageSchema.parse(await send(baseUrl, `/v1/admin/product-requests${suffix}`, accessToken, "GET", undefined, fetchImpl));
}

export async function getAdminProductRequest(
  baseUrl: string,
  accessToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ProductRequestView> {
  return requestSchema.parse(
    await send(baseUrl, `/v1/admin/product-requests/${encodeURIComponent(id)}`, accessToken, "GET", undefined, fetchImpl),
  );
}

export async function updateAdminProductRequestStatus(
  baseUrl: string,
  accessToken: string,
  id: string,
  body: { status: "IN_REVIEW" | "CANCELLED"; comment?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ProductRequestView> {
  return requestSchema.parse(
    await send(baseUrl, `/v1/admin/product-requests/${encodeURIComponent(id)}/status`, accessToken, "POST", body, fetchImpl),
  );
}

export async function saveAdminProductQuote(
  baseUrl: string,
  accessToken: string,
  id: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<ProductQuoteView> {
  return quoteSchema.parse(
    await send(baseUrl, `/v1/admin/product-requests/${encodeURIComponent(id)}/quotes`, accessToken, "POST", body, fetchImpl),
  );
}

export async function listInboxNotifications(
  baseUrl: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<z.infer<typeof inboxSchema>> {
  return inboxSchema.parse(await send(baseUrl, "/v1/inbox/notifications", accessToken, "GET", undefined, fetchImpl));
}

export async function markInboxNotificationRead(
  baseUrl: string,
  accessToken: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  return send(baseUrl, `/v1/inbox/notifications/${encodeURIComponent(id)}/read`, accessToken, "POST", {}, fetchImpl);
}
