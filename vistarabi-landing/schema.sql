--
-- PostgreSQL database dump
--

\restrict MN1MPQAFjboEz6DWrulEfRi4o7cJTPIm7EE5gyiLgZXpBKAUT7BOh968o7Sb1dy

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'WIN1252';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AggregationFunction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AggregationFunction" AS ENUM (
    'SUM',
    'COUNT',
    'COUNT_DISTINCT',
    'AVG',
    'MIN',
    'MAX'
);


ALTER TYPE public."AggregationFunction" OWNER TO postgres;

--
-- Name: BillingPlan; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BillingPlan" AS ENUM (
    'STARTER',
    'PRO',
    'GROWTH',
    'BUSINESS'
);


ALTER TYPE public."BillingPlan" OWNER TO postgres;

--
-- Name: CleaningStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CleaningStatus" AS ENUM (
    'CLEANING',
    'CLEANED',
    'FAILED'
);


ALTER TYPE public."CleaningStatus" OWNER TO postgres;

--
-- Name: DataType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DataType" AS ENUM (
    'TEXT',
    'NUMBER',
    'DATE',
    'BOOLEAN'
);


ALTER TYPE public."DataType" OWNER TO postgres;

--
-- Name: DetectionMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DetectionMethod" AS ENUM (
    'NAME_MATCH',
    'VALUE_OVERLAP',
    'UNIQUENESS',
    'AI_VALIDATED',
    'COMPOSITE'
);


ALTER TYPE public."DetectionMethod" OWNER TO postgres;

--
-- Name: DomainStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DomainStatus" AS ENUM (
    'AUTO_ASSIGNED',
    'MANUAL_REQUIRED',
    'MANUALLY_SELECTED'
);


ALTER TYPE public."DomainStatus" OWNER TO postgres;

--
-- Name: DomainType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DomainType" AS ENUM (
    'ECOMMERCE',
    'SAAS',
    'EDTECH',
    'RETAIL',
    'SERVICES',
    'MANUFACTURING',
    'HEALTHCARE',
    'FINANCE'
);


ALTER TYPE public."DomainType" OWNER TO postgres;

--
-- Name: GovernanceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."GovernanceStatus" AS ENUM (
    'AUTO',
    'MANUAL',
    'LOCKED'
);


ALTER TYPE public."GovernanceStatus" OWNER TO postgres;

--
-- Name: HealthStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."HealthStatus" AS ENUM (
    'GOOD',
    'PARTIAL',
    'POOR'
);


ALTER TYPE public."HealthStatus" OWNER TO postgres;

--
-- Name: JoinCardinality; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."JoinCardinality" AS ENUM (
    'ONE_TO_ONE',
    'ONE_TO_MANY',
    'MANY_TO_MANY'
);


ALTER TYPE public."JoinCardinality" OWNER TO postgres;

--
-- Name: QualityGrade; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."QualityGrade" AS ENUM (
    'A',
    'B',
    'C',
    'D',
    'F'
);


ALTER TYPE public."QualityGrade" OWNER TO postgres;

--
-- Name: QualityScore; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."QualityScore" AS ENUM (
    'GOOD',
    'PARTIAL',
    'POOR'
);


ALTER TYPE public."QualityScore" OWNER TO postgres;

--
-- Name: RelationshipType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RelationshipType" AS ENUM (
    'PRIMARY_KEY',
    'FOREIGN_KEY',
    'LOOKUP'
);


ALTER TYPE public."RelationshipType" OWNER TO postgres;

--
-- Name: RiskLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RiskLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public."RiskLevel" OWNER TO postgres;

--
-- Name: SourceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SourceStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'READY',
    'FAILED'
);


