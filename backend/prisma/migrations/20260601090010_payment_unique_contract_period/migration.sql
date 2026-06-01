-- CreateIndex
CREATE UNIQUE INDEX "Payment_contractId_period_key" ON "Payment"("contractId", "period");
