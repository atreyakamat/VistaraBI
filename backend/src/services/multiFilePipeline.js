import { pool } from '../config/database.js';
// import domainDetectionService from './domainDetectionService.js';
import { RelationshipDetector } from './relationshipDetector.js';
import { ViewGenerator } from './viewGenerator.js';
// import kpiExtractionService from './kpiExtractionService.js';
// import { DashboardGenerator } from './dashboardGenerationService.js';

/**
 * MultiFilePipeline - Orchestrates multi-file intelligence processing
 * 
 * Pipeline stages:
 * 1. Project-level domain detection (aggregates all file columns)
 * 2. Relationship detection (finds FK relationships)
 * 3. Unified view generation (creates JOIN view)
 * 4. KPI extraction (from unified view)
 * 5. Dashboard generation (with cross-table charts)
 */
class MultiFilePipeline {
  
  constructor() {
    // this.domainDetector = new DomainDetector();
    this.relationshipDetector = new RelationshipDetector();
    this.viewGenerator = new ViewGenerator();
    // this.kpiExtractor = new KPIExtractor();
    // this.dashboardGenerator = new DashboardGenerator();
  }
  
  /**
   * Queue multi-file processing for a project
   */
  async queueProcessing(projectId) {
    // For now, process synchronously
    // In production, this would add to a queue (Bull, BullMQ, etc.)
    console.log(`[Multi-File Pipeline] Queuing processing for project ${projectId}`);
    
    // Process asynchronously but don't wait
    setImmediate(() => {
      this.process(projectId).catch(error => {
        console.error(`[Multi-File Pipeline] Processing failed for ${projectId}:`, error);
      });
    });
    
    return { projectId, status: 'queued' };
  }
  
  /**
   * Main processing pipeline
   */
  async process(projectId) {
    try {
      console.log(`\n========================================`);
      console.log(`[Multi-File Pipeline] Starting for project ${projectId}`);
      console.log(`========================================\n`);
      
      // Update project status
      await this.updateProjectStatus(projectId, 'processing');
      
      // Stage 1: Project-level domain detection (TODO: integrate with existing service)
      console.log('\n--- Stage 1: Domain Detection (Skipped for now) ---');
      const domainResult = { detected_domain: 'general', confidence: 50 };
      
      // Update project with detected domain
      await pool.query(
        `UPDATE projects SET domain = $1 WHERE id = $2`,
        [domainResult.detected_domain, projectId]
      );
      
      // Stage 2: Relationship detection
      console.log('\n--- Stage 2: Relationship Detection ---');
      const relationships = await this.relationshipDetector.detect(projectId);
      console.log(`Found ${relationships.length} valid relationships`);
      
      // Stage 3: Unified view generation
      console.log('\n--- Stage 3: Unified View Generation ---');
      const viewResult = await this.viewGenerator.generate(projectId, relationships);
      console.log(`View created: ${viewResult.viewName}`);
      
      // Stage 4: KPI extraction (TODO: integrate with existing service)
      console.log('\n--- Stage 4: KPI Extraction (Skipped for now) ---');
      const kpiResult = { feasibleCount: 0 };
      
      // Stage 5: Dashboard generation (TODO: integrate with existing service)
      console.log('\n--- Stage 5: Dashboard Generation (Skipped for now) ---');
      const dashboard = { componentCount: 0 };
      
      // Update project status to completed
      await this.updateProjectStatus(projectId, 'completed');
      
      console.log(`\n========================================`);
      console.log(`[Multi-File Pipeline] ✓ Completed successfully`);
      console.log(`========================================\n`);
      
      return {
        projectId,
        domain: domainResult.detected_domain,
        relationships: relationships.length,
        viewName: viewResult.viewName,
        kpis: kpiResult.feasibleCount,
        dashboardId: dashboard.id,
        status: 'completed'
      };
      
    } catch (error) {
      console.error(`[Multi-File Pipeline] Error:`, error);
      await this.updateProjectStatus(projectId, 'failed', error.message);
      throw error;
    }
  }
  