ALTER TYPE public."SourceStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AIDomainReasoning; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AIDomainReasoning" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "ruleBasedDomain" public."DomainType",
    "ruleBasedConfidence" double precision NOT NULL,
    "matchedColumns" text[],
    "unmatchedColumns" text[],
    "aiRecommendedDomain" public."DomainType",
    "aiSemanticConfidence" double precision NOT NULL,
    "aiAlternativeDomain" public."DomainType",
    "aiAlternativeConfidence" double precision NOT NULL,
    "aiReasoning" text NOT NULL,
    "aiSemanticSignals" text[],
    "aiColumnInsights" text NOT NULL,
    "combinedConfidence" double precision NOT NULL,
    "finalDomain" public."DomainType",
    "wasAutoAssigned" boolean NOT NULL,
    "ollamaModel" text NOT NULL,
    "processingTimeMs" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AIDomainReasoning" OWNER TO postgres;

--
-- Name: AIKpiProposal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AIKpiProposal" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "kpiName" text NOT NULL,
    formula text NOT NULL,
    rationale text NOT NULL,
    "confidenceScore" double precision NOT NULL,
    "proposedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text NOT NULL,
    metadata jsonb,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedBy" text
);


ALTER TABLE public."AIKpiProposal" OWNER TO postgres;

--
-- Name: AggregationRule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AggregationRule" (
    id text NOT NULL,
    "kpiId" text NOT NULL,
    function public."AggregationFunction" NOT NULL,
    "column" text NOT NULL
);


ALTER TABLE public."AggregationRule" OWNER TO postgres;

--
-- Name: ApprovedKPI; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ApprovedKPI" (
    id text NOT NULL,
    "blueprintId" text NOT NULL,
    "kpiLibraryId" text,
    name text NOT NULL,
    description text,
    "sourceTable" text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    unit text
);


ALTER TABLE public."ApprovedKPI" OWNER TO postgres;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    "userId" text,
    "intentId" text NOT NULL,
    "rawUserQuery" text NOT NULL,
    "normalizedUserQuery" text NOT NULL,
    "llmRawOutput" text,
    "validationStagesPassed" integer DEFAULT 0 NOT NULL,
    "validationFailedAt" text,
    "structuredCommand" jsonb,
    "executionStatus" text NOT NULL,
    "errorCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: CleanedDataset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CleanedDataset" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "cleanedData" jsonb NOT NULL,
    "cleanedRowCount" integer NOT NULL,
    "cleanedColCount" integer NOT NULL,
    "cleanedColumns" text[],
    status public."CleaningStatus" NOT NULL,
    error text,
    "cleanedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CleanedDataset" OWNER TO postgres;

--
-- Name: CleaningLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CleaningLog" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "nullsFilled" integer NOT NULL,
    "duplicatesRemoved" integer NOT NULL,
    "datesNormalized" integer NOT NULL,
    "currenciesNormalized" integer NOT NULL,
    "textsStandardized" integer NOT NULL,
    "emptyColumnsRemoved" integer NOT NULL,
    "originalRowCount" integer NOT NULL,
    "cleanedRowCount" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CleaningLog" OWNER TO postgres;

--
-- Name: ColumnHealth; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ColumnHealth" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "columnName" text NOT NULL,
    "healthStatus" public."HealthStatus" NOT NULL,
    completeness double precision NOT NULL,
    consistency double precision NOT NULL,
    "outlierCount" integer NOT NULL,
    uniqueness double precision NOT NULL,
    issues text[]
);


ALTER TABLE public."ColumnHealth" OWNER TO postgres;

--
-- Name: ColumnMeta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ColumnMeta" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "originalName" text NOT NULL,
    "normalizedName" text NOT NULL,
    "dataType" public."DataType" NOT NULL,
    "nullPercent" double precision NOT NULL,
    "uniquePercent" double precision NOT NULL,
    "sampleValues" jsonb NOT NULL
);


ALTER TABLE public."ColumnMeta" OWNER TO postgres;

--
-- Name: DashboardCard; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DashboardCard" (
    id text NOT NULL,
    "stateId" text NOT NULL,
    "kpiId" text NOT NULL,
    "kpiName" text NOT NULL,
    "chartType" text NOT NULL,
    "cardSize" text DEFAULT 'md'::text NOT NULL,
    "position" integer NOT NULL,
    "colSpan" integer DEFAULT 1 NOT NULL,
    "rowSpan" integer DEFAULT 1 NOT NULL,
    "groupBy" text,
    "filterOverrides" jsonb NOT NULL,
    "comparisonMode" text,
    "isPinned" boolean DEFAULT false NOT NULL,
    "isAIGenerated" boolean DEFAULT false NOT NULL,
    "isDrillDown" boolean DEFAULT false NOT NULL,
    "parentCardId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DashboardCard" OWNER TO postgres;

