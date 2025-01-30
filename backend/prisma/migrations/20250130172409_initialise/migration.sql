/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `editToken` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `salt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `tokenExpires` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `verificationCode` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `verificationExpiresAt` on the `Event` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Event_editToken_key";

-- DropIndex
DROP INDEX "Event_isVerified_createdAt_email_idx";

-- DropIndex
DROP INDEX "Event_salt_key";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "deleted_at",
DROP COLUMN "editToken",
DROP COLUMN "isVerified",
DROP COLUMN "salt",
DROP COLUMN "tokenExpires",
DROP COLUMN "verificationCode",
DROP COLUMN "verificationExpiresAt",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastOtpVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "role" SET DEFAULT 'customer';

-- CreateTable
CREATE TABLE "OTP" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,

    CONSTRAINT "BookingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "day" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "OTP_email_type_idx" ON "OTP"("email", "type");

-- CreateIndex
CREATE UNIQUE INDEX "OTP_email_type_key" ON "OTP"("email", "type");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