  /**
   * Stage 1: Detect domain across all project files
   */
  async detectDomain(projectId) {
    try {
      // Get all uploads
      const uploads = await pool.query(
        `SELECT * FROM uploads WHERE "projectId" = $1 AND status = 'completed'`,
        [projectId]
      );
      
      if (uploads.rows.length === 0) {
        throw new Error('No completed uploads found');
      }
      
      // Aggregate columns from all tables
      const allColumns = [];
      for (const upload of uploads.rows) {
        const cols = await this.getTableColumns(upload.tableName);
        allColumns.push(...cols.map(c => c.toLowerCase()));
      }
      
      // Remove duplicates
      const uniqueColumns = [...new Set(allColumns)];
      console.log(`Analyzing ${uniqueColumns.length} unique columns across ${uploads.rows.length} files`);
      
      // Detect domain using aggregated columns
      const detection = this.domainDetector.detectDomain(uniqueColumns);
      
      // Save detection result
      await pool.query(
        `INSERT INTO domain_detection_jobs (
          "projectId", "projectIdOverride", domain, confidence, 
          status, "detectedAt"
        ) VALUES ($1, $1, $2, $3, 'completed', NOW())`,
        [projectId, detection.detected_domain, detection.confidence]
      );
      
      return detection;
      
    } catch (error) {
      console.error('[Multi-File Pipeline] Domain detection error:', error);
      throw error;
    }
  }
  
  /**
   * Stage 4: Extract KPIs from unified view
   */
  async extractKPIs(projectId, domain, viewName) {
    try {
      // Check if view exists
      const viewCheck = await pool.query(
        `SELECT 1 FROM information_schema.views WHERE table_name = $1`,
        [viewName]
      );
      
      if (viewCheck.rows.length === 0) {
        // Use first table if no view
        const uploads = await pool.query(
          `SELECT "tableName" FROM uploads WHERE "projectId" = $1 AND status = 'completed' LIMIT 1`,
          [projectId]
        );
        viewName = uploads.rows[0]?.tableName || viewName;
      }
      
      // Get columns from view/table
      const columns = await this.getTableColumns(viewName);
      
      // Extract KPIs
      const result = await this.kpiExtractor.extractKPIs(viewName, domain, columns);
      
      // Create KPI extraction job record
      const jobResult = await pool.query(
        `INSERT INTO kpi_extraction_jobs (
          "projectId", domain, status, "completedAt"
        ) VALUES ($1, $2, 'completed', NOW())
        RETURNING id`,
        [projectId, domain]
      );
      
      const jobId = jobResult.rows[0].id;
      
      // Save selected KPIs
      for (const kpi of result.feasible.slice(0, 10)) {
        await pool.query(
          `INSERT INTO selected_kpis (
            "kpiExtractionJobId", "kpiId", name, formula, category,
            priority, "requiredColumns", "viewName"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            jobId,
            kpi.kpi_id,
            kpi.name,
            kpi.formula,
            kpi.category,
            kpi.priority,
            JSON.stringify(kpi.columns_needed),
            viewName
          ]
        );
      }
      
      return {
        feasibleCount: result.feasible.length,
        jobId
      };
      
    } catch (error) {
      console.error('[Multi-File Pipeline] KPI extraction error:', error);
      throw error;
    }
  }
  
  /**
   * Stage 5: Generate dashboard
   */
  async generateDashboard(projectId, viewName) {
    try {
      // Get KPI job
      const jobResult = await pool.query(
        `SELECT id FROM kpi_extraction_jobs 
         WHERE "projectId" = $1 
         ORDER BY "completedAt" DESC 
         LIMIT 1`,
        [projectId]
      );
      
      if (jobResult.rows.length === 0) {
        throw new Error('No KPI extraction job found');
      }
      
      const kpiJobId = jobResult.rows[0].id;
      
      // Generate dashboard
      const dashboard = await this.dashboardGenerator.generateDashboard(kpiJobId, {});
      
      return {
        id: dashboard.dashboardId,
        componentCount: dashboard.components?.length || 0
      };
      
    } catch (error) {
      console.error('[Multi-File Pipeline] Dashboard generation error:', error);
      throw error;
    }
  }
  
  /**
   * Helper: Get table columns
   */
  async getTableColumns(tableName) {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );
    return result.rows.map(r => r.column_name);
  }
  
  /**
   * Helper: Update project status
   */
  async updateProjectStatus(projectId, status, errorMessage = null) {
    await pool.query(
      `UPDATE projects 
       SET status = $1, "updatedAt" = NOW()
       WHERE id = $2`,
      [status, projectId]
    );
    
    if (errorMessage) {
      console.error(`[Multi-File Pipeline] Project ${projectId} failed: ${errorMessage}`);
    }
  }
}

export { MultiFilePipeline };
