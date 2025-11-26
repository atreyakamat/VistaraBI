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
      case 'text':
        return this._standardizeText(value, format);
      default:
        throw new Error(`Unknown standardization type: ${type}`);
    }
  }

  /**
   * Standardize phone number
   * Format options: 'E164' (+1234567890), 'NATIONAL' ((123) 456-7890), 'DIGITS' (1234567890), 'INTL_DASH' (+91-98765-43210)
   */
  _standardizePhone(value, format = 'E164') {
    const str = String(value);
    const digits = str.replace(/\D/g, ''); // Remove non-digits

    if (digits.length < 10) {
      throw new Error('Phone number too short');
    }

    // Handle Indian phone numbers (10 digits -> add 91 country code)
    let phoneDigits = digits;
    if (digits.length === 10) {
      phoneDigits = '91' + digits; // Assume India
    } else if (digits.length === 11 && digits[0] === '1') {
      // US number with country code
      phoneDigits = digits;
    } else if (digits.length > 12) {
      // Trim to last 12 digits
      phoneDigits = digits.slice(-12);
    }

    switch (format) {
      case 'E164':
        // International format: +919876543210
        return `+${phoneDigits}`;
      
      case 'INTL_DASH':
        // International with dashes: +91-98765-43210
        const cc = phoneDigits.slice(0, 2);
        const part1 = phoneDigits.slice(2, 7);
        const part2 = phoneDigits.slice(7, 12);
        return `+${cc}-${part1}-${part2}`;
      
      case 'NATIONAL':
        // US format: (123) 456-7890
        if (phoneDigits.length === 10) {
          return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
        } else if (phoneDigits.length === 11 && phoneDigits[0] === '1') {
          return `(${phoneDigits.slice(1, 4)}) ${phoneDigits.slice(4, 7)}-${phoneDigits.slice(7)}`;
        }
        return `(${phoneDigits.slice(-10, -7)}) ${phoneDigits.slice(-7, -4)}-${phoneDigits.slice(-4)}`;
      
      case 'DIGITS':
        // Plain digits
        return phoneDigits;
      
      default:
        return `+${phoneDigits}`;
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
   * Handles parentheses for negatives, European format (1.234,56), etc.
   */
  _standardizeCurrency(value, format = 'NUMBER') {
    const str = String(value).trim();
    
    // Handle negatives in parentheses: (500) -> -500
    let isNegative = false;
    let cleaned = str;
    if (str.startsWith('(') && str.endsWith(')')) {
      isNegative = true;
      cleaned = str.slice(1, -1);
    }

    // Remove currency symbols
    cleaned = cleaned.replace(/[$€£¥₹]/g, '').trim();

    // Handle European format (1.234,56 -> 1234.56)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      if (lastComma > lastDot) {
        // European: 1.234,56
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // American: 1,234.56
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      // Only commas: could be thousands separator or decimal
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length === 2) {
        // Likely European decimal: 1234,56
        cleaned = cleaned.replace(',', '.');
      } else {
        // Thousands separator: 1,234,567
        cleaned = cleaned.replace(/,/g, '');
      }
    }

    const num = parseFloat(cleaned);
    
    if (isNaN(num)) {
      throw new Error('Invalid currency value');
    }

    const finalNum = isNegative ? -num : num;

    switch (format) {
      case 'USD':
        return `$${finalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      case 'EUR':
        return `${finalNum.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
      
      case 'NUMBER':
        return parseFloat(finalNum.toFixed(2));
      
      default:
        return parseFloat(finalNum.toFixed(2));
    }
  }

  /**
   * Standardize text
   * Format options: 'lower', 'upper', 'title', 'sentence'
   * Trims whitespace and collapses multiple spaces
   */
  _standardizeText(value, format = 'title') {
    if (value === null || value === undefined) {
      return null;
    }

    let text = String(value).trim();
    
    // Collapse multiple spaces into single space
    text = text.replace(/\s+/g, ' ');

    switch (format) {
      case 'lower':
        return text.toLowerCase();
      
      case 'upper':
        return text.toUpperCase();
      
      case 'title':
        // Capitalize first letter of each word
        return text.replace(/\w\S*/g, (word) => {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        });
      
      case 'sentence':
        // Capitalize first letter of first word only
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      
      default:
        return text;
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
