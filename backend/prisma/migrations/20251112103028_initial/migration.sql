-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "tableName" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_rows" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_jobs" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "config" JSONB NOT NULL,
    "stats" JSONB,
    "cleanedTableName" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "cleaning_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaning_logs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "beforeStats" JSONB NOT NULL,
    "afterStats" JSONB NOT NULL,
    "config" JSONB NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaning_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cleaned_data" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "columns" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cleaned_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_rows_uploadId_idx" ON "data_rows"("uploadId");

-- CreateIndex
CREATE INDEX "cleaning_jobs_uploadId_idx" ON "cleaning_jobs"("uploadId");

-- CreateIndex
CREATE INDEX "cleaning_logs_jobId_idx" ON "cleaning_logs"("jobId");

-- CreateIndex
CREATE INDEX "cleaning_logs_uploadId_idx" ON "cleaning_logs"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "cleaned_data_tableName_key" ON "cleaned_data"("tableName");

-- AddForeignKey
ALTER TABLE "data_rows" ADD CONSTRAINT "data_rows_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_jobs" ADD CONSTRAINT "cleaning_jobs_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cleaning_logs" ADD CONSTRAINT "cleaning_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "cleaning_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
