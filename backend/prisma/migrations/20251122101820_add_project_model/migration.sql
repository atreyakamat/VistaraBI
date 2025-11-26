/*
  Warnings:

  - You are about to drop the column `cleaningJobId` on the `domain_detection_jobs` table. All the data in the column will be lost.
  - You are about to drop the column `cleaningJobId` on the `kpi_extraction_jobs` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `cleaning_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cleaningJobIds` to the `domain_detection_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `domain_detection_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cleaningJobIds` to the `kpi_extraction_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `kpi_extraction_jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `uploads` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Create projects table
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "combinedDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create default project for existing data
INSERT INTO "projects" ("id", "name", "description", "status", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Legacy Data', 'Existing data migrated to project model', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Step 3: Add projectId columns (nullable first)
ALTER TABLE "uploads" ADD COLUMN "projectId" TEXT;
ALTER TABLE "cleaning_jobs" ADD COLUMN "projectId" TEXT;
ALTER TABLE "domain_detection_jobs" ADD COLUMN "projectId" TEXT;
ALTER TABLE "kpi_extraction_jobs" ADD COLUMN "projectId" TEXT;

-- Step 4: Update existing records to use default project
UPDATE "uploads" SET "projectId" = (SELECT id FROM "projects" WHERE name = 'Legacy Data' LIMIT 1) WHERE "projectId" IS NULL;
UPDATE "cleaning_jobs" SET "projectId" = (SELECT id FROM "projects" WHERE name = 'Legacy Data' LIMIT 1) WHERE "projectId" IS NULL;
UPDATE "domain_detection_jobs" SET "projectId" = (SELECT id FROM "projects" WHERE name = 'Legacy Data' LIMIT 1) WHERE "projectId" IS NULL;
UPDATE "kpi_extraction_jobs" SET "projectId" = (SELECT id FROM "projects" WHERE name = 'Legacy Data' LIMIT 1) WHERE "projectId" IS NULL;

-- Step 5: Make projectId columns NOT NULL
ALTER TABLE "uploads" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "cleaning_jobs" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "domain_detection_jobs" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "kpi_extraction_jobs" ALTER COLUMN "projectId" SET NOT NULL;

-- Step 6: Migrate cleaningJobId to cleaningJobIds array for domain_detection_jobs
ALTER TABLE "domain_detection_jobs" ADD COLUMN "cleaningJobIds" JSONB;
UPDATE "domain_detection_jobs" SET "cleaningJobIds" = json_build_array("cleaningJobId")::jsonb WHERE "cleaningJobId" IS NOT NULL;
ALTER TABLE "domain_detection_jobs" ALTER COLUMN "cleaningJobIds" SET NOT NULL;

-- Step 7: Migrate cleaningJobId to cleaningJobIds array for kpi_extraction_jobs
ALTER TABLE "kpi_extraction_jobs" ADD COLUMN "cleaningJobIds" JSONB;
UPDATE "kpi_extraction_jobs" SET "cleaningJobIds" = json_build_array("cleaningJobId")::jsonb WHERE "cleaningJobId" IS NOT NULL;
ALTER TABLE "kpi_extraction_jobs" ALTER COLUMN "cleaningJobIds" SET NOT NULL;

-- Step 8: Drop old foreign key constraints and columns
ALTER TABLE "domain_detection_jobs" DROP CONSTRAINT IF EXISTS "domain_detection_jobs_cleaningJobId_fkey";
ALTER TABLE "domain_detection_jobs" DROP COLUMN "cleaningJobId";
ALTER TABLE "kpi_extraction_jobs" DROP COLUMN "cleaningJobId";

-- Step 9: Drop old indexes
DROP INDEX IF EXISTS "domain_detection_jobs_cleaningJobId_idx";
DROP INDEX IF EXISTS "kpi_extraction_jobs_cleaningJobId_idx";

-- Step 10: Create new indexes
CREATE INDEX "cleaning_jobs_projectId_idx" ON "cleaning_jobs"("projectId");
CREATE INDEX "domain_detection_jobs_projectId_idx" ON "domain_detection_jobs"("projectId");
CREATE INDEX "kpi_extraction_jobs_projectId_idx" ON "kpi_extraction_jobs"("projectId");
CREATE INDEX "uploads_projectId_idx" ON "uploads"("projectId");

-- Step 11: Add foreign key constraints
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cleaning_jobs" ADD CONSTRAINT "cleaning_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "domain_detection_jobs" ADD CONSTRAINT "domain_detection_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kpi_extraction_jobs" ADD CONSTRAINT "kpi_extraction_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