--
-- Name: DashboardConfig; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DashboardConfig" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    sections jsonb NOT NULL,
    "sidebarConfig" jsonb NOT NULL,
    metadata jsonb NOT NULL,
    version integer NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DashboardConfig" OWNER TO postgres;

--
-- Name: DashboardState; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DashboardState" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    domain text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "globalFilters" jsonb NOT NULL,
    granularity text DEFAULT 'monthly'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DashboardState" OWNER TO postgres;

--
-- Name: DataLineage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DataLineage" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "entityGraph" jsonb NOT NULL,
    "kpiLineages" jsonb NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DataLineage" OWNER TO postgres;

--
-- Name: DomainDetection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DomainDetection" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "detectedDomain" public."DomainType",
    confidence double precision NOT NULL,
    status public."DomainStatus" NOT NULL,
    "scoringBreakdown" jsonb NOT NULL,
    "matchedColumns" text[],
    explanation text NOT NULL,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DomainDetection" OWNER TO postgres;

--
-- Name: DomainGovernance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DomainGovernance" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "activeDomain" public."DomainType",
    "governanceStatus" public."GovernanceStatus" NOT NULL,
    "isLocked" boolean NOT NULL,
    version integer NOT NULL,
    "changedBy" text NOT NULL,
    "changeReason" text NOT NULL,
    "lastUpdated" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DomainGovernance" OWNER TO postgres;

--
-- Name: DomainHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DomainHistory" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    version integer NOT NULL,
    "previousDomain" public."DomainType",
    "newDomain" public."DomainType",
    "previousStatus" public."GovernanceStatus" NOT NULL,
    "newStatus" public."GovernanceStatus" NOT NULL,
    "changedBy" text NOT NULL,
    "changeReason" text NOT NULL,
    confidence double precision NOT NULL,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DomainHistory" OWNER TO postgres;

--
-- Name: GroupByDefinition; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GroupByDefinition" (
    id text NOT NULL,
    "kpiId" text NOT NULL,
    "column" text NOT NULL
);


ALTER TABLE public."GroupByDefinition" OWNER TO postgres;

--
-- Name: KPIBlueprint; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."KPIBlueprint" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    domain text DEFAULT 'GENERAL'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "lockedAt" timestamp(3) without time zone,
    "lockedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."KPIBlueprint" OWNER TO postgres;

--
-- Name: KPIBlueprintHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."KPIBlueprintHistory" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    version integer NOT NULL,
    action text NOT NULL,
    "kpiId" text NOT NULL,
    "kpiName" text NOT NULL,
    "changedBy" text NOT NULL,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."KPIBlueprintHistory" OWNER TO postgres;

--
-- Name: KPIDiscovery; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."KPIDiscovery" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    domain public."DomainType" NOT NULL,
    "totalKPIsAnalyzed" integer NOT NULL,
    "computableKPIs" jsonb[],
    "partialKPIs" jsonb[],
    "availableColumns" text[],
    "sampleData" jsonb,
    "discoveredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."KPIDiscovery" OWNER TO postgres;

--
-- Name: KPILineageRegistry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."KPILineageRegistry" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    entries jsonb NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer NOT NULL,
    stats jsonb NOT NULL
);


ALTER TABLE public."KPILineageRegistry" OWNER TO postgres;

--
-- Name: LineageDefinition; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LineageDefinition" (
    id text NOT NULL,
    "kpiId" text NOT NULL,
    formula text NOT NULL,
    tables jsonb NOT NULL,
    joins jsonb NOT NULL
);


ALTER TABLE public."LineageDefinition" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: OutlierRecord; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OutlierRecord" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "columnName" text NOT NULL,
    "rowIndex" integer NOT NULL,
    value jsonb NOT NULL,
    "detectionMethod" text NOT NULL,
    severity text NOT NULL,
    "expectedRange" text
);


