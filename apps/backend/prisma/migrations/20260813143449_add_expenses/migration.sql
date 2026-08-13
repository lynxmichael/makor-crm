-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('DEPLACEMENT', 'CARBURANT', 'RESTAURATION_CLIENT', 'ECHANTILLONS', 'COMMUNICATIONS', 'HEBERGEMENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "receiptPath" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reimbursedAt" TIMESTAMP(3),
    "method" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_userId_status_idx" ON "Expense"("userId", "status");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "Expense_spentAt_idx" ON "Expense"("spentAt");

-- CreateIndex
CREATE INDEX "Expense_customerId_idx" ON "Expense"("customerId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
