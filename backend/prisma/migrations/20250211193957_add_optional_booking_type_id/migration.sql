/*
  Warnings:

  - You are about to drop the column `title` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "title",
ADD COLUMN     "bookingTypeId" INTEGER;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_bookingTypeId_fkey" FOREIGN KEY ("bookingTypeId") REFERENCES "BookingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
