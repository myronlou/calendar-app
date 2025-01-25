/*
  Warnings:

  - A unique constraint covering the columns `[editToken]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "editToken" TEXT,
ADD COLUMN     "tokenExpires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Event_editToken_key" ON "Event"("editToken");
