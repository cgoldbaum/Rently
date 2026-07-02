-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "parentPropertyId" TEXT;

-- CreateIndex
CREATE INDEX "Property_parentPropertyId_idx" ON "Property"("parentPropertyId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_parentPropertyId_fkey" FOREIGN KEY ("parentPropertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
