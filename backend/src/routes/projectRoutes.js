import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import csvParser from 'csv-parser';
import { createReadStream } from 'fs';
import { parseExcel } from '../services/parsers/excelParser.js';
import { MultiFilePipeline } from '../services/multiFilePipeline.js';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to serialize BigInt values
const serializeBigInt = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const serialized = {};
    for (const key in obj) {
      serialized[key] = serializeBigInt(obj[key]);
    }
    return serialized;
  }
  
  return obj;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for multi-file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${ext}. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * POST /api/projects
 * Create a new project and upload multiple files
 */
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { name, description } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name: name || `Project ${new Date().toISOString().split('T')[0]}`,
        description: description || `Multi-file analysis with ${files.length} files`,
        fileCount: files.length,
        totalRecords: 0
      }
    });

    // Process each file
    const uploadResults = [];
    let totalRecords = 0;

    for (const file of files) {
      try {
        const fileExt = path.extname(file.originalname).toLowerCase();
        let recordCount = 0;
        let rows = [];

        // Parse file based on type
        if (fileExt === '.csv') {
          recordCount = await countCsvRecords(file.path);
          rows = await parseCsvFile(file.path);
        } else if (fileExt === '.xlsx' || fileExt === '.xls') {
          const { records } = await parseExcel(file.path);
          rows = records;
          recordCount = records.length;
        } else {
          throw new Error(`Unsupported file type: ${fileExt}`);
        }

        totalRecords += recordCount;

        // Create upload record
        const upload = await prisma.upload.create({
          data: {
            projectId: project.id,
            fileName: file.filename,
            originalName: file.originalname,
            fileType: fileExt,
            fileSize: BigInt(file.size),
            filePath: file.path,
            status: 'completed',
            totalRecords: recordCount,
            recordsProcessed: recordCount
          }
        });

        // Store rows in DataRow table
        const tableName = `upload_${upload.id.replace(/-/g, '_')}_${Date.now()}`;
        
        await prisma.dataRow.createMany({
          data: rows.map((row, index) => ({
            uploadId: upload.id,
            rowNumber: index + 1,
            data: row
          }))
        });

        // Update upload with table name
        await prisma.upload.update({
          where: { id: upload.id },
          data: { tableName }
        });

        uploadResults.push({
          uploadId: upload.id,
          fileName: file.originalname,
          records: recordCount,
          status: 'success'
        });

      } catch (error) {
        uploadResults.push({
          fileName: file.originalname,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Update project with total records
    await prisma.project.update({
      where: { id: project.id },
      data: { totalRecords }
    });

    res.json({
      success: true,
      data: serializeBigInt({
        projectId: project.id,
        projectName: project.name,
        fileCount: files.length,
        totalRecords,
        uploads: uploadResults
      })
    });

  } catch (error) {
    console.error('Project creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create project'
    });
  }
});

/**
 * GET /api/projects
 * List all projects
 */
router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        uploads: {
          select: {
            id: true,
            originalName: true,
            totalRecords: true,
            status: true
          }
        },
        _count: {
          select: {
            uploads: true,
            cleaningJobs: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: serializeBigInt(projects)
    });

  } catch (error) {
    console.error('Project list error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch projects'
    });
  }
});

/**
 * GET /api/projects/:projectId
 * Get project details
 */
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        uploads: true,
        cleaningJobs: {
          include: {
            upload: {
              select: {
                originalName: true
              }
            }
          }
        },
        domainJobs: true,
        kpiJobs: true
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: serializeBigInt(project)
    });

  } catch (error) {
    console.error('Project fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project'
    });
  }
});

/**
 * GET /api/projects/:projectId/columns
 * Get all available columns from project's uploads
 */
router.get('/:projectId/columns', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        uploads: {
          include: {
            dataRows: {
              take: 1 // Just need one row to get column names
            }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Collect unique columns from all uploads
    const allColumns = new Set();
    const columnsByUpload = [];

    for (const upload of project.uploads) {
      if (upload.dataRows && upload.dataRows.length > 0) {
        const columns = Object.keys(upload.dataRows[0].data || {});
        columns.forEach(col => allColumns.add(col));
        
        columnsByUpload.push({
          uploadId: upload.id,
          fileName: upload.originalName,
          columns: columns
        });
      }
    }

    res.json({
      success: true,
      data: {
        allColumns: Array.from(allColumns),
        columnsByUpload: columnsByUpload,
        totalColumns: allColumns.size
      }
    });

  } catch (error) {
    console.error('Failed to fetch columns:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch columns'
    });
  }
});

