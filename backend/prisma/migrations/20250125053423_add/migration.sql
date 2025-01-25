/*
  Warnings:

  - A unique constraint covering the columns `[salt]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "salt" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_salt_key" ON "Event"("salt");
