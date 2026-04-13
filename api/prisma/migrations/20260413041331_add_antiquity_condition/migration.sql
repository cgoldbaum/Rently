-- CreateEnum
CREATE TYPE "PropertyCondition" AS ENUM ('EXCELLENT', 'GOOD', 'REGULAR', 'NEEDS_WORK');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "antiquity" INTEGER,
ADD COLUMN     "condition" "PropertyCondition";
