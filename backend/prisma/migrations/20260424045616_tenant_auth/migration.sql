/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'TENANT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT', 'ADJUSTMENT', 'CLAIM');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING_CONFIRMATION';

-- AlterTable
ALTER TABLE "Claim" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cashNote" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE "CashReceipt" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashReceipt_paymentId_key" ON "CashReceipt"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "CashReceipt_receiptNumber_key" ON "CashReceipt"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_userId_key" ON "Tenant"("userId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashReceipt" ADD CONSTRAINT "CashReceipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
