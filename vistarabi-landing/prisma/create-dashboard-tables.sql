CREATE TABLE IF NOT EXISTS "DashboardState" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "globalFilters" JSONB NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'monthly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DashboardState_projectId_key" ON "DashboardState"("projectId");

ALTER TABLE "DashboardState" DROP CONSTRAINT IF EXISTS "DashboardState_projectId_fkey";
ALTER TABLE "DashboardState" ADD CONSTRAINT "DashboardState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
    "filterOverrides" JSONB NOT NULL,
    "comparisonMode" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isDrillDown" BOOLEAN NOT NULL DEFAULT false,
    "parentCardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardCard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DashboardCard_stateId_idx" ON "DashboardCard"("stateId");
CREATE INDEX IF NOT EXISTS "DashboardCard_kpiId_idx" ON "DashboardCard"("kpiId");

ALTER TABLE "DashboardCard" DROP CONSTRAINT IF EXISTS "DashboardCard_stateId_fkey";
ALTER TABLE "DashboardCard" ADD CONSTRAINT "DashboardCard_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "DashboardState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
