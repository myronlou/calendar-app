/*
  Warnings:

  - You are about to drop the column `endDate` on the `Exclusion` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Exclusion` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Exclusion` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Exclusion` table. All the data in the column will be lost.
  - Added the required column `start` to the `Exclusion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exclusion" DROP COLUMN "endDate",
DROP COLUMN "endTime",
DROP COLUMN "startDate",
DROP COLUMN "startTime",
ADD COLUMN     "end" TIMESTAMP(3),
ADD COLUMN     "start" TIMESTAMP(3) NOT NULL;
