-- Add persisted user preferences for account-level AI routing.
ALTER TABLE "User" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}';

-- Hot path indices for dashboard KPI and audit lookups.
CREATE INDEX "KPIBlueprint_projectId_domain_idx" ON "KPIBlueprint"("projectId", "domain");
CREATE INDEX "ApprovedKPI_blueprintId_createdAt_idx" ON "ApprovedKPI"("blueprintId", "createdAt");
CREATE INDEX "AuditLog_sessionId_createdAt_idx" ON "AuditLog"("sessionId", "createdAt");
