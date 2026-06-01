-- Limpia pagos duplicados (mismo contrato + período) antes de aplicar el índice único.
-- Conserva el pago PAGADO (o el más reciente) y borra los repetidos.
-- Es idempotente: una vez que existe el índice único, no encuentra nada para borrar.

-- 1) Borrar recibos en efectivo de los pagos que vamos a eliminar (evita error de FK).
DELETE FROM "CashReceipt" WHERE "paymentId" IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY "contractId", period
      ORDER BY (status = 'PAID') DESC, "paidDate" DESC NULLS LAST, "updatedAt" DESC, id DESC
    ) AS rn
    FROM "Payment"
  ) t WHERE t.rn > 1
);

-- 2) Borrar los pagos duplicados (deja 1 por contrato + período).
DELETE FROM "Payment" WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY "contractId", period
      ORDER BY (status = 'PAID') DESC, "paidDate" DESC NULLS LAST, "updatedAt" DESC, id DESC
    ) AS rn
    FROM "Payment"
  ) t WHERE t.rn > 1
);
