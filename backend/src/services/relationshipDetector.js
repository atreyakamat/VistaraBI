import { pool } from '../config/database.js';

/**
 * RelationshipDetector - Automatically identifies foreign key relationships between tables
 * 
 * Algorithm:
 * 1. Find primary keys (columns with 'id', unique, non-null)
 * 2. Find foreign key candidates (matching column names across tables)
 * 3. Validate relationships (>80% referential integrity)
 */
class RelationshipDetector {
  
  /**
   * Detect relationships for all uploads in a project
   */
  async detect(projectId) {
    try {
      console.log(`[Relationship Detection] Starting for project ${projectId}`);
      
      // Get all completed uploads in project
      const uploads = await this.getProjectUploads(projectId);
      
      if (uploads.length < 2) {
        console.log('[Relationship Detection] Only 1 file, no relationships needed');
        return [];
      }
      
      console.log(`[Relationship Detection] Found ${uploads.length} uploads to analyze`);
      
      // Step 1: Find primary keys in each upload
      const uploadPrimaryKeys = {};
      for (const upload of uploads) {
        const pks = await this.findPrimaryKeys(upload.id);
        uploadPrimaryKeys[upload.id] = pks;
        console.log(`[Relationship Detection] ${upload.originalName} (${upload.id}) primary keys: ${pks.join(', ') || 'none'}`);
      }
      
      // Step 2: Find foreign key candidates between all upload pairs
      const relationships = [];
      for (let i = 0; i < uploads.length; i++) {
        for (let j = i + 1; j < uploads.length; j++) {
          const uploadA = uploads[i];
          const uploadB = uploads[j];
          
          // Check A → B relationships
          const relsAB = await this.findForeignKeyCandidates(uploadA, uploadB);
          relationships.push(...relsAB);
          
          // Check B → A relationships
          const relsBA = await this.findForeignKeyCandidates(uploadB, uploadA);
          relationships.push(...relsBA);
        }
      }
      
      console.log(`[Relationship Detection] Found ${relationships.length} candidate relationships`);
      
      // Step 3: Validate each relationship
      const validRelationships = [];
      for (const rel of relationships) {
        const isValid = await this.validateRelationship(rel);
        if (isValid.valid) {
          validRelationships.push({
            sourceTable: rel.fromTable,
            sourceColumn: rel.fromColumn,
            targetTable: rel.toTable,
            targetColumn: rel.toColumn,
            matchRate: isValid.matchRate,
            status: 'valid'
          });
          console.log(`[Relationship Detection] ✓ Valid: ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn} (${(isValid.matchRate * 100).toFixed(1)}%)`);
        } else {
          console.log(`[Relationship Detection] ✗ Invalid: ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn} (${(isValid.matchRate * 100).toFixed(1)}%)`);
        }
      }
      
      // Step 4: Save relationships to database
      await this.saveRelationships(projectId, validRelationships);
      
      console.log(`[Relationship Detection] Completed: ${validRelationships.length} valid relationships found`);
      return validRelationships;
      
    } catch (error) {
      console.error('[Relationship Detection] Error:', error);
      throw error;
    }
  }
  
  /**
   * Find primary key columns in a table
   * Criteria: Contains 'id', unique values, no nulls
   * Works with data stored in data_rows JSON
   */
  async findPrimaryKeys(uploadId) {
    try {
      // Get data from data_rows table
      const dataQuery = `
        SELECT data FROM data_rows WHERE "uploadId" = $1
      `;
      const dataResult = await pool.query(dataQuery, [uploadId]);
      
      if (dataResult.rows.length === 0) {
        return [];
      }
      
      const rows = dataResult.rows.map(r => r.data);
      if (rows.length === 0) return [];
      
      // Find columns containing 'id'
      const firstRow = rows[0];
      const idColumns = Object.keys(firstRow).filter(col => 
        col.toLowerCase().includes('id')
      );
      
      const primaryKeys = [];
      
      for (const col of idColumns) {
        // Check uniqueness and nulls
        const values = rows.map(row => row[col]);
        const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
        const uniqueValues = new Set(nonNullValues);
        
        const isUnique = nonNullValues.length === uniqueValues.size;
        const hasNoNulls = nonNullValues.length === rows.length;
        
        if (isUnique && hasNoNulls && nonNullValues.length > 0) {
          primaryKeys.push(col);
        }
      }
      
      return primaryKeys;
      
    } catch (error) {
      console.error(`[Relationship Detection] Error finding PKs for upload ${uploadId}:`, error);
      return [];
    }
  }
  
