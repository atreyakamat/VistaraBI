import { pool } from '../config/database.js';

/**
 * ViewGenerator - Creates unified views by materializing JOIN data from data_rows
 * 
 * Works with JSON data stored in data_rows table, not database tables
 * Creates a materialized table with joined data for KPI extraction
 */
class ViewGenerator {
  
  /**
   * Generate unified view for a project
   */
  async generate(projectId, relationships) {
    try {
      console.log(`[View Generator] Creating unified view for project ${projectId}`);
      
      const uploads = await this.getProjectUploads(projectId);
      
      if (uploads.length === 0) {
        throw new Error('No uploads found for project');
      }
      
      const viewName = `project_${projectId.replace(/-/g, '_')}_unified`;
      
      if (uploads.length === 1) {
        // Single table - just create view from JSON data
        console.log('[View Generator] Single table, creating simple view');
        await this.createSingleTableView(viewName, uploads[0]);
        await this.saveViewRecord(projectId, viewName, 'single_table', true);
        
        return {
          viewName,
          isView: true,
          uploadCount: 1
        };
      }
      
      // Multiple tables - join and materialize
      console.log(`[View Generator] Multiple tables (${uploads.length}), creating joined view`);
      await this.createJoinedView(viewName, uploads, relationships);
      await this.saveViewRecord(projectId, viewName, 'joined_tables', true);
      
      console.log(`[View Generator] ✓ View created successfully: ${viewName}`);
      
      return {
        viewName,
        isView: true,
        uploadCount: uploads.length,
        relationshipCount: relationships.length
      };
      
    } catch (error) {
      console.error('[View Generator] Error:', error);
      throw error;
    }
  }
  
  /**
   * Create view from single table's JSON data
   */
  async createSingleTableView(viewName, upload) {
    try {
      // Drop existing table/view
      await pool.query(`DROP TABLE IF EXISTS "${viewName}" CASCADE`);
      
      // Get all data rows
      const dataQuery = `SELECT data FROM data_rows WHERE "uploadId" = $1`;
      const result = await pool.query(dataQuery, [upload.id]);
      
      if (result.rows.length === 0) {
        throw new Error(`No data found for upload ${upload.id}`);
      }
      
      const rows = result.rows.map(r => r.data);
      
      // Get all unique columns
      const allColumns = new Set();
      rows.forEach(row => {
        Object.keys(row).forEach(col => allColumns.add(col));
      });
      
      const columns = Array.from(allColumns);
      
      // Create table with TEXT columns
      const columnDefs = columns.map(col => `"${col}" TEXT`).join(', ');
      const createTableQuery = `CREATE TABLE "${viewName}" (${columnDefs})`;
      
      await pool.query(createTableQuery);
      console.log(`[View Generator] Created table ${viewName} with ${columns.length} columns`);
      
      // Insert all rows
      for (const row of rows) {
        const values = columns.map(col => row[col] ?? null);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const columnNames = columns.map(col => `"${col}"`).join(', ');
        
        const insertQuery = `INSERT INTO "${viewName}" (${columnNames}) VALUES (${placeholders})`;
        await pool.query(insertQuery, values);
      }
      
      console.log(`[View Generator] Inserted ${rows.length} rows into ${viewName}`);
      
    } catch (error) {
      console.error('[View Generator] Error creating single table view:', error);
      throw error;
    }
  }
  
