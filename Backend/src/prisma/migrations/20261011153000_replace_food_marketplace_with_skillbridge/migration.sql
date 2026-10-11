BEGIN;

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
CREATE TYPE "Role_new" AS ENUM ('STUDENT', 'TUTOR', 'ADMIN');
ALTER TABLE "public"."user" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "role" TYPE "Role_new"
USING (CASE "role"::text WHEN 'CUSTOMER' THEN 'STUDENT' WHEN 'PROVIDER' THEN 'TUTOR' ELSE "role"::text END)::"Role_new";
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'STUDENT';

-- DropForeignKey
ALTER TABLE "cart" DROP CONSTRAINT "cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "cartItem" DROP CONSTRAINT "cartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "cartItem" DROP CONSTRAINT "cartItem_mealId_fkey";

-- DropForeignKey
ALTER TABLE "meal" DROP CONSTRAINT "meal_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "meal" DROP CONSTRAINT "meal_providerId_fkey";

-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "orderItem" DROP CONSTRAINT "orderItem_mealId_fkey";

-- DropForeignKey
ALTER TABLE "orderItem" DROP CONSTRAINT "orderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "providerProfile" DROP CONSTRAINT "providerProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "review" DROP CONSTRAINT "review_customerId_fkey";

-- DropForeignKey
ALTER TABLE "review" DROP CONSTRAINT "review_mealId_fkey";

-- DropForeignKey
ALTER TABLE "review" DROP CONSTRAINT "review_orderId_fkey";

-- DropIndex
DROP INDEX "review_customerId_idx";

-- DropIndex
DROP INDEX "review_customerId_mealId_orderId_key";

-- DropIndex
DROP INDEX "review_mealId_idx";

-- DropIndex
DROP INDEX "review_orderId_idx";

-- AlterTable
-- Food reviews cannot represent completed tutoring sessions.
DELETE FROM "review";
ALTER TABLE "review" DROP COLUMN "customerId",
DROP COLUMN "mealId",
DROP COLUMN "orderId",
ADD COLUMN     "bookingId" TEXT NOT NULL,
ADD COLUMN     "tutorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'STUDENT';

-- DropTable
DROP TABLE "cart";

-- DropTable
DROP TABLE "cartItem";

-- DropTable
DROP TABLE "meal";

-- DropTable
DROP TABLE "order";

-- DropTable
DROP TABLE "orderItem";

-- DropTable
DROP TABLE "providerProfile";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "ProviderStatus";

-- CreateTable
CREATE TABLE "availabilitySlot" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorSubject" (
    "tutorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "tutorSubject_pkey" PRIMARY KEY ("tutorId","categoryId")
);

-- CreateIndex
CREATE INDEX "availabilitySlot_tutorId_startsAt_idx" ON "availabilitySlot"("tutorId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "availabilitySlot_id_tutorId_key" ON "availabilitySlot"("id", "tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "availabilitySlot_tutorId_startsAt_endsAt_key" ON "availabilitySlot"("tutorId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "booking_studentId_createdAt_idx" ON "booking"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "booking_tutorId_status_idx" ON "booking"("tutorId", "status");

-- CreateIndex
CREATE INDEX "booking_slotId_status_idx" ON "booking"("slotId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "booking_id_tutorId_key" ON "booking"("id", "tutorId");

-- CreateIndex
CREATE UNIQUE INDEX "tutorProfile_userId_key" ON "tutorProfile"("userId");

-- CreateIndex
CREATE INDEX "tutorSubject_categoryId_idx" ON "tutorSubject"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "review_bookingId_key" ON "review"("bookingId");

-- CreateIndex
CREATE INDEX "review_tutorId_createdAt_idx" ON "review"("tutorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_bookingId_tutorId_key" ON "review"("bookingId", "tutorId");

-- AddForeignKey
ALTER TABLE "availabilitySlot" ADD CONSTRAINT "availabilitySlot_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_slotId_tutorId_fkey" FOREIGN KEY ("slotId", "tutorId") REFERENCES "availabilitySlot"("id", "tutorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_bookingId_tutorId_fkey" FOREIGN KEY ("bookingId", "tutorId") REFERENCES "booking"("id", "tutorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorProfile" ADD CONSTRAINT "tutorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorSubject" ADD CONSTRAINT "tutorSubject_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorSubject" ADD CONSTRAINT "tutorSubject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints not represented by Prisma's schema language.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "availabilitySlot"
  ADD CONSTRAINT "availabilitySlot_valid_interval" CHECK ("startsAt" < "endsAt"),
  ADD CONSTRAINT "availabilitySlot_no_tutor_overlap"
    EXCLUDE USING gist ("tutorId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&);

CREATE UNIQUE INDEX "booking_active_slot_key" ON "booking" ("slotId")
  WHERE "status" IN ('CONFIRMED', 'COMPLETED');

ALTER TABLE "tutorProfile" ADD CONSTRAINT "tutorProfile_positive_rate" CHECK ("hourlyRate" > 0);
ALTER TABLE "booking" ADD CONSTRAINT "booking_positive_price" CHECK ("totalPrice" > 0);
ALTER TABLE "review" ADD CONSTRAINT "review_valid_rating" CHECK ("rating" BETWEEN 1 AND 5);

-- Roles and status in existing session payloads must be refreshed.
DELETE FROM "session";

COMMIT;
