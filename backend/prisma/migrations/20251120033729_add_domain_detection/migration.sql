-- CreateTable
CREATE TABLE "domain_detection_jobs" (
    "id" TEXT NOT NULL,
    "cleaningJobId" TEXT NOT NULL,
    "detectedDomain" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "decision" TEXT NOT NULL,
    "primaryMatches" JSONB NOT NULL,
    "keywordMatches" JSONB NOT NULL,
    "allScores" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_detection_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "domain_detection_jobs_cleaningJobId_idx" ON "domain_detection_jobs"("cleaningJobId");

-- AddForeignKey
ALTER TABLE "domain_detection_jobs" ADD CONSTRAINT "domain_detection_jobs_cleaningJobId_fkey" FOREIGN KEY ("cleaningJobId") REFERENCES "cleaning_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
