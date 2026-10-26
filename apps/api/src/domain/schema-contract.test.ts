import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { orderStatuses, paymentStatuses } from "@comprausa/types";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("prisma schema contract", () => {
  it("includes the order and payment states", () => {
    for (const status of orderStatuses) {
      expect(schema).toContain(status);
    }
    for (const status of paymentStatuses) {
      expect(schema).toContain(status);
    }
  });

  it("stores money as BigInt minor units and rates as Decimal", () => {
    expect(schema).toMatch(/amountMinor\s+BigInt/);
    expect(schema).toContain("@db.Decimal(20, 10)");
    expect(schema).not.toMatch(/\bFloat\b/);
  });

  it("names every required model", () => {
    const models = [
      "User",
      "UserProfile",
      "UserIdentity",
      "Session",
      "Device",
      "Address",
      "Role",
      "Permission",
      "Store",
      "StoreIntegration",
      "Category",
      "Product",
      "ProductVariant",
      "ProductSource",
      "ProductPriceSnapshot",
      "Cart",
      "CartItem",
      "Wishlist",
      "Quote",
      "QuoteItem",
      "Order",
      "OrderItem",
      "SupplierOrder",
      "Payment",
      "PaymentAttempt",
      "PaymentProof",
      "Refund",
      "Shipment",
      "Package",
      "Warehouse",
      "TrackingEvent",
      "Delivery",
      "Notification",
      "SupportTicket",
      "AuditLog",
      "PricingRule",
      "CurrencyRate",
      "FeatureFlag",
    ];
    for (const model of models) {
      expect(schema).toContain(`model ${model} `);
    }
  });
});