/**
 * DELETE /api/projects/:projectId
 * Delete a project and all its data
 */
router.delete('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Delete project (cascade will delete all related data)
    await prisma.project.delete({
      where: { id: projectId }
    });

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Project deletion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete project'
    });
  }
});

/**
 * POST /api/projects/:projectId/finalize
 * Finalize project and trigger multi-file intelligence pipeline
 */
router.post('/:projectId/finalize', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project exists and has uploads
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { uploads: true }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    if (!project.uploads || project.uploads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Project has no uploaded files'
      });
    }

    // Update project status to processing
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'processing' }
    });

    // Start multi-file pipeline (async)
    const pipeline = new MultiFilePipeline();
    pipeline.process(projectId).catch(err => {
      console.error('Pipeline error:', err);
    });

    res.json({
      success: true,
      data: {
        projectId,
        status: 'processing',
        message: 'Multi-file intelligence pipeline started'
      }
    });

  } catch (error) {
    console.error('Finalize error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to finalize project'
    });
  }
});

/**
 * POST /api/projects/:projectId/clean
 * Start cleaning pipeline for all files in project
 */
router.post('/:projectId/clean', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { config } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { uploads: true }
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Import cleaning service
    const cleaningServiceModule = await import('../services/cleaningService.js');
    const cleaningService = cleaningServiceModule.default;

    // Start cleaning jobs for all uploads (trigger asynchronously)
    const cleaningJobIds = [];
    
    // Respond immediately
    res.json({
      success: true,
      data: {
        projectId,
        message: `Starting cleaning for ${project.uploads.length} files`,
        fileCount: project.uploads.length
      }
    });

    // Process cleaning jobs asynchronously after response
    for (const upload of project.uploads) {
      try {
        const job = await cleaningService.startCleaning(upload.id, config || {});
        cleaningJobIds.push(job.id);
        console.log(`Started cleaning job ${job.id} for upload ${upload.originalName}`);
      } catch (err) {
        console.error(`Failed to start cleaning for upload ${upload.id}:`, err);
      }
    }

  } catch (error) {
    console.error('Cleaning start error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/projects/:projectId/cleaning-status
 * Get cleaning status for all files
 */
router.get('/:projectId/cleaning-status', async (req, res) => {
  try {
    const { projectId } = req.params;

    const jobs = await prisma.cleaningJob.findMany({
      where: { projectId },
      include: {
        upload: {
          select: {
            id: true,
            originalName: true,
            totalRecords: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: serializeBigInt(jobs)
    });

  } catch (error) {
    console.error('Cleaning status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/auto-complete
 * Auto-complete: Domain → Relationships → Unified View → KPIs → Dashboard (all in one)
 */
router.post('/:projectId/auto-complete', async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log(`[Auto-Complete] Starting for project ${projectId}`);

    // Step 1: Get project with cleaned data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        cleaningJobs: {
          where: { status: 'completed' },
          include: { upload: true }
        }
      }
    });

    if (!project || project.cleaningJobs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No cleaned data found. Please complete cleaning first.'
      });
    }

    // Step 2: Detect domain
    console.log(`[Auto-Complete] Detecting domain...`);
    const domainDetectionService = (await import('../services/domainDetectionService.js')).default;
    const cleaningJobIds = project.cleaningJobs.map(j => j.id);
    const domainResult = await domainDetectionService.detectProjectDomain(projectId, cleaningJobIds);
    
    await prisma.project.update({
      where: { id: projectId },
      data: { combinedDomain: domainResult.domain }
    });
    
    console.log(`[Auto-Complete] Domain detected: ${domainResult.domain}`);

    // Step 3: Detect relationships
    console.log(`[Auto-Complete] Detecting relationships...`);
    const { RelationshipDetector } = await import('../services/relationshipDetector.js');
    const detector = new RelationshipDetector();
    const relationships = await detector.detect(projectId);
    
    if (relationships.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No relationships detected. Files may not have matching ID columns.'
      });
    }
    
    console.log(`[Auto-Complete] Found ${relationships.length} relationships`);

    // Step 4: Create unified view
    console.log(`[Auto-Complete] Creating unified view...`);
    const { ViewGenerator } = await import('../services/viewGenerator.js');
    const generator = new ViewGenerator();
    const viewResult = await generator.generate(projectId, relationships);
    
    console.log(`[Auto-Complete] Unified view created: ${viewResult.viewName}`);

    // Step 5: Extract KPIs
    console.log(`[Auto-Complete] Extracting KPIs...`);
    const kpiExtractionService = (await import('../services/kpiExtractionService.js')).default;
    const kpiResult = await kpiExtractionService.extractKPIsFromView(
      viewResult.viewName,
      domainResult.domain,
      projectId,
      domainResult.domainJobId
    );
    
    console.log(`[Auto-Complete] Extracted ${kpiResult.feasibleCount} KPIs`);

    // Step 6: Generate dashboard
    console.log(`[Auto-Complete] Generating dashboard...`);
    const dashboardService = (await import('../services/dashboardGenerationService.js')).default;
    const dashboardResult = await dashboardService.generateForProject(projectId);
    
    console.log(`[Auto-Complete] Dashboard generated successfully!`);

    res.json({
      success: true,
      data: {
        domain: {
          detected: domainResult.domain,
          confidence: domainResult.confidence_score
        },
        relationships: {
          count: relationships.length,
          detected: relationships
        },
        view: viewResult,
        kpis: {
          kpiJobId: kpiResult.kpiJobId,
          feasibleCount: kpiResult.feasibleCount,
          totalKpisInLibrary: kpiResult.totalKpisInLibrary,
          autoSelectedCount: kpiResult.feasibleCount
        },
        dashboard: dashboardResult
      },
      message: 'Complete pipeline executed: Domain detected, relationships found, unified view created, KPIs extracted, and dashboard generated!'
    });

  } catch (error) {
    console.error('[Auto-Complete] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/detect-domain
 * Detect domain across all project files
 */
router.post('/:projectId/detect-domain', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        cleaningJobs: {
          where: { status: 'completed' },
          include: { upload: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (project.cleaningJobs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No cleaned data available. Please complete cleaning first.'
      });
    }

    // Import and use domain detection service
    const domainDetectionService = (await import('../services/domainDetectionService.js')).default;
    
    const cleaningJobIds = project.cleaningJobs.map(j => j.id);
    const domainResult = await domainDetectionService.detectProjectDomain(projectId, cleaningJobIds);

    // Update project with detected domain
    await prisma.project.update({
      where: { id: projectId },
      data: { combinedDomain: domainResult.domain }
    });

    res.json({
      success: true,
      data: serializeBigInt(domainResult)
    });

  } catch (error) {
    console.error('Domain detection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/detect-relationships
 * Detect relationships between tables
 */
router.post('/:projectId/detect-relationships', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { uploads: true }
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const { RelationshipDetector } = await import('../services/relationshipDetector.js');
    const detector = new RelationshipDetector();
    const relationships = await detector.detect(projectId);

    res.json({
      success: true,
      data: {
        projectId,
        relationships,
        count: relationships.length
      }
    });

  } catch (error) {
    console.error('Relationship detection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/create-unified-view
 * Create unified view from relationships, auto-extract KPIs, and generate dashboard
 */
router.post('/:projectId/create-unified-view', async (req, res) => {
  try {
    const { projectId } = req.params;

    const { ViewGenerator } = await import('../services/viewGenerator.js');
    const { RelationshipDetector } = await import('../services/relationshipDetector.js');
    
    const detector = new RelationshipDetector();
    
    // Check if relationships already exist
    let relationships = await detector.getValidRelationships(projectId);

    // If no relationships found, auto-detect them
    if (relationships.length === 0) {
      console.log(`[Unified View] No relationships found. Auto-detecting for project ${projectId}...`);
      relationships = await detector.detect(projectId);
      
      if (relationships.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid relationships found after detection. Please ensure uploaded files have matching ID columns.'
        });
      }
      
      console.log(`[Unified View] Auto-detected ${relationships.length} relationships`);
    }

    // Step 1: Generate unified view
    const generator = new ViewGenerator();
    
    // Convert database relationship format to ViewGenerator format
    const formattedRelationships = relationships.map(rel => ({
      sourceTable: rel.sourceTable || rel.fromTable,
      sourceColumn: rel.sourceColumn || rel.fromColumn,
      targetTable: rel.targetTable || rel.toTable,
      targetColumn: rel.targetColumn || rel.toColumn,
      matchRate: rel.matchRate
    }));
    
    const viewResult = await generator.generate(projectId, formattedRelationships);

    // Step 2: Auto-extract KPIs from the unified view
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        domainJobs: {
          where: { status: 'completed' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!project.domainJobs || project.domainJobs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No domain detection found. Please detect domain first.'
      });
    }

    const domainJob = project.domainJobs[0];
    const kpiExtractionService = (await import('../services/kpiExtractionService.js')).default;
    const kpiResult = await kpiExtractionService.extractKPIsFromView(
      viewResult.viewName,
      project.domain || domainJob.detectedDomain || 'retail',
      projectId,
      domainJob.id
    );

    console.log(`[Unified View] Auto-extracted ${kpiResult.feasibleCount} KPIs for project ${projectId}`);

    // Step 3: Auto-generate dashboard
    const dashboardService = (await import('../services/dashboardGenerationService.js')).default;
    const dashboardResult = await dashboardService.generateForProject(projectId);

    console.log(`[Unified View] Auto-generated dashboard for project ${projectId}`);

    // Return complete results
    res.json({
      success: true,
      data: {
        view: viewResult,
        relationships: {
          count: relationships.length,
          detected: formattedRelationships
        },
        kpis: {
          kpiJobId: kpiResult.kpiJobId,
          feasibleCount: kpiResult.feasibleCount,
          totalKpisInLibrary: kpiResult.totalKpisInLibrary,
          autoSelectedCount: kpiResult.feasibleCount // All feasible KPIs auto-selected
        },
        dashboard: dashboardResult
      },
      message: 'Unified view created, KPIs extracted, and dashboard generated successfully!'
    });

  } catch (error) {
    console.error('Unified view creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/extract-kpis
 * Extract KPIs from unified view
 */
router.post('/:projectId/extract-kpis', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        domainJobs: {
          where: { status: 'completed' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!project.domainJobs || project.domainJobs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No domain detection found. Please detect domain first.'
      });
    }

    // Get unified view
    const { pool } = await import('../config/database.js');
    const viewResult = await pool.query(
      `SELECT "viewName" FROM unified_views WHERE "projectId" = $1 LIMIT 1`,
      [projectId]
    );

    if (viewResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No unified view found. Please create unified view first.'
      });
    }

    const viewName = viewResult.rows[0].viewName;
    const domainJob = project.domainJobs[0];
    const kpiExtractionService = (await import('../services/kpiExtractionService.js')).default;

    const kpiResult = await kpiExtractionService.extractKPIsFromView(
      viewName,
      project.domain || domainJob.detectedDomain || 'general',
      projectId,
      domainJob.id
    );

    res.json({
      success: true,
      data: kpiResult
    });

  } catch (error) {
    console.error('KPI extraction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/projects/:projectId/generate-dashboard
 * Generate dashboard with visualizations
 */
router.post('/:projectId/generate-dashboard', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { kpiJobId } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const dashboardService = (await import('../services/dashboardGenerationService.js')).default;

    // Get KPI job or use project's selected KPIs
    const dashboardResult = await dashboardService.generateForProject(projectId);

    res.json({
      success: true,
      data: dashboardResult
    });

  } catch (error) {
    console.error('Dashboard generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/projects/:projectId/results
 * Get multi-file processing results (relationships, views, KPIs)
 */
router.get('/:projectId/results', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Get relationships
    const { pool } = await import('../config/database.js');
    const relationshipsResult = await pool.query(
      `SELECT * FROM relationships WHERE "projectId" = $1 ORDER BY "createdAt"`,
      [projectId]
    );

    // Get unified views
    const viewsResult = await pool.query(
      `SELECT * FROM unified_views WHERE "projectId" = $1 ORDER BY "createdAt"`,
      [projectId]
    );

    // Get selected KPIs
    const kpisResult = await pool.query(
      `SELECT * FROM selected_kpis WHERE "projectId" = $1 ORDER BY "createdAt"`,
      [projectId]
    );

    // Get dashboard
    const dashboardResult = await pool.query(
      `SELECT * FROM dashboards WHERE "projectId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      [projectId]
    );

    res.json({
      success: true,
      data: {
        project: serializeBigInt(project),
        relationships: relationshipsResult.rows,
        unifiedViews: viewsResult.rows,
        kpis: kpisResult.rows,
        dashboard: dashboardResult.rows[0] || null
      }
    });

  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch results'
    });
  }
});

/**
 * GET /api/projects/:projectId/dashboard
 * Get dashboard for a project
 */
router.get('/:projectId/dashboard', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get dashboard from database
    const dashboard = await prisma.dashboard.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found for this project'
      });
    }

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
async function countCsvRecords(filePath) {
  return new Promise((resolve, reject) => {
    let count = 0;
    createReadStream(filePath)
      .pipe(csvParser())
      .on('data', () => count++)
      .on('end', () => resolve(count))
      .on('error', reject);
  });
}

async function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

export default router;
