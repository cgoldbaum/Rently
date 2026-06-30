-- Add Mercado Pago receipt metadata linked to each payment
CREATE TABLE IF NOT EXISTS "MercadoPagoReceipt" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "mpPaymentId" TEXT NOT NULL,
  "mpStatus" TEXT NOT NULL,
  "mpStatusDetail" TEXT,
  "paymentTypeId" TEXT,
  "paymentMethodId" TEXT,
  "externalReference" TEXT,
  "payerEmail" TEXT,
  "transactionAmount" DOUBLE PRECISION,
  "currencyId" TEXT,
  "dateApproved" TIMESTAMP(3),
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MercadoPagoReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MercadoPagoReceipt_paymentId_key" ON "MercadoPagoReceipt"("paymentId");

ALTER TABLE "MercadoPagoReceipt"
ADD CONSTRAINT "MercadoPagoReceipt_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