ALTER TABLE public."OutlierRecord" OWNER TO postgres;

--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PasswordResetToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."PasswordResetToken" OWNER TO postgres;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "shareToken" text,
    "shareTokenExpiresAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Project" OWNER TO postgres;

--
-- Name: ProjectGoal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProjectGoal" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "rawQuery" text NOT NULL,
    "targetKpiId" text,
    "targetValue" text NOT NULL,
    timeframe text NOT NULL,
    "generatedPlan" jsonb NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProjectGoal" OWNER TO postgres;

--
-- Name: QualityIntelligence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."QualityIntelligence" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "overallGrade" public."QualityGrade" NOT NULL,
    "completenessScore" double precision NOT NULL,
    "consistencyScore" double precision NOT NULL,
    "accuracyScore" double precision NOT NULL,
    "riskLevel" public."RiskLevel" NOT NULL,
    "totalRecords" integer NOT NULL,
    "healthyRecords" integer NOT NULL,
    "riskyRecords" integer NOT NULL,
    "calculatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."QualityIntelligence" OWNER TO postgres;

--
-- Name: Relationship; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Relationship" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "sourceAId" text NOT NULL,
    "sourceBId" text NOT NULL,
    "sourceAName" text NOT NULL,
    "sourceBName" text NOT NULL,
    "columnA" text NOT NULL,
    "columnB" text NOT NULL,
    confidence double precision NOT NULL,
    "matchType" text NOT NULL
);


ALTER TABLE public."Relationship" OWNER TO postgres;

--
-- Name: RelationshipRegistry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RelationshipRegistry" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    entries jsonb NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer NOT NULL
);


ALTER TABLE public."RelationshipRegistry" OWNER TO postgres;

--
-- Name: Source; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Source" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "fileName" text NOT NULL,
    "fileType" text NOT NULL,
    status public."SourceStatus" DEFAULT 'PENDING'::public."SourceStatus" NOT NULL,
    "rowCount" integer DEFAULT 0 NOT NULL,
    "colCount" integer DEFAULT 0 NOT NULL,
    columns text[],
    data jsonb NOT NULL,
    "qualityScore" public."QualityScore",
    error text,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Source" OWNER TO postgres;

--
-- Name: TransformationAudit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TransformationAudit" (
    id text NOT NULL,
    "sourceId" text NOT NULL,
    "transformationType" text NOT NULL,
    "affectedColumn" text,
    "affectedRowCount" integer NOT NULL,
    "beforeValue" text,
    "afterValue" text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TransformationAudit" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "emailVerified" timestamp(3) without time zone,
    "emailVerifyToken" text,
    plan public."BillingPlan" DEFAULT 'STARTER'::public."BillingPlan" NOT NULL,
    "stripeCustomerId" text,
    "stripeSubscriptionId" text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: AIDomainReasoning AIDomainReasoning_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AIDomainReasoning"
    ADD CONSTRAINT "AIDomainReasoning_pkey" PRIMARY KEY (id);


--
-- Name: AIKpiProposal AIKpiProposal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AIKpiProposal"
    ADD CONSTRAINT "AIKpiProposal_pkey" PRIMARY KEY (id);


--
-- Name: AggregationRule AggregationRule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AggregationRule"
    ADD CONSTRAINT "AggregationRule_pkey" PRIMARY KEY (id);


--
-- Name: ApprovedKPI ApprovedKPI_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ApprovedKPI"
    ADD CONSTRAINT "ApprovedKPI_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: CleanedDataset CleanedDataset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CleanedDataset"
    ADD CONSTRAINT "CleanedDataset_pkey" PRIMARY KEY (id);


--
-- Name: CleaningLog CleaningLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CleaningLog"
    ADD CONSTRAINT "CleaningLog_pkey" PRIMARY KEY (id);


--
-- Name: ColumnHealth ColumnHealth_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ColumnHealth"
    ADD CONSTRAINT "ColumnHealth_pkey" PRIMARY KEY (id);


