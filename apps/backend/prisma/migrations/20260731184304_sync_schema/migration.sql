/*
  Warnings:

  - Added the required column `companyId` to the `Offer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CommentEntity" AS ENUM ('DASHBOARD', 'CUSTOMER', 'LEAD', 'DEAL', 'QUOTE', 'PURCHASE_ORDER', 'CONTRACT', 'INVOICE', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "AiTaskType" AS ENUM ('QUOTE_INTRO', 'QUOTE_TERMS', 'CONTRACT_BODY', 'CONTRACT_CLAUSE', 'EMAIL_DRAFT', 'MEETING_SUMMARY');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('GENERAL', 'PRISE_EN_MAIN', 'CLIENTS', 'PIPELINE', 'CAMPAGNES', 'DEVIS_COMMANDES', 'CONTRATS', 'FACTURATION', 'SENDER_ID', 'AGENDA', 'DOCUMENTS', 'REPORTING', 'PARAMETRES');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('DOCUMENT', 'VIDEO', 'LIEN', 'ARTICLE');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "label" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" "CommentEntity" NOT NULL,
    "entityId" TEXT,
    "parentId" TEXT,
    "mentionedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "attachmentPath" TEXT,
    "attachmentName" TEXT,
    "attachmentSize" INTEGER,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "deletedBySender" BOOLEAN NOT NULL DEFAULT false,
    "deletedByRecipient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "taskType" "AiTaskType" NOT NULL,
    "entityType" "CommentEntity",
    "entityId" TEXT,
    "instruction" TEXT,
    "output" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ResourceCategory" NOT NULL DEFAULT 'GENERAL',
    "type" "ResourceType" NOT NULL DEFAULT 'DOCUMENT',
    "filePath" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "url" TEXT,
    "content" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_entityType_entityId_idx" ON "Comment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Message_recipientId_readAt_idx" ON "Message"("recipientId", "readAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "AiGeneration_entityType_entityId_idx" ON "AiGeneration"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AiGeneration_requestedById_idx" ON "AiGeneration"("requestedById");

-- CreateIndex
CREATE INDEX "Resource_category_position_idx" ON "Resource"("category", "position");

-- CreateIndex
CREATE INDEX "Resource_isPublished_idx" ON "Resource"("isPublished");

-- CreateIndex
CREATE INDEX "Resource_createdById_idx" ON "Resource"("createdById");

-- CreateIndex
CREATE INDEX "Offer_companyId_idx" ON "Offer"("companyId");

-- CreateIndex
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
