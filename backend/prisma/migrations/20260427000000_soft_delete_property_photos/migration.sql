-- AlterTable
ALTER TABLE "PropertyPhoto" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;