--
-- Name: ColumnMeta ColumnMeta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ColumnMeta"
    ADD CONSTRAINT "ColumnMeta_pkey" PRIMARY KEY (id);


--
-- Name: DashboardCard DashboardCard_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DashboardCard"
    ADD CONSTRAINT "DashboardCard_pkey" PRIMARY KEY (id);


--
-- Name: DashboardConfig DashboardConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DashboardConfig"
    ADD CONSTRAINT "DashboardConfig_pkey" PRIMARY KEY (id);


--
-- Name: DashboardState DashboardState_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DashboardState"
    ADD CONSTRAINT "DashboardState_pkey" PRIMARY KEY (id);


--
-- Name: DataLineage DataLineage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DataLineage"
    ADD CONSTRAINT "DataLineage_pkey" PRIMARY KEY (id);


--
-- Name: DomainDetection DomainDetection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DomainDetection"
    ADD CONSTRAINT "DomainDetection_pkey" PRIMARY KEY (id);


--
-- Name: DomainGovernance DomainGovernance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DomainGovernance"
    ADD CONSTRAINT "DomainGovernance_pkey" PRIMARY KEY (id);


--
-- Name: DomainHistory DomainHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DomainHistory"
    ADD CONSTRAINT "DomainHistory_pkey" PRIMARY KEY (id);


--
-- Name: GroupByDefinition GroupByDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GroupByDefinition"
    ADD CONSTRAINT "GroupByDefinition_pkey" PRIMARY KEY (id);


--
-- Name: KPIBlueprintHistory KPIBlueprintHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KPIBlueprintHistory"
    ADD CONSTRAINT "KPIBlueprintHistory_pkey" PRIMARY KEY (id);


--
-- Name: KPIBlueprint KPIBlueprint_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KPIBlueprint"
    ADD CONSTRAINT "KPIBlueprint_pkey" PRIMARY KEY (id);


--
-- Name: KPIDiscovery KPIDiscovery_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KPIDiscovery"
    ADD CONSTRAINT "KPIDiscovery_pkey" PRIMARY KEY (id);


--
-- Name: KPILineageRegistry KPILineageRegistry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KPILineageRegistry"
    ADD CONSTRAINT "KPILineageRegistry_pkey" PRIMARY KEY (id);


--
-- Name: LineageDefinition LineageDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LineageDefinition"
    ADD CONSTRAINT "LineageDefinition_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: OutlierRecord OutlierRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OutlierRecord"
    ADD CONSTRAINT "OutlierRecord_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- Name: ProjectGoal ProjectGoal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectGoal"
    ADD CONSTRAINT "ProjectGoal_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: QualityIntelligence QualityIntelligence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."QualityIntelligence"
    ADD CONSTRAINT "QualityIntelligence_pkey" PRIMARY KEY (id);


--
-- Name: RelationshipRegistry RelationshipRegistry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RelationshipRegistry"
    ADD CONSTRAINT "RelationshipRegistry_pkey" PRIMARY KEY (id);


--
-- Name: Relationship Relationship_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Relationship"
    ADD CONSTRAINT "Relationship_pkey" PRIMARY KEY (id);


--
-- Name: Source Source_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Source"
    ADD CONSTRAINT "Source_pkey" PRIMARY KEY (id);


--
-- Name: TransformationAudit TransformationAudit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransformationAudit"
    ADD CONSTRAINT "TransformationAudit_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AIDomainReasoning_projectId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AIDomainReasoning_projectId_key" ON public."AIDomainReasoning" USING btree ("projectId");


--
-- Name: AggregationRule_kpiId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AggregationRule_kpiId_idx" ON public."AggregationRule" USING btree ("kpiId");


--
-- Name: ApprovedKPI_blueprintId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ApprovedKPI_blueprintId_idx" ON public."ApprovedKPI" USING btree ("blueprintId");


--
-- Name: ApprovedKPI_kpiLibraryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ApprovedKPI_kpiLibraryId_idx" ON public."ApprovedKPI" USING btree ("kpiLibraryId");


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_intentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_intentId_idx" ON public."AuditLog" USING btree ("intentId");


