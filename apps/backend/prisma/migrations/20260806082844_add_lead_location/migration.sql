-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT;

-- CreateIndex
CREATE INDEX "Lead_country_idx" ON "Lead"("country");
