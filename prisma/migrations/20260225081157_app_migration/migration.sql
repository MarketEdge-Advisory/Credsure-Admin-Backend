-- CreateTable
CREATE TABLE "FinanceApplication" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "employmentStatus" TEXT NOT NULL,
    "estimatedNetMonthlyIncome" DECIMAL(12,2) NOT NULL,
    "selectedVehicle" TEXT,
    "monthlyPayment" DECIMAL(12,2),
    "consentGiven" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceApplication_createdAt_idx" ON "FinanceApplication"("createdAt");

-- CreateIndex
CREATE INDEX "FinanceApplication_email_idx" ON "FinanceApplication"("email");
