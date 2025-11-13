/**
 * DeduplicationService - Identifies and removes duplicate records
 * Uses SHA-256 hash-based exact duplicate detection
 */

import crypto from 'crypto';

class DeduplicationService {
  /**
   * Remove duplicate rows from dataset
   * @param {Array<Object>} rows - Dataset rows
   * @param {Array<string>} keyColumns - Columns to consider for uniqueness (empty = all columns)
   * @returns {Object} { rows: Array, stats: Object }
   */
  deduplicate(rows, keyColumns = []) {
    if (!rows || rows.length === 0) {
      return { rows: [], stats: { originalCount: 0, duplicateCount: 0, uniqueCount: 0 } };
    }

    const stats = {
      originalCount: rows.length,
      duplicateCount: 0,
      uniqueCount: 0,
      duplicateIndices: []
    };

    const seen = new Set();
    const result = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const hash = this._hashRow(row, keyColumns);

      if (!seen.has(hash)) {
        seen.add(hash);
        result.push({ ...row }); // Clone row
      } else {
        stats.duplicateIndices.push(i);
      }
    }

    stats.duplicateCount = stats.duplicateIndices.length;
    stats.uniqueCount = result.length;

    return { rows: result, stats };
  }

  /**
   * Identify duplicates without removing them
   * @param {Array<Object>} rows - Dataset rows
   * @param {Array<string>} keyColumns - Columns to consider
   * @returns {Object} { rows: Array, stats: Object }
   */
  identifyDuplicates(rows, keyColumns = []) {
    if (!rows || rows.length === 0) {
      return { rows: [], stats: { duplicateCount: 0, duplicateGroups: [] } };
    }

    const hashMap = new Map(); // hash -> array of indices
    
    for (let i = 0; i < rows.length; i++) {
      const hash = this._hashRow(rows[i], keyColumns);
      if (!hashMap.has(hash)) {
        hashMap.set(hash, []);
      }
      hashMap.get(hash).push(i);
    }

    // Find groups with duplicates
    const duplicateGroups = [];
    for (const [hash, indices] of hashMap.entries()) {
      if (indices.length > 1) {
        duplicateGroups.push({ hash, indices, count: indices.length });
      }
    }

    const result = JSON.parse(JSON.stringify(rows)); // Deep clone
    
    // Add duplicate flag
    const duplicateIndices = new Set(
      duplicateGroups.flatMap(g => g.indices.slice(1)) // Keep first occurrence
    );
    
    for (let i = 0; i < result.length; i++) {
      result[i]._duplicate = duplicateIndices.has(i);
    }

    const stats = {
      duplicateCount: duplicateIndices.size,
      duplicateGroups: duplicateGroups.map(g => ({
        count: g.count,
        indices: g.indices
      }))
    };

    return { rows: result, stats };
  }

  /**
   * Generate SHA-256 hash for row
   * @private
   */
  _hashRow(row, keyColumns = []) {
    const obj = {};
    
    if (keyColumns.length === 0) {
      // Use all columns except internal flags
      for (const [key, value] of Object.entries(row)) {
        if (!key.startsWith('_')) {
          obj[key] = this._normalizeValue(value);
        }
      }
    } else {
      // Use only specified columns
      for (const col of keyColumns) {
        obj[col] = this._normalizeValue(row[col]);
      }
    }

    // Sort keys for consistent hashing
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = obj[key];
    });

    const str = JSON.stringify(sorted);
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Normalize value for consistent hashing
   * @private
   */
  _normalizeValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (typeof value === 'string') {
      // Trim and lowercase for case-insensitive comparison
      return value.trim().toLowerCase();
    }
    
    if (typeof value === 'number') {
      // Round to avoid floating point precision issues
      return Math.round(value * 1000000) / 1000000;
    }
    
    return value;
  }

  /**
   * Get duplicate statistics without modifying data
   * @param {Array<Object>} rows - Dataset rows
   * @param {Array<string>} keyColumns - Columns to consider
   * @returns {Object} Statistics about duplicates
   */
  getStats(rows, keyColumns = []) {
    const { stats } = this.identifyDuplicates(rows, keyColumns);
    return stats;
  }
}

export default new DeduplicationService();
