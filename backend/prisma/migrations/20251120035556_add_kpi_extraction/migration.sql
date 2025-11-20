-- CreateTable
CREATE TABLE "kpi_extraction_jobs" (
    "id" TEXT NOT NULL,
    "domainJobId" TEXT NOT NULL,
    "cleaningJobId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "totalKpisInLibrary" INTEGER NOT NULL,
    "feasibleCount" INTEGER NOT NULL,
    "infeasibleCount" INTEGER NOT NULL,
    "completenessAverage" DOUBLE PRECISION NOT NULL,
    "top10Kpis" JSONB NOT NULL,
    "allFeasibleKpis" JSONB NOT NULL,
    "unresolvedColumns" JSONB NOT NULL,
    "canonicalMapping" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_extraction_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selected_kpis" (
    "id" TEXT NOT NULL,
    "kpiJobId" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "requiredColumns" JSONB NOT NULL,
    "mappedColumns" JSONB NOT NULL,
    "priority" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selected_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kpi_extraction_jobs_domainJobId_idx" ON "kpi_extraction_jobs"("domainJobId");

-- CreateIndex
CREATE INDEX "kpi_extraction_jobs_cleaningJobId_idx" ON "kpi_extraction_jobs"("cleaningJobId");

-- CreateIndex
CREATE INDEX "selected_kpis_kpiJobId_idx" ON "selected_kpis"("kpiJobId");

-- AddForeignKey
ALTER TABLE "kpi_extraction_jobs" ADD CONSTRAINT "kpi_extraction_jobs_domainJobId_fkey" FOREIGN KEY ("domainJobId") REFERENCES "domain_detection_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selected_kpis" ADD CONSTRAINT "selected_kpis_kpiJobId_fkey" FOREIGN KEY ("kpiJobId") REFERENCES "kpi_extraction_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
