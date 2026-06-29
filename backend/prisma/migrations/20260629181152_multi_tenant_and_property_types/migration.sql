-- AlterEnum
ALTER TYPE "PropertyType" ADD VALUE 'GARAGE';
ALTER TYPE "PropertyType" ADD VALUE 'DUPLEX';

-- DropIndex
DROP INDEX "Tenant_contractId_key";

-- DropIndex
DROP INDEX "Tenant_userId_key";

-- CreateIndex
CREATE INDEX "Tenant_userId_idx" ON "Tenant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_contractId_userId_key" ON "Tenant"("contractId", "userId");
