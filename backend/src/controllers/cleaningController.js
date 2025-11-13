/**
 * Cleaning Controller - Handles data cleaning API requests
 */

import cleaningService from '../services/cleaningService.js';

/**
 * Start cleaning pipeline
 * POST /api/v1/clean
 */
export const startCleaning = async (req, res, next) => {
  try {
    const { uploadId, config } = req.body;

    if (!uploadId) {
      return res.status(400).json({ 
        success: false, 
        error: 'uploadId is required' 
      });
    }

    const result = await cleaningService.startCleaning(uploadId, config || {});

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get auto-configuration suggestions
 * POST /api/v1/clean/auto-config
 */
export const autoConfig = async (req, res, next) => {
  try {
    const { uploadId } = req.body;

    if (!uploadId) {
      return res.status(400).json({ 
        success: false, 
        error: 'uploadId is required' 
      });
    }

    const config = await cleaningService.autoConfigurePipeline(uploadId);

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cleaning job status
 * GET /api/v1/clean/:jobId/status
 */
export const getJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await cleaningService.getJobStatus(jobId);

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cleaning report
 * GET /api/v1/clean/:jobId/report
 */
export const getReport = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const report = await cleaningService.getReport(jobId);

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cleaned data
 * GET /api/v1/clean/:jobId/data
 */
export const getCleanedData = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 100 } = req.query;

    const allRows = await cleaningService.getCleanedData(jobId);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedRows = allRows.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        rows: paginatedRows,
        pagination: {
          total: allRows.length,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(allRows.length / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download cleaned data
 * GET /api/v1/clean/:jobId/download
 */
export const downloadCleanedData = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { format = 'json' } = req.query;

    const rows = await cleaningService.getCleanedData(jobId);
    const job = await cleaningService.getJobStatus(jobId);

    if (format === 'csv') {
      const { parse } = await import('json2csv');
      const csv = parse(rows);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=cleaned_${job.uploadId}.csv`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=cleaned_${job.uploadId}.json`);
      res.json(rows);
    }
  } catch (error) {
    next(error);
  }
};