--
-- Name: AuditLog_intentId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AuditLog_intentId_key" ON public."AuditLog" USING btree ("intentId");


--
-- Name: AuditLog_sessionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_sessionId_idx" ON public."AuditLog" USING btree ("sessionId");


--
-- Name: CleanedDataset_sourceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CleanedDataset_sourceId_key" ON public."CleanedDataset" USING btree ("sourceId");


--
-- Name: CleaningLog_sourceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CleaningLog_sourceId_key" ON public."CleaningLog" USING btree ("sourceId");


--
-- Name: DashboardCard_kpiId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DashboardCard_kpiId_idx" ON public."DashboardCard" USING btree ("kpiId");


--
-- Name: DashboardCard_stateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DashboardCard_stateId_idx" ON public."DashboardCard" USING btree ("stateId");


--
-- Name: DashboardConfig_projectId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DashboardConfig_projectId_key" ON public."DashboardConfig" USING btree ("projectId");


--
-- Name: DashboardState_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DashboardState_projectId_idx" ON public."DashboardState" USING btree ("projectId");


--
-- Name: DashboardState_projectId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DashboardState_projectId_key" ON public."DashboardState" USING btree ("projectId");


--
-- Name: DataLineage_projectId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DataLineage_projectId_key" ON public."DataLineage" USING btree ("projectId");


--
-- Name: DomainDetection_projectId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DomainDetection_projectId_key" ON public."DomainDetection" USING btree ("projectId");


--
-- Name: DomainGovernance_projectId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DomainGovernance_projectId_key" ON public."DomainGovernance" USING btree ("projectId");


--
-- Name: GroupByDefinition_kpiId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GroupByDefinition_kpiId_idx" ON public."GroupByDefinition" USING btree ("kpiId");


--
-- Name: KPIBlueprint_projectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "KPIBlueprint_projectId_idx" ON public."KPIBlueprint" USING btree ("projectId");


--
-- Name: KPIBlueprint_projectId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "KPIBlueprint_projectId_key" ON public."KPIBlueprint" USING btree ("projectId");


--
-- Name: KPIDiscovery_projectId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "KPIDiscovery_projectId_key" ON public."KPIDiscovery" USING btree ("projectId");


--
-- Name: KPILineageRegistry_projectId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "KPILineageRegistry_projectId_key" ON public."KPILineageRegistry" USING btree ("projectId");


--
-- Name: LineageDefinition_kpiId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "LineageDefinition_kpiId_key" ON public."LineageDefinition" USING btree ("kpiId");


--
-- Name: Notification_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_createdAt_idx" ON public."Notification" USING btree ("createdAt");


--
-- Name: Notification_userId_read_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_userId_read_idx" ON public."Notification" USING btree ("userId", read);


--
-- Name: PasswordResetToken_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PasswordResetToken_token_idx" ON public."PasswordResetToken" USING btree (token);


--
-- Name: PasswordResetToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON public."PasswordResetToken" USING btree (token);


--
-- Name: PasswordResetToken_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON public."PasswordResetToken" USING btree ("userId");


--
-- Name: Project_shareToken_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Project_shareToken_idx" ON public."Project" USING btree ("shareToken");


--
-- Name: Project_shareToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Project_shareToken_key" ON public."Project" USING btree ("shareToken");


--
-- Name: Project_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Project_userId_idx" ON public."Project" USING btree ("userId");


--
-- Name: QualityIntelligence_sourceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "QualityIntelligence_sourceId_key" ON public."QualityIntelligence" USING btree ("sourceId");


--
-- Name: RelationshipRegistry_projectId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RelationshipRegistry_projectId_key" ON public."RelationshipRegistry" USING btree ("projectId");


--
-- Name: Source_projectId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Source_projectId_status_idx" ON public."Source" USING btree ("projectId", status);


--
-- Name: User_emailVerifyToken_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_emailVerifyToken_idx" ON public."User" USING btree ("emailVerifyToken");


