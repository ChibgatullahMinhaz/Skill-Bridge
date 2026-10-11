/*
  Warnings:

  - Added the required column `phone` to the `providerProfile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "providerProfile" ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "status" "ProviderStatus" NOT NULL DEFAULT 'PENDING';