  /**
   * Find foreign key candidates between two uploads
   * Matches on column name
   * Works with data stored in data_rows JSON
   */
  async findForeignKeyCandidates(uploadA, uploadB) {
    try {
      // Get sample data from both uploads
      const dataQueryA = `SELECT data FROM data_rows WHERE "uploadId" = $1 LIMIT 1`;
      const dataQueryB = `SELECT data FROM data_rows WHERE "uploadId" = $1 LIMIT 1`;
      
      const [resultA, resultB] = await Promise.all([
        pool.query(dataQueryA, [uploadA.id]),
        pool.query(dataQueryB, [uploadB.id])
      ]);
      
      if (resultA.rows.length === 0 || resultB.rows.length === 0) {
        return [];
      }
      
      const columnsA = Object.keys(resultA.rows[0].data);
      const columnsB = Object.keys(resultB.rows[0].data);
      
      // Find matching column names that contain 'id'
      const matches = [];
      for (const colA of columnsA) {
        if (colA.toLowerCase().includes('id')) {
          for (const colB of columnsB) {
            if (colA.toLowerCase() === colB.toLowerCase()) {
              matches.push({
                fromTable: uploadA.tableName,
                fromColumn: colA,
                toTable: uploadB.tableName,
                toColumn: colB,
                fromUploadId: uploadA.id,
                toUploadId: uploadB.id
              });
            }
          }
        }
      }
      
      return matches;
      
    } catch (error) {
      console.error(`[Relationship Detection] Error finding FK candidates ${uploadA.id}->${uploadB.id}:`, error);
      return [];
    }
  }
  
  /**
   * Validate relationship by checking referential integrity
   * Valid if >80% of FK values exist in PK table
   * Works with data stored in data_rows JSON
   */
  async validateRelationship(rel) {
    try {
      // Get data from both uploads
      const fromDataQuery = `SELECT data FROM data_rows WHERE "uploadId" = $1`;
      const toDataQuery = `SELECT data FROM data_rows WHERE "uploadId" = $1`;
      
      const [fromResult, toResult] = await Promise.all([
        pool.query(fromDataQuery, [rel.fromUploadId]),
        pool.query(toDataQuery, [rel.toUploadId])
      ]);
      
      if (fromResult.rows.length === 0 || toResult.rows.length === 0) {
        return { valid: false, matchRate: 0 };
      }
      
      const fromRows = fromResult.rows.map(r => r.data);
      const toRows = toResult.rows.map(r => r.data);
      
      // Build set of target values
      const targetValues = new Set(
        toRows.map(row => row[rel.toColumn]).filter(v => v !== null && v !== undefined && v !== '')
      );
      
      // Check how many source values exist in target
      const sourceValues = fromRows
        .map(row => row[rel.fromColumn])
        .filter(v => v !== null && v !== undefined && v !== '');
      
      if (sourceValues.length === 0) {
        return { valid: false, matchRate: 0 };
      }
      
      const matched = sourceValues.filter(v => targetValues.has(v)).length;
      const matchRate = matched / sourceValues.length;
      
      return {
        valid: matchRate > 0.80,
        matchRate
      };
      
    } catch (error) {
      console.error(`[Relationship Detection] Error validating relationship:`, error);
      return { valid: false, matchRate: 0 };
    }
  }
  
  /**
   * Get completed uploads for a project
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
   * Save validated relationships to database
   */
  async saveRelationships(projectId, relationships) {
    for (const rel of relationships) {
      try {
        const query = `
          INSERT INTO relationships (
            "projectId", "fromTable", "fromColumn",
            "toTable", "toColumn", "matchRate", status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `;
        
        await pool.query(query, [
          projectId,
          rel.fromTable,
          rel.fromColumn,
          rel.toTable,
          rel.toColumn,
          rel.matchRate,
          rel.status
        ]);
        
      } catch (error) {
        console.error('[Relationship Detection] Error saving relationship:', error);
      }
    }
  }
  
  /**
   * Get relationships for a project
   */
  async getRelationships(projectId) {
    const query = `
      SELECT * FROM relationships
      WHERE "projectId" = $1
        AND status = 'valid'
      ORDER BY "createdAt"
    `;
    const result = await pool.query(query, [projectId]);
    return result.rows;
  }

  /**
   * Get valid relationships for unified view generation
   * Alias method for compatibility
   */
  async getValidRelationships(projectId) {
    return this.getRelationships(projectId);
  }
}

export { RelationshipDetector };

