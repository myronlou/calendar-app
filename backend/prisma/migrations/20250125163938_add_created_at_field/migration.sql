-- DropIndex
DROP INDEX "Event_isVerified_createdAt_idx";

-- CreateIndex
CREATE INDEX "Event_isVerified_createdAt_email_idx" ON "Event"("isVerified", "createdAt", "email");
