/**
 * ImputationService - Handles missing value imputation strategies
 * Supports median (numeric), mode (categorical), forward-fill (dates)
 */

class ImputationService {
  /**
   * Apply imputation to dataset based on strategy per column
   * @param {Array<Object>} rows - Dataset rows
   * @param {Object} config - Imputation config { columnName: 'median'|'mode'|'forward-fill' }
   * @returns {Object} { rows: Array, stats: Object }
   */
  impute(rows, config = {}) {
    if (!rows || rows.length === 0) {
      return { rows: [], stats: {} };
    }

    const stats = {
      totalMissing: 0,
      byColumn: {}
    };

    const result = JSON.parse(JSON.stringify(rows)); // Deep clone

    // Process each column in config
    for (const [column, strategy] of Object.entries(config)) {
      const missingCount = this._countMissing(result, column);
      if (missingCount === 0) continue;

      stats.byColumn[column] = {
        strategy,
        missingBefore: missingCount,
        missingAfter: 0,
        fillValue: null
      };

      let fillValue;
      switch (strategy) {
        case 'median':
          fillValue = this._imputeMedian(result, column);
          stats.byColumn[column].fillValue = fillValue;
          break;
        case 'mode':
          fillValue = this._imputeMode(result, column);
          stats.byColumn[column].fillValue = fillValue;
          break;
        case 'forward-fill':
          this._imputeForwardFill(result, column);
          stats.byColumn[column].fillValue = 'forward-fill';
          break;
        default:
          throw new Error(`Unknown imputation strategy: ${strategy}`);
      }

      const missingAfter = this._countMissing(result, column);
      stats.byColumn[column].missingAfter = missingAfter;
      stats.totalMissing += missingAfter;
    }

    // Auto-detect columns not in config
    const allColumns = this._getColumns(rows);
    for (const column of allColumns) {
      if (!config[column]) {
        const missingCount = this._countMissing(result, column);
        if (missingCount > 0) {
          stats.totalMissing += missingCount;
        }
      }
    }

    return { rows: result, stats };
  }

  /**
   * Impute missing numeric values with median
   * @returns {number} The median value used for imputation
   */
  _imputeMedian(rows, column) {
    const values = rows
      .map(r => r[column])
      .filter(v => this._isValidNumber(v))
      .map(v => parseFloat(v));

    if (values.length === 0) return null;

    const sorted = values.sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    for (const row of rows) {
      if (this._isMissing(row[column])) {
        row[column] = median;
      }
    }

    return median;
  }

  /**
   * Impute missing categorical values with mode (most frequent)
   * @returns {any} The mode value used for imputation
   */
  _imputeMode(rows, column) {
    const freq = {};
    for (const row of rows) {
      const val = row[column];
      if (!this._isMissing(val)) {
        freq[val] = (freq[val] || 0) + 1;
      }
    }

    const entries = Object.entries(freq);
    if (entries.length === 0) return null;

    const mode = entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];

    for (const row of rows) {
      if (this._isMissing(row[column])) {
        row[column] = mode;
      }
    }

    return mode;
  }

  /**
   * Impute missing values with previous row value (forward fill)
   */
  _imputeForwardFill(rows, column) {
    let lastValue = null;
    for (const row of rows) {
      if (!this._isMissing(row[column])) {
        lastValue = row[column];
      } else if (lastValue !== null) {
        row[column] = lastValue;
      }
    }
  }

  /**
   * Check if value is missing
   */
  _isMissing(value) {
    return value === null || 
           value === undefined || 
           value === '' || 
           (typeof value === 'string' && value.trim() === '') ||
           (typeof value === 'string' && /^(null|undefined|nan|n\/a|na)$/i.test(value.trim()));
  }

  /**
   * Check if value is a valid number
   */
  _isValidNumber(value) {
    if (this._isMissing(value)) return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }

  /**
   * Count missing values in column
   */
  _countMissing(rows, column) {
    return rows.filter(r => this._isMissing(r[column])).length;
  }

  /**
   * Get all column names from dataset
   */
  _getColumns(rows) {
    if (rows.length === 0) return [];
    const cols = new Set();
    for (const row of rows) {
      Object.keys(row).forEach(k => cols.add(k));
    }
    return Array.from(cols);
  }
}

export default new ImputationService();
