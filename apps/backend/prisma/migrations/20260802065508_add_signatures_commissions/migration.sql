-- CreateEnum
CREATE TYPE "SignableEntity" AS ENUM ('QUOTE', 'PURCHASE_ORDER', 'CONTRACT');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'VIEWED', 'SIGNED', 'REFUSED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionBase" AS ENUM ('SIGNED_AMOUNT', 'MARGIN', 'COLLECTED_AMOUNT');

-- CreateEnum
CREATE TYPE "CommissionTrigger" AS ENUM ('PURCHASE_ORDER_SIGNED', 'CONTRACT_ACTIVATED', 'INVOICE_PAID');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "SignatureRequest" (
    "id" TEXT NOT NULL,
    "entityType" "SignableEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signerPhone" TEXT,
    "token" TEXT NOT NULL,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "documentHash" TEXT NOT NULL,
    "signatureData" TEXT,
    "signatureType" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedIp" TEXT,
    "signedUserAgent" TEXT,
    "viewedAt" TIMESTAMP(3),
    "refusedAt" TIMESTAMP(3),
    "refusalReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "providerName" TEXT,
    "providerRequestId" TEXT,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(6,4) NOT NULL,
    "base" "CommissionBase" NOT NULL DEFAULT 'SIGNED_AMOUNT',
    "trigger" "CommissionTrigger" NOT NULL DEFAULT 'INVOICE_PAID',
    "minimumAmount" DECIMAL(14,2),
    "capAmount" DECIMAL(14,2),
    "roleId" TEXT,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "baseAmount" DECIMAL(14,2) NOT NULL,
    "rate" DECIMAL(6,4) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "period" TEXT NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignatureRequest_token_key" ON "SignatureRequest"("token");

-- CreateIndex
CREATE INDEX "SignatureRequest_entityType_entityId_idx" ON "SignatureRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SignatureRequest_status_idx" ON "SignatureRequest"("status");

-- CreateIndex
CREATE INDEX "CommissionPlan_roleId_idx" ON "CommissionPlan"("roleId");

-- CreateIndex
CREATE INDEX "CommissionPlan_userId_idx" ON "CommissionPlan"("userId");

-- CreateIndex
CREATE INDEX "Commission_userId_period_idx" ON "Commission"("userId", "period");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_sourceType_sourceId_userId_key" ON "Commission"("sourceType", "sourceId", "userId");

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPlan" ADD CONSTRAINT "CommissionPlan_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPlan" ADD CONSTRAINT "CommissionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CommissionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
