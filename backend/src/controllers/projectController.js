const { pool } = require('../config/database');
const { MultiFilePipeline } = require('../services/multiFilePipeline');

const multiFilePipeline = new MultiFilePipeline();

exports.projectController = {
  
  /**
   * Create a new project
   * POST /api/v1/projects
   */
  async create(req, res) {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }
      
      // Generate project ID
      const projectId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      
      const query = `
        INSERT INTO projects (id, name, description, status, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'uploading', NOW(), NOW())
        RETURNING *
      `;
      
      const result = await pool.query(query, [projectId, name, description || null]);
      const project = result.rows[0];
      
      console.log(`[Project Controller] Created project: ${project.id}`);
      
      return res.status(201).json({
        projectId: project.id,
        name: project.name,
        status: project.status,
        message: 'Project created successfully. You can now upload files.'
      });
      
    } catch (error) {
      console.error('[Project Controller] Create error:', error);
      return res.status(500).json({ 
        error: 'Failed to create project',
        details: error.message 
      });
    }
  },
  
  /**
   * Get project details
   * GET /api/v1/projects/:id
   */
  async get(req, res) {
    try {
      const { id } = req.params;
      
      const query = 'SELECT * FROM projects WHERE id = $1';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const project = result.rows[0];
      
      // Get upload count
      const uploadsQuery = `
        SELECT COUNT(*) as count, 
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM uploads 
        WHERE "projectId" = $1
      `;
      const uploadsResult = await pool.query(uploadsQuery, [id]);
      const { count, completed } = uploadsResult.rows[0];
      
      return res.json({
        ...project,
        uploadCount: parseInt(count),
        completedUploads: parseInt(completed)
      });
      
    } catch (error) {
      console.error('[Project Controller] Get error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch project',
        details: error.message 
      });
    }
  },
  
  /**
   * List all uploads for a project
   * GET /api/v1/projects/:id/uploads
   */
  async listUploads(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT * FROM uploads
        WHERE "projectId" = $1
        ORDER BY "createdAt" ASC
      `;
      const result = await pool.query(query, [id]);
      
      return res.json({ 
        projectId: id,
        uploads: result.rows 
      });
      
    } catch (error) {
      console.error('[Project Controller] List uploads error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch uploads',
        details: error.message 
      });
    }
  },
  
  /**
   * Finalize project and trigger multi-file analysis
   * POST /api/v1/projects/:id/finalize
   */
  async finalize(req, res) {
    try {
      const { id } = req.params;
      
      // Check if project exists
      const projectQuery = 'SELECT * FROM projects WHERE id = $1';
      const projectResult = await pool.query(projectQuery, [id]);
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const project = projectResult.rows[0];
      
      if (project.status !== 'uploading') {
        return res.status(400).json({ 
          error: 'Project is not in uploading state',
          currentStatus: project.status 
        });
      }
      
      // Check if all uploads are completed
      const uploadsQuery = `
        SELECT status, COUNT(*) as count
        FROM uploads
        WHERE "projectId" = $1
        GROUP BY status
      `;
      const uploadsResult = await pool.query(uploadsQuery, [id]);
      
      const statusCounts = {};
      uploadsResult.rows.forEach(row => {
        statusCounts[row.status] = parseInt(row.count);
      });
      
      const totalUploads = Object.values(statusCounts).reduce((a, b) => a + b, 0);
      const completedUploads = statusCounts['completed'] || 0;
      
      if (totalUploads === 0) {
        return res.status(400).json({ error: 'No files uploaded to this project' });
      }
      
      if (completedUploads !== totalUploads) {
        return res.status(400).json({ 
          error: 'Not all files have been processed',
          completed: completedUploads,
          total: totalUploads
        });
      }
      
      // Update project status
      await pool.query(
        `UPDATE projects SET status = 'processing', "updatedAt" = NOW() WHERE id = $1`,
        [id]
      );
      
      // Queue multi-file processing
      console.log(`[Project Controller] Triggering multi-file pipeline for ${id}`);
      await multiFilePipeline.queueProcessing(id);
      
      return res.json({
        projectId: id,
        status: 'processing',
        message: 'Multi-file analysis started',
        filesProcessed: completedUploads
      });
      
    } catch (error) {
      console.error('[Project Controller] Finalize error:', error);
      return res.status(500).json({ 
        error: 'Failed to finalize project',
        details: error.message 
      });
    }
  },
  
  /**
   * Get project analysis results
   * GET /api/v1/projects/:id/results
   */
  async getResults(req, res) {
    try {
      const { id } = req.params;
      
      // Get project
      const project = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
      if (project.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get relationships
      const relationships = await pool.query(
        'SELECT * FROM relationships WHERE "projectId" = $1',
        [id]
      );
      
      // Get unified view
      const view = await pool.query(
        'SELECT * FROM unified_views WHERE "projectId" = $1 AND "isActive" = true LIMIT 1',
        [id]
      );
      
      // Get KPI job
      const kpiJob = await pool.query(
        'SELECT * FROM kpi_extraction_jobs WHERE "projectId" = $1 ORDER BY "completedAt" DESC LIMIT 1',
        [id]
      );
      
      // Get dashboard
      const dashboard = await pool.query(
        'SELECT * FROM dashboards WHERE "projectId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [id]
      );
      
      return res.json({
        project: project.rows[0],
        relationships: relationships.rows,
        unifiedView: view.rows[0] || null,
        kpiJob: kpiJob.rows[0] || null,
        dashboard: dashboard.rows[0] || null
      });
      
    } catch (error) {
      console.error('[Project Controller] Get results error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch results',
        details: error.message 
      });
    }
  }
};
