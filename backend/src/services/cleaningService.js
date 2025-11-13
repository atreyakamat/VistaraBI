/**
 * CleaningService - Main orchestrator for data cleaning pipeline
 * Coordinates all cleaning operations: imputation, outlier detection, deduplication, standardization
 */

import imputationService from './imputationService.js';
import outlierService from './outlierService.js';
import deduplicationService from './deduplicationService.js';
import standardizationService from './standardizationService.js';
import loggingService from './loggingService.js';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

class CleaningService {
  /**
   * Start cleaning pipeline for upload
   * @param {string} uploadId - Upload ID
   * @param {Object} config - Cleaning configuration
   * @returns {Object} Cleaning job
   */
  async startCleaning(uploadId, config = {}) {
    const jobId = uuidv4();
    const startTime = Date.now();

    try {
      // Validate upload exists
      const upload = await prisma.upload.findUnique({
        where: { id: uploadId },
        include: { dataRows: true }
      });

      if (!upload) {
        throw new Error('Upload not found');
      }

      // Create cleaning job
      const job = await prisma.cleaningJob.create({
        data: {
          id: jobId,
          uploadId,
          status: 'running',
          config
        }
      });

      // Load data
      let rows = upload.dataRows.map(row => row.data);
      const originalRowCount = rows.length;

      // Track stats
      const pipelineStats = {
        original: { totalRows: originalRowCount, columns: Object.keys(rows[0] || {}) },
        stages: {}
      };

      // Execute cleaning pipeline
      if (config.imputation && Object.keys(config.imputation).length > 0) {
        const result = await this._executeImputation(rows, config.imputation, jobId, uploadId);
        rows = result.rows;
        pipelineStats.stages.imputation = result.stats;
      }

      if (config.outliers && config.outliers.enabled) {
        const result = await this._executeOutlierDetection(rows, config.outliers, jobId, uploadId);
        rows = result.rows;
        pipelineStats.stages.outliers = result.stats;
      }

      if (config.deduplication && config.deduplication.enabled) {
        const result = await this._executeDeduplication(rows, config.deduplication, jobId, uploadId);
        rows = result.rows;
        pipelineStats.stages.deduplication = result.stats;
      }

      if (config.standardization && Object.keys(config.standardization).length > 0) {
        const result = await this._executeStandardization(rows, config.standardization, jobId, uploadId);
        rows = result.rows;
        pipelineStats.stages.standardization = result.stats;
      }

      // Store cleaned data in new table
      const cleanedTableName = `cleaned_${uploadId}_${Date.now()}`;
      await this._storeCleanedData(cleanedTableName, rows);

      pipelineStats.final = { totalRows: rows.length, columns: Object.keys(rows[0] || {}) };
      pipelineStats.rowsRemoved = originalRowCount - rows.length;
      pipelineStats.removalPercentage = ((pipelineStats.rowsRemoved / originalRowCount) * 100).toFixed(2);

      const duration = Date.now() - startTime;

      // Update job status
      await prisma.cleaningJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          cleanedTableName,
          stats: pipelineStats,
          completedAt: new Date()
        }
      });

      // Log final summary
      await loggingService.log({
        jobId,
        uploadId,
        operation: 'pipeline_complete',
        beforeStats: pipelineStats.original,
        afterStats: pipelineStats.final,
        config,
        duration,
        status: 'success'
      });

      return {
        jobId,
        status: 'completed',
        stats: pipelineStats,
        cleanedTableName,
        duration
      };

    } catch (error) {
      console.error('Cleaning pipeline failed:', error);

      // Update job status
      await prisma.cleaningJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: error.message
        }
      });

      // Log error
      await loggingService.log({
        jobId,
        uploadId,
        operation: 'pipeline_failed',
        duration: Date.now() - startTime,
        status: 'error',
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Execute imputation stage
   * @private
   */
  async _executeImputation(rows, config, jobId, uploadId) {
    const startTime = Date.now();
    const beforeStats = { totalRows: rows.length };

    const { rows: cleanedRows, stats } = imputationService.impute(rows, config);
    const duration = Date.now() - startTime;

    await loggingService.log({
      jobId,
      uploadId,
      operation: 'imputation',
      beforeStats,
      afterStats: { totalRows: cleanedRows.length, ...stats },
      config,
      duration,
      status: 'success'
    });

    return { rows: cleanedRows, stats };
  }

  /**
   * Execute outlier detection stage
   * @private
   */
  async _executeOutlierDetection(rows, config, jobId, uploadId) {
    const startTime = Date.now();
    const beforeStats = { totalRows: rows.length };

    const { rows: flaggedRows, stats } = outlierService.detectOutliers(
      rows,
      config.columns || [],
      config.threshold || 1.5
    );

    let cleanedRows = flaggedRows;
    let removedCount = 0;

    if (config.remove) {
      const result = outlierService.removeOutliers(flaggedRows);
      cleanedRows = result.rows;
      removedCount = result.removedCount;
    }

    const duration = Date.now() - startTime;

    await loggingService.log({
      jobId,
      uploadId,
      operation: 'outlier_detection',
      beforeStats,
      afterStats: { totalRows: cleanedRows.length, outlierCount: stats.totalOutliers, removed: removedCount },
      config,
      duration,
      status: 'success'
    });

    return { rows: cleanedRows, stats: { ...stats, removedCount } };
  }

  /**
   * Execute deduplication stage
   * @private
   */
  async _executeDeduplication(rows, config, jobId, uploadId) {
    const startTime = Date.now();
    const beforeStats = { totalRows: rows.length };

    const { rows: cleanedRows, stats } = deduplicationService.deduplicate(
      rows,
      config.keyColumns || []
    );

    const duration = Date.now() - startTime;

    await loggingService.log({
      jobId,
      uploadId,
      operation: 'deduplication',
      beforeStats,
      afterStats: { totalRows: cleanedRows.length, ...stats },
      config,
      duration,
      status: 'success'
    });

    return { rows: cleanedRows, stats };
  }

  /**
   * Execute standardization stage
   * @private
   */
  async _executeStandardization(rows, config, jobId, uploadId) {
    const startTime = Date.now();
    const beforeStats = { totalRows: rows.length };

    const { rows: cleanedRows, stats } = standardizationService.standardize(rows, config);
    const duration = Date.now() - startTime;

    await loggingService.log({
      jobId,
      uploadId,
      operation: 'standardization',
      beforeStats,
      afterStats: { totalRows: cleanedRows.length, ...stats },
      config,
      duration,
      status: 'success'
    });

    return { rows: cleanedRows, stats };
  }

  /**
   * Store cleaned data
   * @private
   */
  async _storeCleanedData(tableName, rows) {
    // Store in data_rows table with cleaned table reference
    // In production, you might create actual dynamic tables or use a key-value store
    await prisma.cleanedData.create({
      data: {
        tableName,
        data: rows,
        rowCount: rows.length,
        columns: Object.keys(rows[0] || {})
      }
    });
  }

  /**
   * Get cleaning job status
   * @param {string} jobId - Cleaning job ID
   * @returns {Object} Job details
   */
  async getJobStatus(jobId) {
    const job = await prisma.cleaningJob.findUnique({
      where: { id: jobId },
      include: {
        upload: {
          select: {
            fileName: true,
            originalName: true,
            totalRecords: true
          }
        }
      }
    });

    if (!job) {
      throw new Error('Cleaning job not found');
    }

    return job;
  }

  /**
   * Get cleaning report
   * @param {string} jobId - Cleaning job ID
   * @returns {Object} Full cleaning report
   */
  async getReport(jobId) {
    const job = await this.getJobStatus(jobId);
    const logs = await loggingService.getJobLogs(jobId);

    return {
      job,
      logs,
      report: await loggingService.generateReport(jobId)
    };
  }

  /**
   * Get cleaned data
   * @param {string} jobId - Cleaning job ID
   * @returns {Array} Cleaned rows
   */
  async getCleanedData(jobId) {
    const job = await prisma.cleaningJob.findUnique({
      where: { id: jobId }
    });

    if (!job || !job.cleanedTableName) {
      throw new Error('Cleaned data not found');
    }

    const cleanedData = await prisma.cleanedData.findFirst({
      where: { tableName: job.cleanedTableName }
    });

    return cleanedData ? cleanedData.data : [];
  }

  /**
   * Auto-configure cleaning pipeline based on data analysis
   * @param {string} uploadId - Upload ID
   * @returns {Object} Recommended configuration with detection reasoning
   */
  async autoConfigurePipeline(uploadId) {
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
      include: { dataRows: true } // Load all rows for accurate analysis
    });

    if (!upload || upload.dataRows.length === 0) {
      throw new Error('No data found for analysis');
    }

    const rows = upload.dataRows.map(row => row.data);
    const totalRows = rows.length;
    
    const config = {
      imputation: {},
      outliers: { enabled: true, columns: [], threshold: 1.5, remove: false },
      deduplication: { enabled: true, keyColumns: [] },
      standardization: {},
      detectionLog: [] // NEW: Track what was detected and why
    };

    const columns = Object.keys(rows[0] || {});

    // STEP 1: Analyze each column and auto-detect type + strategy
    for (const column of columns) {
      const analysis = this._analyzeColumn(rows, column, totalRows);
      
      // Add detection reasoning
      config.detectionLog.push({
        column,
        ...analysis
      });

      // Configure imputation if missing values found
      if (analysis.missingCount > 0 && analysis.missingRatio < 0.70) {
        config.imputation[column] = analysis.recommendedImputation;
      }

      // Configure outlier detection for numeric columns
      if (analysis.dataType === 'numeric' && analysis.hasVariance) {
        config.outliers.columns.push(column);
      }

      // Configure standardization for detected types
      if (analysis.standardizationType) {
        config.standardization[column] = {
          type: analysis.standardizationType,
          format: analysis.recommendedFormat
        };
      }
    }

    // STEP 2: Check for duplicates (sample first 1000 rows for performance)
    const sampleSize = Math.min(1000, totalRows);
    const sample = rows.slice(0, sampleSize);
    const uniqueHashes = new Set();
    let duplicateCount = 0;

    for (const row of sample) {
      const hash = JSON.stringify(row);
      if (uniqueHashes.has(hash)) {
        duplicateCount++;
      } else {
        uniqueHashes.add(hash);
      }
    }

    config.deduplication.enabled = duplicateCount > 0;
    config.detectionLog.push({
      column: 'ALL_COLUMNS',
      dataType: 'duplicate_check',
      finding: `Found ${duplicateCount} duplicates in ${sampleSize} sampled rows`,
      recommendation: duplicateCount > 0 ? 'Enable deduplication' : 'No duplicates detected'
    });

    return config;
  }

  /**
   * Analyze a single column to detect type and recommend strategy
   * @private
   * @param {Array} rows - Data rows
   * @param {string} column - Column name
   * @param {number} totalRows - Total row count
   * @returns {Object} Analysis result with reasoning
   */
  _analyzeColumn(rows, column, totalRows) {
    const values = rows.map(r => r[column]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    const missingCount = totalRows - nonNullValues.length;
    const missingRatio = missingCount / totalRows;

    // Count data patterns
    let numericCount = 0;
    let dateCount = 0;
    let phoneCount = 0;
    let emailCount = 0;
    let booleanCount = 0;
    const uniqueValues = new Set();

    for (const val of nonNullValues) {
      uniqueValues.add(val);
      const str = String(val).trim();

      // Check numeric
      if (!isNaN(parseFloat(str)) && isFinite(str)) {
        numericCount++;
      }

      // Check date patterns
      if (this._isDateLike(str)) {
        dateCount++;
      }

      // Check phone
      if (this._isPhoneLike(str)) {
        phoneCount++;
      }

      // Check email
      if (this._isEmailLike(str)) {
        emailCount++;
      }

      // Check boolean
      if (['true', 'false', '0', '1', 'yes', 'no'].includes(str.toLowerCase())) {
        booleanCount++;
      }
    }

    const nonNullCount = nonNullValues.length;
    const cardinality = uniqueValues.size;
    const cardinalityRatio = cardinality / nonNullCount;

    // DETECTION LOGIC with transparency
    let dataType = 'categorical';
    let reasoning = [];
    let recommendedImputation = 'mode';
    let standardizationType = null;
    let recommendedFormat = null;

    // Detect numeric
    if (numericCount / nonNullCount > 0.80) {
      dataType = 'numeric';
      recommendedImputation = 'median';
      reasoning.push(`${Math.round((numericCount / nonNullCount) * 100)}% values are numeric`);
      reasoning.push(`Using MEDIAN for outlier resistance`);
    }
    // Detect date
    else if (dateCount / nonNullCount > 0.60) {
      dataType = 'date';
      recommendedImputation = 'forward-fill';
      standardizationType = 'date';
      recommendedFormat = 'ISO8601';
      reasoning.push(`${Math.round((dateCount / nonNullCount) * 100)}% values match date patterns`);
      reasoning.push(`Using FORWARD-FILL to maintain temporal sequence`);
    }
    // Detect phone
    else if (phoneCount / nonNullCount > 0.70) {
      dataType = 'phone';
      recommendedImputation = 'mode';
      standardizationType = 'phone';
      recommendedFormat = 'E164';
      reasoning.push(`${Math.round((phoneCount / nonNullCount) * 100)}% values match phone patterns`);
      reasoning.push(`Will standardize to +CC-XXXXX-XXXXX format`);
    }
    // Detect email
    else if (emailCount / nonNullCount > 0.70) {
      dataType = 'email';
      recommendedImputation = 'mode';
      standardizationType = 'email';
      recommendedFormat = 'lowercase';
      reasoning.push(`${Math.round((emailCount / nonNullCount) * 100)}% values match email patterns`);
      reasoning.push(`Will standardize to lowercase`);
    }
    // Detect boolean
    else if (booleanCount / nonNullCount > 0.80) {
      dataType = 'boolean';
      recommendedImputation = 'mode';
      reasoning.push(`${Math.round((booleanCount / nonNullCount) * 100)}% values are boolean-like`);
      reasoning.push(`Using MODE (most frequent value)`);
    }
    // Low cardinality = categorical
    else if (cardinalityRatio < 0.05) {
      dataType = 'categorical';
      recommendedImputation = 'mode';
      reasoning.push(`Only ${cardinality} unique values in ${nonNullCount} rows (${Math.round(cardinalityRatio * 100)}% cardinality)`);
      reasoning.push(`Low cardinality suggests categorical data, using MODE`);
    }
    // High cardinality = text/ID
    else if (cardinalityRatio > 0.95) {
      dataType = 'text_id';
      recommendedImputation = null; // Don't impute IDs
      reasoning.push(`${Math.round(cardinalityRatio * 100)}% unique values suggests ID/unique text`);
      reasoning.push(`Will NOT impute (cannot infer missing IDs)`);
    }
    // Default to categorical with mode
    else {
      reasoning.push(`Mixed data type detected, treating as categorical`);
      reasoning.push(`Using MODE (most frequent value)`);
    }

    // Check variance for outlier detection
    const hasVariance = dataType === 'numeric' && cardinality > 10;

    return {
      dataType,
      missingCount,
      missingRatio: parseFloat(missingRatio.toFixed(4)),
      nonNullCount,
      uniqueValues: cardinality,
      cardinalityRatio: parseFloat(cardinalityRatio.toFixed(4)),
      recommendedImputation,
      standardizationType,
      recommendedFormat,
      hasVariance,
      reasoning: reasoning.join('. '),
      sampleValues: Array.from(uniqueValues).slice(0, 5)
    };
  }

  /**
   * Check if string matches date patterns
   * @private
   */
  _isDateLike(str) {
    // ISO format: 2024-11-12
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return true;
    // US format: 11/12/2024
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) return true;
    // EU format: 12-11-2024
    if (/^\d{1,2}-\d{1,2}-\d{4}/.test(str)) return true;
    // Try parsing
    const parsed = Date.parse(str);
    return !isNaN(parsed) && parsed > 0;
  }

  /**
   * Check if string matches phone patterns
   * @private
   */
  _isPhoneLike(str) {
    const cleaned = str.replace(/[\s\-\(\)\+]/g, '');
    return /^\d{10,12}$/.test(cleaned);
  }

  /**
   * Check if string matches email patterns
   * @private
   */
  _isEmailLike(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  }
}

export default new CleaningService();
