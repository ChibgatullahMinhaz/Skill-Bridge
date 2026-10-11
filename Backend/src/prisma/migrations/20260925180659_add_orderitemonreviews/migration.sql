/*
  Warnings:

  - A unique constraint covering the columns `[customerId,mealId,orderId]` on the table `review` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `cartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `orderItem` table without a default value. This is not possible if the table is not empty.
  - Made the column `comment` on table `review` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "cartItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "orderItem" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "review" ADD COLUMN     "orderId" TEXT,
ALTER COLUMN "comment" SET NOT NULL;

-- CreateIndex
CREATE INDEX "review_orderId_idx" ON "review"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "review_customerId_mealId_orderId_key" ON "review"("customerId", "mealId", "orderId");

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
