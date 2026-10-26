-- TOTP credential for operator accounts. The ciphertext is not the raw secret.
CREATE TABLE "TotpCredential" (
    "userId" UUID NOT NULL,
    "secretCiphertext" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "lastAcceptedStep" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TotpCredential_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "TotpCredential" ADD CONSTRAINT "TotpCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
