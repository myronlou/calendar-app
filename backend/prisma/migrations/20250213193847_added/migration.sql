/*
  Warnings:

  - You are about to drop the column `date` on the `Exclusion` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `Exclusion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exclusion" DROP COLUMN "date",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;
