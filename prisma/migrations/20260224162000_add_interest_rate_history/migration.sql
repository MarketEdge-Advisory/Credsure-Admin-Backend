-- CreateTable
CREATE TABLE "InterestRateHistory" (
    "id" TEXT NOT NULL,
    "previousRatePct" DECIMAL(5,2),
    "newRatePct" DECIMAL(5,2) NOT NULL,
    "changedById" TEXT,
    "changedByRole" "Role",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterestRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterestRateHistory_createdAt_idx" ON "InterestRateHistory"("createdAt");

-- CreateIndex
CREATE INDEX "InterestRateHistory_changedById_idx" ON "InterestRateHistory"("changedById");

-- AddForeignKey
ALTER TABLE "InterestRateHistory"
ADD CONSTRAINT "InterestRateHistory_changedById_fkey"
FOREIGN KEY ("changedById") REFERENCES "AdminUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
