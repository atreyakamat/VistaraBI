-- Migration: Multi-File Intelligence System Support
-- Description: Add relationships table and modify existing tables for multi-file support

-- ============================================
-- 1. ADD DOMAIN COLUMN TO PROJECTS TABLE
-- ============================================
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS domain TEXT;

-- ============================================
-- 2. CREATE RELATIONSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY DEFAULT ('rel_' || substring(md5(random()::text) from 1 for 16)),
    "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "fromTable" TEXT NOT NULL,
    "fromColumn" TEXT NOT NULL,
    "toTable" TEXT NOT NULL,
    "toColumn" TEXT NOT NULL,
    "matchRate" DECIMAL(5,2),
    status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'manual')),
    "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_relationships_projectId" ON relationships("projectId");
CREATE INDEX IF NOT EXISTS idx_relationships_status ON relationships(status);

-- ============================================
-- 3. ADD PROJECT_ID TO DOMAIN_DETECTION_JOBS
-- ============================================
ALTER TABLE domain_detection_jobs 
ADD COLUMN IF NOT EXISTS "projectIdOverride" TEXT REFERENCES projects(id);

-- Note: We keep projectId as is (from upload), add projectIdOverride for project-level detection

-- ============================================
-- 4. ADD VIEW_NAME TO SELECTED_KPIS
-- ============================================
ALTER TABLE selected_kpis 
ADD COLUMN IF NOT EXISTS "viewName" TEXT;

-- ============================================
-- 5. CREATE UNIFIED VIEWS TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS unified_views (
    id TEXT PRIMARY KEY DEFAULT ('view_' || substring(md5(random()::text) from 1 for 16)),
    "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "viewName" TEXT NOT NULL UNIQUE,
    "viewQuery" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_unified_views_projectId" ON unified_views("projectId");
CREATE INDEX IF NOT EXISTS "idx_unified_views_isActive" ON unified_views("isActive");

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