  /**
   * Create view by joining multiple tables' JSON data
   */
  async createJoinedView(viewName, uploads, relationships) {
    try {
      // Drop existing table/view
      await pool.query(`DROP TABLE IF EXISTS "${viewName}" CASCADE`);
      
      // Load all data into memory
      const uploadData = {};
      for (const upload of uploads) {
        const dataQuery = `SELECT data FROM data_rows WHERE "uploadId" = $1`;
        const result = await pool.query(dataQuery, [upload.id]);
        uploadData[upload.id] = {
          upload,
          rows: result.rows.map(r => r.data)
        };
      }
      
      // Perform JOINs in JavaScript
      const primaryUpload = uploads[0]; // Use first upload as primary
      const primaryData = uploadData[primaryUpload.id].rows;
      
      console.log(`[View Generator] Primary table: ${primaryUpload.originalName} (${primaryData.length} rows)`);
      
      // Build joined rows
      const joinedRows = [];
      
      for (const primaryRow of primaryData) {
        const joinedRow = {};
        
        // Add primary table columns with prefix
        Object.entries(primaryRow).forEach(([col, val]) => {
          joinedRow[`${primaryUpload.originalName}_${col}`] = val;
        });
        
        // Join with related tables
        for (const rel of relationships) {
          // Find which upload this relationship refers to
          const relatedUpload = uploads.find(u => 
            u.tableName === rel.targetTable || u.tableName === rel.toTable
          );
          
          if (!relatedUpload || relatedUpload.id === primaryUpload.id) continue;
          
          const relatedData = uploadData[relatedUpload.id]?.rows || [];
          const joinColumn = rel.sourceColumn || rel.fromColumn;
          const targetColumn = rel.targetColumn || rel.toColumn;
          
          // Find matching row
          const matchingRow = relatedData.find(row => 
            row[targetColumn] === primaryRow[joinColumn]
          );
          
          if (matchingRow) {
            Object.entries(matchingRow).forEach(([col, val]) => {
              joinedRow[`${relatedUpload.originalName}_${col}`] = val;
            });
          }
        }
        
        joinedRows.push(joinedRow);
      }
      
      if (joinedRows.length === 0) {
        throw new Error('No joined rows produced');
      }
      
      // Get all unique columns from joined data
      const allColumns = new Set();
      joinedRows.forEach(row => {
        Object.keys(row).forEach(col => allColumns.add(col));
      });
      
      const columns = Array.from(allColumns);
      console.log(`[View Generator] Joined view will have ${columns.length} columns from ${uploads.length} tables`);
      
      // Create table
      const columnDefs = columns.map(col => `"${col}" TEXT`).join(', ');
      const createTableQuery = `CREATE TABLE "${viewName}" (${columnDefs})`;
      
      await pool.query(createTableQuery);
      
      // Insert joined rows
      for (const row of joinedRows) {
        const values = columns.map(col => row[col] ?? null);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const columnNames = columns.map(col => `"${col}"`).join(', ');
        
        const insertQuery = `INSERT INTO "${viewName}" (${columnNames}) VALUES (${placeholders})`;
        await pool.query(insertQuery, values);
      }
      
      console.log(`[View Generator] Inserted ${joinedRows.length} joined rows into ${viewName}`);
      
    } catch (error) {
      console.error('[View Generator] Error creating joined view:', error);
      throw error;
    }
  }
  
  /**
   * Get completed uploads for project
   */
  async getProjectUploads(projectId) {
    const query = `
      SELECT * FROM uploads
      WHERE "projectId" = $1
        AND status = 'completed'
      ORDER BY "createdAt" ASC
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows;
  }
  
  /**
   * Save view record to database
   */
  async saveViewRecord(projectId, viewName, viewQuery, isActive) {
    try {
      const query = `
        INSERT INTO unified_views (
          "projectId", "viewName", "viewQuery"
        )
        VALUES ($1, $2, $3)
        ON CONFLICT ("projectId") DO UPDATE SET
          "viewName" = EXCLUDED."viewName",
          "viewQuery" = EXCLUDED."viewQuery"
        RETURNING *
      `;
      
      await pool.query(query, [projectId, viewName, viewQuery]);
      
    } catch (error) {
      console.error('[View Generator] Error saving view record:', error);
    }
  }
  
  /**
   * Get view name for project
   */
  async getViewName(projectId) {
    const query = `
      SELECT "viewName" FROM unified_views
      WHERE "projectId" = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows[0]?.viewName || null;
  }
}

export { ViewGenerator };
