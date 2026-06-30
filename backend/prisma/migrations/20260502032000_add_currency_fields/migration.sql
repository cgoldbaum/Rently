DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Currency') THEN
    CREATE TYPE "Currency" AS ENUM ('ARS', 'USD');
  END IF;
END $$;

ALTER TABLE "Contract"
ADD COLUMN IF NOT EXISTS "currency" "Currency" NOT NULL DEFAULT 'USD';

ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "currency" "Currency" NOT NULL DEFAULT 'USD';

DO $$
BEGIN
  IF to_regclass('"PaymentLink"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "currency" "Currency" NOT NULL DEFAULT ''USD''';
  END IF;
END $$;

