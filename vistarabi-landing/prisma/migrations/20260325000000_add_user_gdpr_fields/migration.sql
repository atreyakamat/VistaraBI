-- VistaraBI Migration: Add GDPR fields to User model
-- Date: 2026-03-25
-- Adds updatedAt (auto-updated timestamp) and deletedAt (soft-delete for GDPR Article 17)

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Optional: Add an index on deletedAt for efficient filtered queries
CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt");
