-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "notifiedOverdueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "notifiedOverdueAt" TIMESTAMP(3);
