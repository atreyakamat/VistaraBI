-- Add Dashboard, Relationship, and UnifiedView tables

CREATE TABLE IF NOT EXISTS dashboards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  status TEXT DEFAULT 'active',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboards_project ON dashboards("projectId");

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL,
  "sourceTable" TEXT NOT NULL,
  "sourceColumn" TEXT NOT NULL,
  "targetTable" TEXT NOT NULL,
  "targetColumn" TEXT NOT NULL,
  "relationshipType" TEXT DEFAULT 'one-to-many',
  "matchRate" NUMERIC NOT NULL,
  status TEXT DEFAULT 'active',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationships_project ON relationships("projectId");

CREATE TABLE IF NOT EXISTS unified_views (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  "viewQuery" TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unified_views_project ON unified_views("projectId");
