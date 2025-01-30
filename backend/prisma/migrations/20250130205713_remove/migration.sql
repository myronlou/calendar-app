/*
  Warnings:

  - You are about to drop the column `status` on the `Event` table. All the data in the column will be lost.
  - You are about to alter the column `phone` on the `Event` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "status",
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20);

-- CreateIndex
CREATE INDEX "Event_email_idx" ON "Event"("email");

-- CreateIndex
CREATE INDEX "Event_userId_idx" ON "Event"("userId");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");
