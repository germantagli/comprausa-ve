-- Product requests, versioned quotes, status history, and in-app inbox notifications.
-- Money columns are BigInt USD cents. No destructive changes to existing tables.

CREATE TYPE "ProductRequestStatus" AS ENUM ('RECEIVED', 'IN_REVIEW', 'QUOTED', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "ProductQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

CREATE TABLE "InboxNotification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" UUID,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InboxNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductRequestCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductRequestCounter_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ProductRequestCounter" ("id", "lastValue") VALUES (1, 0);

CREATE TABLE "ProductRequest" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "productUrl" TEXT NOT NULL,
    "productName" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "additionalNotes" TEXT,
    "status" "ProductRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductQuote" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ProductQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "productUnitPriceMinor" BIGINT NOT NULL,
    "productSubtotalMinor" BIGINT NOT NULL,
    "domesticShippingMinor" BIGINT NOT NULL DEFAULT 0,
    "internationalShippingMinor" BIGINT NOT NULL DEFAULT 0,
    "serviceFeeMinor" BIGINT NOT NULL DEFAULT 0,
    "taxesMinor" BIGINT NOT NULL DEFAULT 0,
    "additionalCostsMinor" BIGINT NOT NULL DEFAULT 0,
    "discountMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL,
    "estimatedDeliveryDays" INTEGER,
    "adminNotes" TEXT,
    "customerMessage" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    CONSTRAINT "ProductQuote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductRequestStatusHistory" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "previousStatus" "ProductRequestStatus",
    "newStatus" "ProductRequestStatus" NOT NULL,
    "changedById" UUID,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductRequestStatusHistory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN "productQuoteId" UUID;

CREATE UNIQUE INDEX "ProductRequest_requestNumber_key" ON "ProductRequest"("requestNumber");
CREATE INDEX "ProductRequest_userId_createdAt_idx" ON "ProductRequest"("userId", "createdAt");
CREATE INDEX "ProductRequest_status_createdAt_idx" ON "ProductRequest"("status", "createdAt");
CREATE UNIQUE INDEX "ProductQuote_requestId_version_key" ON "ProductQuote"("requestId", "version");
CREATE INDEX "ProductQuote_requestId_status_idx" ON "ProductQuote"("requestId", "status");
CREATE INDEX "ProductQuote_status_createdAt_idx" ON "ProductQuote"("status", "createdAt");
CREATE INDEX "ProductRequestStatusHistory_requestId_createdAt_idx" ON "ProductRequestStatusHistory"("requestId", "createdAt");
CREATE INDEX "InboxNotification_userId_createdAt_idx" ON "InboxNotification"("userId", "createdAt");
CREATE INDEX "InboxNotification_userId_readAt_idx" ON "InboxNotification"("userId", "readAt");
CREATE UNIQUE INDEX "Order_productQuoteId_key" ON "Order"("productQuoteId");

ALTER TABLE "InboxNotification" ADD CONSTRAINT "InboxNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductRequest" ADD CONSTRAINT "ProductRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductQuote" ADD CONSTRAINT "ProductQuote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ProductRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductQuote" ADD CONSTRAINT "ProductQuote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductRequestStatusHistory" ADD CONSTRAINT "ProductRequestStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ProductRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductRequestStatusHistory" ADD CONSTRAINT "ProductRequestStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_productQuoteId_fkey" FOREIGN KEY ("productQuoteId") REFERENCES "ProductQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
