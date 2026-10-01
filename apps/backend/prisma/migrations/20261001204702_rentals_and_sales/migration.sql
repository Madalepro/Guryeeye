-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'HOUSE', 'VILLA', 'COMMERCIAL', 'LAND');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('VACANT', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "RentPaymentStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'UNDER_OFFER', 'SOLD', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'VIEWING', 'NEGOTIATION', 'WON', 'LOST');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'PROPERTY_MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'SALES_AGENT';

-- CreateTable
CREATE TABLE "RentalProperty" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalUnit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL DEFAULT 1,
    "monthlyRentCents" INTEGER NOT NULL,
    "status" "UnitStatus" NOT NULL DEFAULT 'VACANT',

    CONSTRAINT "RentalUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "monthlyRentCents" INTEGER NOT NULL,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentPayment" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "period" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "RentPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod",
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "RentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleListing" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "bedrooms" INTEGER,
    "areaSqm" INTEGER,
    "askingPriceCents" INTEGER NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "listedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLead" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "listingId" TEXT,
    "agentId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "offerCents" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleTransaction" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalProperty_hotelId_idx" ON "RentalProperty"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalUnit_propertyId_label_key" ON "RentalUnit"("propertyId", "label");

-- CreateIndex
CREATE INDEX "Tenant_hotelId_idx" ON "Tenant"("hotelId");

-- CreateIndex
CREATE INDEX "Lease_hotelId_status_idx" ON "Lease"("hotelId", "status");

-- CreateIndex
CREATE INDEX "Lease_unitId_status_idx" ON "Lease"("unitId", "status");

-- CreateIndex
CREATE INDEX "RentPayment_hotelId_status_dueDate_idx" ON "RentPayment"("hotelId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "RentPayment_hotelId_paidAt_idx" ON "RentPayment"("hotelId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "RentPayment_leaseId_period_key" ON "RentPayment"("leaseId", "period");

-- CreateIndex
CREATE INDEX "SaleListing_hotelId_status_idx" ON "SaleListing"("hotelId", "status");

-- CreateIndex
CREATE INDEX "SaleLead_hotelId_stage_idx" ON "SaleLead"("hotelId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "SaleTransaction_listingId_key" ON "SaleTransaction"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleTransaction_leadId_key" ON "SaleTransaction"("leadId");

-- CreateIndex
CREATE INDEX "SaleTransaction_hotelId_closedAt_idx" ON "SaleTransaction"("hotelId", "closedAt");

-- AddForeignKey
ALTER TABLE "RentalProperty" ADD CONSTRAINT "RentalProperty_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalUnit" ADD CONSTRAINT "RentalUnit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "RentalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleListing" ADD CONSTRAINT "SaleListing_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLead" ADD CONSTRAINT "SaleLead_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLead" ADD CONSTRAINT "SaleLead_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SaleListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLead" ADD CONSTRAINT "SaleLead_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTransaction" ADD CONSTRAINT "SaleTransaction_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTransaction" ADD CONSTRAINT "SaleTransaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SaleListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleTransaction" ADD CONSTRAINT "SaleTransaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "SaleLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
