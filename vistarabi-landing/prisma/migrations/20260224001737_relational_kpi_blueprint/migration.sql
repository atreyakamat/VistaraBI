-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "DataType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "QualityScore" AS ENUM ('GOOD', 'PARTIAL', 'POOR');

-- CreateEnum
CREATE TYPE "CleaningStatus" AS ENUM ('CLEANING', 'CLEANED', 'FAILED');

-- CreateEnum
CREATE TYPE "QualityGrade" AS ENUM ('A', 'B', 'C', 'D', 'F');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('GOOD', 'PARTIAL', 'POOR');

-- CreateEnum
CREATE TYPE "DomainType" AS ENUM ('ECOMMERCE', 'SAAS', 'EDTECH', 'RETAIL', 'SERVICES', 'MANUFACTURING', 'HEALTHCARE', 'FINANCE');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('AUTO_ASSIGNED', 'MANUAL_REQUIRED', 'MANUALLY_SELECTED');

-- CreateEnum
CREATE TYPE "GovernanceStatus" AS ENUM ('AUTO', 'MANUAL', 'LOCKED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('PRIMARY_KEY', 'FOREIGN_KEY', 'LOOKUP');

-- CreateEnum
CREATE TYPE "DetectionMethod" AS ENUM ('NAME_MATCH', 'VALUE_OVERLAP', 'UNIQUENESS', 'AI_VALIDATED', 'COMPOSITE');

-- CreateEnum
CREATE TYPE "JoinCardinality" AS ENUM ('ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY');

-- CreateEnum
CREATE TYPE "AggregationFunction" AS ENUM ('SUM', 'COUNT', 'COUNT_DISTINCT', 'AVG', 'MIN', 'MAX');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" "SourceStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "colCount" INTEGER NOT NULL DEFAULT 0,
    "columns" TEXT[],
    "data" JSONB NOT NULL,
    "qualityScore" "QualityScore",
    "error" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColumnMeta" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "dataType" "DataType" NOT NULL,
    "nullPercent" DOUBLE PRECISION NOT NULL,
    "uniquePercent" DOUBLE PRECISION NOT NULL,
    "sampleValues" JSONB NOT NULL,

    CONSTRAINT "ColumnMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceAId" TEXT NOT NULL,
    "sourceBId" TEXT NOT NULL,
    "sourceAName" TEXT NOT NULL,
    "sourceBName" TEXT NOT NULL,
    "columnA" TEXT NOT NULL,
    "columnB" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "matchType" TEXT NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanedDataset" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "cleanedData" JSONB NOT NULL,
    "cleanedRowCount" INTEGER NOT NULL,
    "cleanedColCount" INTEGER NOT NULL,
    "cleanedColumns" TEXT[],
    "status" "CleaningStatus" NOT NULL,
    "error" TEXT,
    "cleanedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleanedDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "nullsFilled" INTEGER NOT NULL,
    "duplicatesRemoved" INTEGER NOT NULL,
    "datesNormalized" INTEGER NOT NULL,
    "currenciesNormalized" INTEGER NOT NULL,
    "textsStandardized" INTEGER NOT NULL,
    "emptyColumnsRemoved" INTEGER NOT NULL,
    "originalRowCount" INTEGER NOT NULL,
    "cleanedRowCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityIntelligence" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "overallGrade" "QualityGrade" NOT NULL,
    "completenessScore" DOUBLE PRECISION NOT NULL,
    "consistencyScore" DOUBLE PRECISION NOT NULL,
    "accuracyScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "healthyRecords" INTEGER NOT NULL,
    "riskyRecords" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColumnHealth" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "columnName" TEXT NOT NULL,
    "healthStatus" "HealthStatus" NOT NULL,
    "completeness" DOUBLE PRECISION NOT NULL,
    "consistency" DOUBLE PRECISION NOT NULL,
    "outlierCount" INTEGER NOT NULL,
    "uniqueness" DOUBLE PRECISION NOT NULL,
    "issues" TEXT[],

    CONSTRAINT "ColumnHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutlierRecord" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "columnName" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "value" JSONB NOT NULL,
    "detectionMethod" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "expectedRange" TEXT,

    CONSTRAINT "OutlierRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransformationAudit" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "transformationType" TEXT NOT NULL,
    "affectedColumn" TEXT,
    "affectedRowCount" INTEGER NOT NULL,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransformationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainDetection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "detectedDomain" "DomainType",
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "DomainStatus" NOT NULL,
    "scoringBreakdown" JSONB NOT NULL,
    "matchedColumns" TEXT[],
    "explanation" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainDetection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainGovernance" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "activeDomain" "DomainType",
    "governanceStatus" "GovernanceStatus" NOT NULL,
    "isLocked" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainGovernance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "previousDomain" "DomainType",
    "newDomain" "DomainType",
    "previousStatus" "GovernanceStatus" NOT NULL,
    "newStatus" "GovernanceStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIDomainReasoning" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ruleBasedDomain" "DomainType",
    "ruleBasedConfidence" DOUBLE PRECISION NOT NULL,
    "matchedColumns" TEXT[],
    "unmatchedColumns" TEXT[],
    "aiRecommendedDomain" "DomainType",
    "aiSemanticConfidence" DOUBLE PRECISION NOT NULL,
    "aiAlternativeDomain" "DomainType",
    "aiAlternativeConfidence" DOUBLE PRECISION NOT NULL,
    "aiReasoning" TEXT NOT NULL,
    "aiSemanticSignals" TEXT[],
    "aiColumnInsights" TEXT NOT NULL,
    "combinedConfidence" DOUBLE PRECISION NOT NULL,
    "finalDomain" "DomainType",
    "wasAutoAssigned" BOOLEAN NOT NULL,
    "ollamaModel" TEXT NOT NULL,
    "processingTimeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIDomainReasoning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIDiscovery" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "domain" "DomainType" NOT NULL,
    "totalKPIsAnalyzed" INTEGER NOT NULL,
    "computableKPIs" JSONB[],
    "partialKPIs" JSONB[],
    "availableColumns" TEXT[],
    "sampleData" JSONB,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIBlueprint" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'GENERAL',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPIBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedKPI" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "kpiLibraryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceTable" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovedKPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AggregationRule" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "function" "AggregationFunction" NOT NULL,
    "column" TEXT NOT NULL,

    CONSTRAINT "AggregationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupByDefinition" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "column" TEXT NOT NULL,

    CONSTRAINT "GroupByDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineageDefinition" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "tables" JSONB NOT NULL,
    "joins" JSONB NOT NULL,

    CONSTRAINT "LineageDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIBlueprintHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIBlueprintHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIKpiProposal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "AIKpiProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataLineage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entityGraph" JSONB NOT NULL,
    "kpiLineages" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataLineage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipRegistry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entries" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,

    CONSTRAINT "RelationshipRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPILineageRegistry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entries" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,

    CONSTRAINT "KPILineageRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "sidebarConfig" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CleanedDataset_sourceId_key" ON "CleanedDataset"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "CleaningLog_sourceId_key" ON "CleaningLog"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityIntelligence_sourceId_key" ON "QualityIntelligence"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainDetection_projectId_key" ON "DomainDetection"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainGovernance_projectId_key" ON "DomainGovernance"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AIDomainReasoning_projectId_key" ON "AIDomainReasoning"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "KPIDiscovery_projectId_key" ON "KPIDiscovery"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "KPIBlueprint_projectId_key" ON "KPIBlueprint"("projectId");

-- CreateIndex
CREATE INDEX "KPIBlueprint_projectId_idx" ON "KPIBlueprint"("projectId");

-- CreateIndex
CREATE INDEX "ApprovedKPI_blueprintId_idx" ON "ApprovedKPI"("blueprintId");

-- CreateIndex
CREATE INDEX "ApprovedKPI_kpiLibraryId_idx" ON "ApprovedKPI"("kpiLibraryId");

-- CreateIndex
CREATE INDEX "AggregationRule_kpiId_idx" ON "AggregationRule"("kpiId");

-- CreateIndex
CREATE INDEX "GroupByDefinition_kpiId_idx" ON "GroupByDefinition"("kpiId");

-- CreateIndex
CREATE UNIQUE INDEX "LineageDefinition_kpiId_key" ON "LineageDefinition"("kpiId");

-- CreateIndex
CREATE UNIQUE INDEX "DataLineage_projectId_key" ON "DataLineage"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "RelationshipRegistry_projectId_key" ON "RelationshipRegistry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "KPILineageRegistry_projectId_key" ON "KPILineageRegistry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardConfig_projectId_key" ON "DashboardConfig"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColumnMeta" ADD CONSTRAINT "ColumnMeta_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanedDataset" ADD CONSTRAINT "CleanedDataset_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningLog" ADD CONSTRAINT "CleaningLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIntelligence" ADD CONSTRAINT "QualityIntelligence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColumnHealth" ADD CONSTRAINT "ColumnHealth_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutlierRecord" ADD CONSTRAINT "OutlierRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransformationAudit" ADD CONSTRAINT "TransformationAudit_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainDetection" ADD CONSTRAINT "DomainDetection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainGovernance" ADD CONSTRAINT "DomainGovernance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainHistory" ADD CONSTRAINT "DomainHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDomainReasoning" ADD CONSTRAINT "AIDomainReasoning_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIDiscovery" ADD CONSTRAINT "KPIDiscovery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIBlueprint" ADD CONSTRAINT "KPIBlueprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedKPI" ADD CONSTRAINT "ApprovedKPI_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "KPIBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AggregationRule" ADD CONSTRAINT "AggregationRule_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "ApprovedKPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupByDefinition" ADD CONSTRAINT "GroupByDefinition_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "ApprovedKPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineageDefinition" ADD CONSTRAINT "LineageDefinition_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "ApprovedKPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIBlueprintHistory" ADD CONSTRAINT "KPIBlueprintHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIKpiProposal" ADD CONSTRAINT "AIKpiProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataLineage" ADD CONSTRAINT "DataLineage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipRegistry" ADD CONSTRAINT "RelationshipRegistry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPILineageRegistry" ADD CONSTRAINT "KPILineageRegistry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardConfig" ADD CONSTRAINT "DashboardConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
