-- El índice único (contractId, period) rompía las cuotas: inspections.service.ts
-- crea N pagos con el mismo contrato+período (installmentNumber 1..N). Se amplía
-- la clave a installmentNumber; el scheduler sigue protegido porque siempre crea
-- con installmentNumber = 1.
DROP INDEX "Payment_contractId_period_key";

CREATE UNIQUE INDEX "Payment_contractId_period_installmentNumber_key" ON "Payment"("contractId", "period", "installmentNumber");
