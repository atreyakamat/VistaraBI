/**
 * StandardizationService - Standardizes data formats
 * Handles phone, email, date, currency standardization
 */

class StandardizationService {
  /**
   * Standardize dataset columns
   * @param {Array<Object>} rows - Dataset rows
   * @param {Object} config - { columnName: { type: 'phone'|'email'|'date'|'currency', format: '...' } }
   * @returns {Object} { rows: Array, stats: Object }
   */
  standardize(rows, config = {}) {
    if (!rows || rows.length === 0) {
      return { rows: [], stats: {} };
    }

    const result = JSON.parse(JSON.stringify(rows)); // Deep clone
    const stats = {
      byColumn: {}
    };

    for (const [column, options] of Object.entries(config)) {
      const { type, format } = options;
      let standardizedCount = 0;
      let errorCount = 0;

      for (const row of result) {
        if (row[column] === null || row[column] === undefined || row[column] === '') {
          continue;
        }

        try {
          const original = row[column];
          const standardized = this._standardizeValue(original, type, format);
          if (standardized !== original) {
            row[column] = standardized;
            standardizedCount++;
          }
        } catch (err) {
          errorCount++;
          row[`_error_${column}`] = err.message;
        }
      }

      stats.byColumn[column] = {
        type,
        format,
        standardizedCount,
        errorCount
      };
    }

    return { rows: result, stats };
  }

  /**
   * Standardize single value based on type
   * @private
   */
  _standardizeValue(value, type, format) {
    switch (type) {
      case 'phone':
        return this._standardizePhone(value, format);
      case 'email':
        return this._standardizeEmail(value);
      case 'date':
        return this._standardizeDate(value, format);
      case 'currency':
        return this._standardizeCurrency(value, format);
      default:
        throw new Error(`Unknown standardization type: ${type}`);
    }
  }

  /**
   * Standardize phone number
   * Format options: 'E164' (+1234567890), 'NATIONAL' ((123) 456-7890), 'DIGITS' (1234567890)
   */
  _standardizePhone(value, format = 'E164') {
    const str = String(value);
    const digits = str.replace(/\D/g, ''); // Remove non-digits

    if (digits.length < 10) {
      throw new Error('Phone number too short');
    }

    switch (format) {
      case 'E164':
        // International format: +1234567890
        return `+${digits}`;
      
      case 'NATIONAL':
        // US format: (123) 456-7890
        if (digits.length === 10) {
          return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        } else if (digits.length === 11 && digits[0] === '1') {
          return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        }
        return `(${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
      
      case 'DIGITS':
        // Plain digits
        return digits;
      
      default:
        return `+${digits}`;
    }
  }

  /**
   * Standardize email address
   * Lowercase and trim whitespace
   */
  _standardizeEmail(value) {
    const str = String(value).trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(str)) {
      throw new Error('Invalid email format');
    }
    
    return str;
  }

  /**
   * Standardize date
   * Format options: 'ISO8601' (YYYY-MM-DD), 'ISO_DATETIME' (YYYY-MM-DDTHH:mm:ss), 'US' (MM/DD/YYYY), 'UNIX' (timestamp)
   */
  _standardizeDate(value, format = 'ISO8601') {
    let date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      // Unix timestamp
      date = new Date(value);
    } else {
      // Parse string
      const str = String(value).trim();
      date = new Date(str);
      
      // Try common formats if parsing failed
      if (isNaN(date.getTime())) {
        // Try MM/DD/YYYY
        const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (usMatch) {
          const [, month, day, year] = usMatch;
          date = new Date(year, parseInt(month) - 1, day);
        }
        
        // Try DD/MM/YYYY
        const euMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (euMatch && isNaN(date.getTime())) {
          const [, day, month, year] = euMatch;
          date = new Date(year, parseInt(month) - 1, day);
        }
      }
    }

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }

    switch (format) {
      case 'ISO8601':
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      case 'ISO_DATETIME':
        return date.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
      
      case 'US':
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      
      case 'UNIX':
        return date.getTime();
      
      default:
        return date.toISOString().split('T')[0];
    }
  }

  /**
   * Standardize currency
   * Format options: 'USD' ($1,234.56), 'EUR' (1.234,56 €), 'NUMBER' (1234.56)
   */
  _standardizeCurrency(value, format = 'NUMBER') {
    const str = String(value).trim();
    
    // Remove currency symbols and parse
    const cleaned = str.replace(/[$€£¥,\s]/g, '');
    const num = parseFloat(cleaned);
    
    if (isNaN(num)) {
      throw new Error('Invalid currency value');
    }

    switch (format) {
      case 'USD':
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      case 'EUR':
        return `${num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
      
      case 'NUMBER':
        return parseFloat(num.toFixed(2));
      
      default:
        return parseFloat(num.toFixed(2));
    }
  }

  /**
   * Auto-detect column types
   * @param {Array<Object>} rows - Dataset rows
   * @param {Array<string>} columns - Columns to analyze
   * @returns {Object} { columnName: { type, confidence } }
   */
  detectTypes(rows, columns = []) {
    if (!rows || rows.length === 0) return {};

    const targetColumns = columns.length > 0 
      ? columns 
      : Object.keys(rows[0] || {});

    const result = {};
    const sampleSize = Math.min(100, rows.length);

    for (const column of targetColumns) {
      const sample = rows.slice(0, sampleSize).map(r => r[column]).filter(v => v !== null && v !== undefined && v !== '');
      
      if (sample.length === 0) continue;

      const phoneCount = sample.filter(v => this._looksLikePhone(v)).length;
      const emailCount = sample.filter(v => this._looksLikeEmail(v)).length;
      const dateCount = sample.filter(v => this._looksLikeDate(v)).length;
      const currencyCount = sample.filter(v => this._looksLikeCurrency(v)).length;

      const confidence = (count) => count / sample.length;

      if (confidence(emailCount) > 0.8) {
        result[column] = { type: 'email', confidence: confidence(emailCount) };
      } else if (confidence(phoneCount) > 0.8) {
        result[column] = { type: 'phone', confidence: confidence(phoneCount) };
      } else if (confidence(dateCount) > 0.8) {
        result[column] = { type: 'date', confidence: confidence(dateCount) };
      } else if (confidence(currencyCount) > 0.8) {
        result[column] = { type: 'currency', confidence: confidence(currencyCount) };
      }
    }

    return result;
  }

  _looksLikePhone(value) {
    const str = String(value);
    const digits = str.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  }

  _looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
  }

  _looksLikeDate(value) {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  _looksLikeCurrency(value) {
    const str = String(value);
    return /[$€£¥]/.test(str) || /^\d+[.,]\d{2}$/.test(str);
  }
}

export default new StandardizationService();
