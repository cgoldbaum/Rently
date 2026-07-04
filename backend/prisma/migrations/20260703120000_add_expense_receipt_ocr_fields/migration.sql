-- AlterTable
ALTER TABLE "ExpenseReceipt"
ADD COLUMN "amount" DOUBLE PRECISION,
ADD COLUMN "currency" "Currency",
ADD COLUMN "dueDate" TIMESTAMP(3),
ADD COLUMN "issuer" TEXT,
ADD COLUMN "receiptNumber" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "ocrConfidence" INTEGER;
