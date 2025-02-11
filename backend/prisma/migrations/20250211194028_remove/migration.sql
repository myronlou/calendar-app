/*
  Warnings:

  - Made the column `bookingTypeId` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_bookingTypeId_fkey";

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "bookingTypeId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_bookingTypeId_fkey" FOREIGN KEY ("bookingTypeId") REFERENCES "BookingType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
