-- CreateEnum: Create new Country enum type with all values including AR
CREATE TYPE "Country_new" AS ENUM ('AR', 'CL', 'CO', 'UY');

-- AlterTable: Update Property table to use new enum type
ALTER TABLE "Property" ALTER COLUMN "country" DROP DEFAULT;
ALTER TABLE "Property" ALTER COLUMN "country" TYPE "Country_new" USING ("country"::text::"Country_new");
ALTER TABLE "Property" ALTER COLUMN "country" SET DEFAULT 'AR'::"Country_new";

-- DropEnum: Drop the old Country enum type
DROP TYPE "Country";

-- RenameEnum: Rename the new enum type back to original name
ALTER TYPE "Country_new" RENAME TO "Country";
