-- CreateEnum
CREATE TYPE "SocialSource" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK', 'SNAPCHAT', 'X', 'YOUTUBE', 'WHATSAPP_BUSINESS', 'GOOGLE', 'AUTRE');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'PROPOSAL';

-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "legalMentions" TEXT,
ADD COLUMN     "pdfTemplate" TEXT NOT NULL DEFAULT 'CLASSIC',
ADD COLUMN     "rccm" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "SocialUpdate" (
    "id" TEXT NOT NULL,
    "source" "SocialSource" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "link" TEXT,
    "fromAddress" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "messageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialUpdate_messageKey_key" ON "SocialUpdate"("messageKey");

-- CreateIndex
CREATE INDEX "SocialUpdate_source_receivedAt_idx" ON "SocialUpdate"("source", "receivedAt");

-- CreateIndex
CREATE INDEX "SocialUpdate_isRead_idx" ON "SocialUpdate"("isRead");