--
-- Name: User_emailVerifyToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_emailVerifyToken_key" ON public."User" USING btree ("emailVerifyToken");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_stripeCustomerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_stripeCustomerId_idx" ON public."User" USING btree ("stripeCustomerId");


--
-- Name: User_stripeCustomerId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON public."User" USING btree ("stripeCustomerId");


--
-- Name: AIDomainReasoning AIDomainReasoning_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AIDomainReasoning"
    ADD CONSTRAINT "AIDomainReasoning_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AIKpiProposal AIKpiProposal_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AIKpiProposal"
    ADD CONSTRAINT "AIKpiProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AggregationRule AggregationRule_kpiId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AggregationRule"
    ADD CONSTRAINT "AggregationRule_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES public."ApprovedKPI"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApprovedKPI ApprovedKPI_blueprintId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ApprovedKPI"
    ADD CONSTRAINT "ApprovedKPI_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES public."KPIBlueprint"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CleanedDataset CleanedDataset_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CleanedDataset"
    ADD CONSTRAINT "CleanedDataset_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."Source"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CleaningLog CleaningLog_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CleaningLog"
    ADD CONSTRAINT "CleaningLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."Source"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ColumnHealth ColumnHealth_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ColumnHealth"
    ADD CONSTRAINT "ColumnHealth_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."Source"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ColumnMeta ColumnMeta_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ColumnMeta"
    ADD CONSTRAINT "ColumnMeta_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."Source"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DashboardCard DashboardCard_stateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DashboardCard"
    ADD CONSTRAINT "DashboardCard_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES public."DashboardState"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DashboardConfig DashboardConfig_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DashboardConfig"
    ADD CONSTRAINT "DashboardConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DashboardState DashboardState_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DashboardState"
    ADD CONSTRAINT "DashboardState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DataLineage DataLineage_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DataLineage"
    ADD CONSTRAINT "DataLineage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DomainDetection DomainDetection_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DomainDetection"
    ADD CONSTRAINT "DomainDetection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DomainGovernance DomainGovernance_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DomainGovernance"
    ADD CONSTRAINT "DomainGovernance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DomainHistory DomainHistory_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DomainHistory"
    ADD CONSTRAINT "DomainHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GroupByDefinition GroupByDefinition_kpiId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GroupByDefinition"
    ADD CONSTRAINT "GroupByDefinition_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES public."ApprovedKPI"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KPIBlueprintHistory KPIBlueprintHistory_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KPIBlueprintHistory"
    ADD CONSTRAINT "KPIBlueprintHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KPIBlueprint KPIBlueprint_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KPIBlueprint"
    ADD CONSTRAINT "KPIBlueprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KPIDiscovery KPIDiscovery_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KPIDiscovery"
    ADD CONSTRAINT "KPIDiscovery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: KPILineageRegistry KPILineageRegistry_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."KPILineageRegistry"
    ADD CONSTRAINT "KPILineageRegistry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LineageDefinition LineageDefinition_kpiId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LineageDefinition"
    ADD CONSTRAINT "LineageDefinition_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES public."ApprovedKPI"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OutlierRecord OutlierRecord_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OutlierRecord"
    ADD CONSTRAINT "OutlierRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."Source"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PasswordResetToken PasswordResetToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectGoal ProjectGoal_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectGoal"
    ADD CONSTRAINT "ProjectGoal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Project Project_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: QualityIntelligence QualityIntelligence_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."QualityIntelligence"
    ADD CONSTRAINT "QualityIntelligence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."Source"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RelationshipRegistry RelationshipRegistry_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RelationshipRegistry"
    ADD CONSTRAINT "RelationshipRegistry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Relationship Relationship_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Relationship"
    ADD CONSTRAINT "Relationship_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Source Source_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Source"
    ADD CONSTRAINT "Source_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TransformationAudit TransformationAudit_sourceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TransformationAudit"
    ADD CONSTRAINT "TransformationAudit_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES public."Source"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict MN1MPQAFjboEz6DWrulEfRi4o7cJTPIm7EE5gyiLgZXpBKAUT7BOh968o7Sb1dy

