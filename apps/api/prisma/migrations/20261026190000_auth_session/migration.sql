-- Session family, device binding, MFA flag, registration grants, and seed roles.
-- One-time codes are not stored in Postgres.

ALTER TABLE "Device" ADD COLUMN "clientDeviceId" TEXT;
UPDATE "Device" SET "clientDeviceId" = "id"::text WHERE "clientDeviceId" IS NULL;
ALTER TABLE "Device" ALTER COLUMN "clientDeviceId" SET NOT NULL;
CREATE UNIQUE INDEX "Device_userId_clientDeviceId_key" ON "Device"("userId", "clientDeviceId");

ALTER TABLE "Session" ADD COLUMN "familyId" UUID;
UPDATE "Session" SET "familyId" = "id" WHERE "familyId" IS NULL;
ALTER TABLE "Session" ALTER COLUMN "familyId" SET NOT NULL;

ALTER TABLE "Session" ADD COLUMN "deviceId" UUID;
ALTER TABLE "Session" ADD COLUMN "roleCode" TEXT;
UPDATE "Session" SET "roleCode" = 'CUSTOMER' WHERE "roleCode" IS NULL;
ALTER TABLE "Session" ALTER COLUMN "roleCode" SET NOT NULL;
ALTER TABLE "Session" ADD COLUMN "mfaSatisfied" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Session" ADD COLUMN "rotatedAt" TIMESTAMP(3);

CREATE INDEX "Session_familyId_idx" ON "Session"("familyId");
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

ALTER TABLE "Session"
    ADD CONSTRAINT "Session_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RegistrationGrant" (
    "jti" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationGrant_pkey" PRIMARY KEY ("jti")
);

CREATE INDEX "RegistrationGrant_expiresAt_idx" ON "RegistrationGrant"("expiresAt");

INSERT INTO "Role" ("id", "code", "name", "createdAt", "updatedAt") VALUES
    ('00000000-0000-4000-8000-000000000001', 'SUPER_ADMIN', 'Superadministrador', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000002', 'OPERATIONS_ADMIN', 'Administración de operaciones', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000003', 'PROCUREMENT_AGENT', 'Agente de compras', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000004', 'FINANCE_AGENT', 'Agente de finanzas', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000005', 'LOGISTICS_AGENT', 'Agente de logística', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000006', 'SUPPORT_AGENT', 'Agente de soporte', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000007', 'CUSTOMER', 'Cliente', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
