-- Add MANUAL value to IndexType enum
ALTER TYPE "IndexType" ADD VALUE 'MANUAL';

-- Make nextAdjustDate nullable in Contract
ALTER TABLE "Contract" ALTER COLUMN "nextAdjustDate" DROP NOT NULL;
