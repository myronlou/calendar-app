/*
  Warnings:

  - You are about to drop the column `end` on the `Exclusion` table. All the data in the column will be lost.
  - You are about to drop the column `start` on the `Exclusion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Exclusion" DROP COLUMN "end",
DROP COLUMN "start",
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "startTime" TIMESTAMP(3);
