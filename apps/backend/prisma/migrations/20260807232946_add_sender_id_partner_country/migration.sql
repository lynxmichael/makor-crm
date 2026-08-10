-- AlterTable
ALTER TABLE "SenderIdRequest" ADD COLUMN     "partnerCountry" TEXT;

-- CreateIndex
CREATE INDEX "SenderIdRequest_partnerCountry_idx" ON "SenderIdRequest"("partnerCountry");
