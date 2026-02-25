/*
  Warnings:

  - The values [OUT_OF_STOCK] on the enum `CarAvailability` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "FinanceApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "CarAvailability_new" AS ENUM ('AVAILABLE', 'NOT_AVAILABLE');
ALTER TABLE "public"."Car" ALTER COLUMN "availability" DROP DEFAULT;
ALTER TABLE "Car" ALTER COLUMN "availability" TYPE "CarAvailability_new" USING ("availability"::text::"CarAvailability_new");
ALTER TYPE "CarAvailability" RENAME TO "CarAvailability_old";
ALTER TYPE "CarAvailability_new" RENAME TO "CarAvailability";
DROP TYPE "public"."CarAvailability_old";
ALTER TABLE "Car" ALTER COLUMN "availability" SET DEFAULT 'AVAILABLE';
COMMIT;

-- AlterTable
ALTER TABLE "FinanceApplication" ADD COLUMN     "carId" TEXT,
ADD COLUMN     "downPayment" DECIMAL(12,2),
ADD COLUMN     "status" "FinanceApplicationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "vehicleAmount" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "FinanceApplication_status_idx" ON "FinanceApplication"("status");

-- CreateIndex
CREATE INDEX "FinanceApplication_carId_idx" ON "FinanceApplication"("carId");

-- AddForeignKey
ALTER TABLE "FinanceApplication" ADD CONSTRAINT "FinanceApplication_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;
