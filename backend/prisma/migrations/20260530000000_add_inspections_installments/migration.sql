-- AlterTable: add installment fields to Payment
ALTER TABLE "Payment" ADD COLUMN "installmentGroupId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "installmentNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Payment" ADD COLUMN "installmentCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable: Inspection
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "type" TEXT NOT NULL DEFAULT 'VISIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Payment_installmentGroupId_idx" ON "Payment"("installmentGroupId");
CREATE INDEX "Inspection_propertyId_scheduledAt_idx" ON "Inspection"("propertyId", "scheduledAt");
