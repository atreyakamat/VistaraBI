-- Add status column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Create index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
