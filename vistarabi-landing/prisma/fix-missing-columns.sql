-- Safe, additive migration — adds missing columns and tables
-- Run with: npx prisma db execute --file prisma/fix-missing-columns.sql --schema prisma/schema.prisma

-- 1. Add unit column to ApprovedKPI (nullable, so no data loss)
ALTER TABLE "ApprovedKPI" ADD COLUMN IF NOT EXISTS "unit" TEXT;

-- 2. Create DashboardState if missing
CREATE TABLE IF NOT EXISTS "DashboardState" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "globalFilters" JSONB NOT NULL DEFAULT '[]',
    "granularity" TEXT NOT NULL DEFAULT 'monthly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DashboardState_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "DashboardState_projectId_key" ON "DashboardState"("projectId");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "DashboardState_projectId_idx" ON "DashboardState"("projectId");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "DashboardState"
        ADD CONSTRAINT "DashboardState_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Create DashboardCard if missing
CREATE TABLE IF NOT EXISTS "DashboardCard" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "chartType" TEXT NOT NULL,
    "cardSize" TEXT NOT NULL DEFAULT 'md',
    "position" INTEGER NOT NULL,
    "colSpan" INTEGER NOT NULL DEFAULT 1,
    "rowSpan" INTEGER NOT NULL DEFAULT 1,
    "groupBy" TEXT,
    "filterOverrides" JSONB NOT NULL DEFAULT '[]',
    "comparisonMode" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isDrillDown" BOOLEAN NOT NULL DEFAULT false,
    "parentCardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DashboardCard_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DashboardCard_stateId_fkey"
        FOREIGN KEY ("stateId") REFERENCES "DashboardState"("id") ON DELETE CASCADE
);

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "DashboardCard_stateId_idx" ON "DashboardCard"("stateId");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "DashboardCard_kpiId_idx" ON "DashboardCard"("kpiId");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- 4. Create AuditLog if missing
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "intentId" TEXT NOT NULL,
    "rawUserQuery" TEXT NOT NULL,
    "normalizedUserQuery" TEXT NOT NULL,
    "llmRawOutput" TEXT,
    "validationStagesPassed" INTEGER NOT NULL DEFAULT 0,
    "validationFailedAt" TEXT,
    "structuredCommand" JSONB,
    "executionStatus" TEXT NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_intentId_key" ON "AuditLog"("intentId");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "AuditLog_sessionId_idx" ON "AuditLog"("sessionId");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;
