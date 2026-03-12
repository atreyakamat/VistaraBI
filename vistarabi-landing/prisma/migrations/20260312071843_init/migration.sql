-- AlterTable
ALTER TABLE "ApprovedKPI" ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "DashboardState" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "globalFilters" JSONB NOT NULL,
    "granularity" TEXT NOT NULL DEFAULT 'monthly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardCard" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
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

-- CreateTable
CREATE TABLE "ProjectGoal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rawQuery" TEXT NOT NULL,
    "targetKpiId" TEXT,
    "targetValue" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "generatedPlan" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardState_projectId_key" ON "DashboardState"("projectId");

-- CreateIndex
CREATE INDEX "DashboardState_projectId_idx" ON "DashboardState"("projectId");

-- CreateIndex
CREATE INDEX "DashboardCard_stateId_idx" ON "DashboardCard"("stateId");

-- CreateIndex
CREATE INDEX "DashboardCard_kpiId_idx" ON "DashboardCard"("kpiId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_intentId_key" ON "AuditLog"("intentId");

-- CreateIndex
CREATE INDEX "AuditLog_sessionId_idx" ON "AuditLog"("sessionId");

-- CreateIndex
CREATE INDEX "AuditLog_intentId_idx" ON "AuditLog"("intentId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "DashboardState" ADD CONSTRAINT "DashboardState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardCard" ADD CONSTRAINT "DashboardCard_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "DashboardState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGoal" ADD CONSTRAINT "ProjectGoal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
