/**
 * OutlierService - Detects outliers using IQR method
 * Flags outliers without removing them
 */

class OutlierService {
  /**
   * Detect outliers in numeric columns
   * @param {Array<Object>} rows - Dataset rows
   * @param {Array<string>} columns - Columns to check (auto-detect if empty)
   * @param {number} threshold - IQR multiplier (default 1.5)
   * @returns {Object} { rows: Array, stats: Object }
   */
  detectOutliers(rows, columns = [], threshold = 1.5) {
    if (!rows || rows.length === 0) {
      return { rows: [], stats: {} };
    }

    const result = JSON.parse(JSON.stringify(rows)); // Deep clone
    const stats = {
      totalOutliers: 0,
      byColumn: {}
    };

    // Auto-detect numeric columns if not specified
    const targetColumns = columns.length > 0 
      ? columns 
      : this._getNumericColumns(rows);

    for (const column of targetColumns) {
      const outlierInfo = this._detectColumnOutliers(result, column, threshold);
      stats.byColumn[column] = {
        count: outlierInfo.indices.length,
        indices: outlierInfo.indices,
        method: 'IQR',
        threshold,
        q1: outlierInfo.q1,
        q3: outlierInfo.q3,
        iqr: outlierInfo.iqr,
        lowerBound: outlierInfo.lowerBound,
        upperBound: outlierInfo.upperBound
      };
      stats.totalOutliers += outlierInfo.indices.length;
    }

    // Add outlier flag column
    for (let i = 0; i < result.length; i++) {
      const isOutlier = Object.values(stats.byColumn).some(
        col => col.indices.includes(i)
      );
      result[i]._outlier = isOutlier;
    }

    return { rows: result, stats };
  }

  /**
   * Detect outliers in single column using IQR method
   * @returns {Object} { indices: Array, q1, q3, iqr, lowerBound, upperBound }
   */
  _detectColumnOutliers(rows, column, threshold) {
    const values = rows
      .map((r, idx) => ({ value: parseFloat(r[column]), index: idx }))
      .filter(v => this._isValidNumber(v.value));

    if (values.length < 4) return { 
      indices: [], 
      q1: null, 
      q3: null, 
      iqr: null, 
      lowerBound: null, 
      upperBound: null 
    };

    const sorted = values.map(v => v.value).sort((a, b) => a - b);
    const q1 = this._percentile(sorted, 25);
    const q3 = this._percentile(sorted, 75);
    const iqr = q3 - q1;

    const lowerBound = q1 - threshold * iqr;
    const upperBound = q3 + threshold * iqr;

    const outlierIndices = values
      .filter(v => v.value < lowerBound || v.value > upperBound)
      .map(v => v.index);

    return {
      indices: outlierIndices,
      q1: parseFloat(q1.toFixed(2)),
      q3: parseFloat(q3.toFixed(2)),
      iqr: parseFloat(iqr.toFixed(2)),
      lowerBound: parseFloat(lowerBound.toFixed(2)),
      upperBound: parseFloat(upperBound.toFixed(2))
    };
  }

  /**
   * Calculate percentile of sorted array
   */
  _percentile(sorted, p) {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Check if value is a valid number
   */
  _isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * Get numeric columns from dataset
   */
  _getNumericColumns(rows) {
    if (rows.length === 0) return [];
    
    const sample = rows.slice(0, Math.min(100, rows.length));
    const columns = Object.keys(sample[0] || {});
    
    return columns.filter(col => {
      const values = sample.map(r => r[col]);
      const numericCount = values.filter(v => 
        v !== null && 
        v !== undefined && 
        v !== '' && 
        !isNaN(parseFloat(v))
      ).length;
      
      return numericCount / values.length > 0.8; // 80% numeric threshold
    });
  }

  /**
   * Remove outliers from dataset
   * @param {Array<Object>} rows - Dataset with _outlier flags
   * @returns {Object} { rows: Array, removedCount: number }
   */
  removeOutliers(rows) {
    const filtered = rows.filter(r => !r._outlier);
    const removed = rows.length - filtered.length;
    
    // Clean up flag column
    filtered.forEach(r => delete r._outlier);
    
    return { rows: filtered, removedCount: removed };
  }
}

export default new OutlierService();
