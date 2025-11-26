/**
 * LoggingService - Audit trail for cleaning operations
 * Logs to JSON file + database
 */

import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

class LoggingService {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs/cleaning');
  }

  /**
   * Initialize log directory
   */
  async init() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create log directory:', err);
    }
  }

  /**
   * Log cleaning operation
   * @param {Object} data - Log data
   * @returns {Object} Created log entry
   */
  async log(data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      jobId: data.jobId,
      uploadId: data.uploadId,
      operation: data.operation,
      beforeStats: data.beforeStats || {},
      afterStats: data.afterStats || {},
      config: data.config || {},
      duration: data.duration || 0,
      status: data.status || 'success',
      error: data.error || null
    };

    // Write to JSON file
    await this._writeToFile(logEntry);

    // Write to database
    await this._writeToDatabase(logEntry);

    return logEntry;
  }

  /**
   * Write log to JSON file
   * @private
   */
  async _writeToFile(logEntry) {
    try {
      await this.init(); // Ensure directory exists
      
      const filename = `cleaning-${logEntry.jobId}-${Date.now()}.json`;
      const filepath = path.join(this.logDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(logEntry, null, 2));
    } catch (err) {
      console.error('Failed to write log file:', err);
    }
  }

  /**
   * Write log to database
   * @private
   */
  async _writeToDatabase(logEntry) {
    try {
      await prisma.cleaningLog.create({
        data: {
          jobId: logEntry.jobId,
          uploadId: logEntry.uploadId,
          operation: logEntry.operation,
          beforeStats: logEntry.beforeStats,
          afterStats: logEntry.afterStats,
          config: logEntry.config,
          duration: logEntry.duration,
          status: logEntry.status,
          error: logEntry.error
        }
      });
    } catch (err) {
      console.error('Failed to write log to database:', err);
    }
  }

  /**
   * Get logs for job
   * @param {string} jobId - Cleaning job ID
   * @returns {Array} Log entries
   */
  async getJobLogs(jobId) {
    try {
      return await prisma.cleaningLog.findMany({
        where: { jobId },
        orderBy: { createdAt: 'asc' }
      });
    } catch (err) {
      console.error('Failed to retrieve job logs:', err);
      return [];
    }
  }

  /**
   * Get logs for upload
   * @param {string} uploadId - Upload ID
   * @returns {Array} Log entries
   */
  async getUploadLogs(uploadId) {
    try {
      return await prisma.cleaningLog.findMany({
        where: { uploadId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (err) {
      console.error('Failed to retrieve upload logs:', err);
      return [];
    }
  }

  /**
   * Generate cleaning report
   * @param {string} jobId - Cleaning job ID
   * @returns {Object} Report with summary and details
   */
  async generateReport(jobId) {
    const logs = await this.getJobLogs(jobId);
    
    if (logs.length === 0) {
      return { jobId, error: 'No logs found' };
    }

    const firstLog = logs[0];
    const lastLog = logs[logs.length - 1];

    const report = {
      jobId,
      uploadId: firstLog.uploadId,
      startTime: firstLog.createdAt,
      endTime: lastLog.createdAt,
      totalDuration: logs.reduce((sum, log) => sum + (log.duration || 0), 0),
      operations: logs.map(log => ({
        operation: log.operation,
        status: log.status,
        duration: log.duration,
        beforeStats: log.beforeStats,
        afterStats: log.afterStats
      })),
      summary: {
        totalOperations: logs.length,
        successful: logs.filter(l => l.status === 'success').length,
        failed: logs.filter(l => l.status === 'error').length
      }
    };

    // Calculate overall stats
    if (firstLog.beforeStats && lastLog.afterStats) {
      report.summary.originalRows = firstLog.beforeStats.totalRows || 0;
      report.summary.finalRows = lastLog.afterStats.totalRows || 0;
      report.summary.rowsRemoved = report.summary.originalRows - report.summary.finalRows;
    }

    return report;
  }

  /**
   * Create comprehensive JSON log file per blueprint specification
   * @param {Object} data - Complete pipeline data
   * @returns {string} Path to generated JSON file
   */
  async createComprehensiveLog(data) {
    const {
      cleaningJobId,
      uploadId,
      datasetName,
      startedAt,
      completedAt,
      beforeStats,
      afterStats,
      operations = []
    } = data;

    const duration = completedAt 
      ? Math.floor((new Date(completedAt) - new Date(startedAt)) / 1000)
      : 0;

    const comprehensiveLog = {
      cleaning_job_id: cleaningJobId,
      upload_id: uploadId,
      dataset_name: datasetName,
      started_at: new Date(startedAt).toISOString(),
      completed_at: completedAt ? new Date(completedAt).toISOString() : null,
      total_duration_seconds: duration,
      before: {
        total_rows: beforeStats.totalRows || 0,
        total_columns: beforeStats.columns?.length || 0,
        null_count: beforeStats.nullCount || 0,
        duplicate_rows: beforeStats.duplicateRows || 0,
        flagged_outliers: beforeStats.flaggedOutliers || 0
      },
      operations: operations.map((op, index) => ({
        sequence: index + 1,
        timestamp: op.timestamp || new Date().toISOString(),
        operation: op.operation,
        column: op.column || null,
        data_type: op.dataType || null,
        method: op.method || null,
        parameters: op.parameters || {},
        rows_affected: op.rowsAffected || 0,
        outliers_flagged: op.outliersFlagged || 0,
        outlier_values: op.outlierValues || [],
        duplicates_removed: op.duplicatesRemoved || 0,
        strategy: op.strategy || null,
        status: op.status || 'completed'
      })),
      after: {
        total_rows: afterStats.totalRows || 0,
        total_columns: afterStats.columns?.length || 0,
        null_count: afterStats.nullCount || 0,
        duplicate_rows: afterStats.duplicateRows || 0,
        flagged_outliers: afterStats.flaggedOutliers || 0
      }
    };

    try {
      await this.init();
      const filename = `comprehensive-cleaning-${cleaningJobId}-${Date.now()}.json`;
      const filepath = path.join(this.logDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(comprehensiveLog, null, 2));
      
      return filepath;
    } catch (err) {
      console.error('Failed to create comprehensive log:', err);
      throw err;
    }
  }

  /**
   * Delete old logs
   * @param {number} days - Delete logs older than this many days
   */
  async cleanupOldLogs(days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      await prisma.cleaningLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`Deleted logs older than ${days} days`);
    } catch (err) {
      console.error('Failed to cleanup old logs:', err);
    }
  }

  /**
   * General purpose logging methods
   */
  info(message, data = {}) {
    console.log(`[INFO] ${message}`, data);
  }

  error(message, data = {}) {
    console.error(`[ERROR] ${message}`, data);
  }

  warn(message, data = {}) {
    console.warn(`[WARN] ${message}`, data);
  }

  debug(message, data = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }
}

export default new LoggingService();
