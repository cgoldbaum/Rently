/*
  Warnings:

  - The `country` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Country" AS ENUM ('CL', 'CO', 'UY');

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "country",
ADD COLUMN     "country" "Country" NOT NULL DEFAULT 'CL';
