/**
 * DASHBOARD ROUTES
 * API endpoints for dashboard generation and interaction
 */

import express from 'express';
import dashboardGenerationService from '../services/dashboardGenerationService.js';
import loggingService from '../services/loggingService.js';

const router = express.Router();

/**
 * POST /api/dashboard/generate
 * Generate dashboard for a dataset
 */
router.post('/generate', async (req, res) => {
  try {
    const { datasetId, options, selectedKpiIds, manualKpis, kpiJobId, domainJobId } = req.body;

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        error: 'Dataset ID is required'
      });
    }

    loggingService.info('Dashboard generation requested', { 
      datasetId, 
      options,
      selectedKpiIds: selectedKpiIds?.length,
      manualKpis: manualKpis?.length,
      kpiJobId,
      domainJobId
    });

    // Merge options with KPI data
    const generationOptions = {
      ...options,
      selectedKpiIds,
      manualKpis,
      kpiJobId,
      domainJobId
    };

    const dashboard = await dashboardGenerationService.generateDashboard(datasetId, generationOptions);

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    loggingService.error('Dashboard generation failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Dashboard generation failed'
    });
  }
});

/**
 * GET /api/dashboard/:datasetId
 * Get dashboard for a dataset
 */
router.get('/:datasetId', async (req, res) => {
  try {
    const { datasetId } = req.params;
    const options = req.query;

    loggingService.info('Dashboard requested', { datasetId, options });

    const dashboard = await dashboardGenerationService.generateDashboard(datasetId, options);

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    loggingService.error('Dashboard fetch failed', {
      error: error.message,
      datasetId: req.params.datasetId
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard'
    });
  }
});

/**
 * POST /api/dashboard/:datasetId/export
 * Export dashboard (PDF, PNG, CSV)
 */
router.post('/:datasetId/export', async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { filters, format = 'pdf' } = req.body;

    loggingService.info('Dashboard export requested', { datasetId, format });

    // TODO: Implement actual export functionality
    // For now, return a placeholder response

    res.json({
      success: true,
      message: 'Export functionality will be implemented',
      data: {
        format,
        datasetId,
        filters
      }
    });

  } catch (error) {
    loggingService.error('Dashboard export failed', {
      error: error.message,
      datasetId: req.params.datasetId
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Export failed'
    });
  }
});

/**
 * POST /api/dashboard/:datasetId/filter
 * Apply filters to dashboard data (server-side filtering)
 */
router.post('/:datasetId/filter', async (req, res) => {
  try {
    const { datasetId } = req.params;
    const { filters } = req.body;

    loggingService.info('Server-side filtering requested', { datasetId, filters });

    // TODO: Implement server-side filtering
    // This would query the database with filters applied

    res.json({
      success: true,
      data: {
        datasetId,
        filters,
        message: 'Server-side filtering will be implemented'
      }
    });

  } catch (error) {
    loggingService.error('Server-side filtering failed', {
      error: error.message,
      datasetId: req.params.datasetId
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Filtering failed'
    });
  }
});

/**
 * GET /api/dashboard/:datasetId/performance
 * Get performance metrics for dashboard
 */
router.get('/:datasetId/performance', async (req, res) => {
  try {
    const { datasetId } = req.params;

    // TODO: Implement performance tracking
    const performanceData = {
      datasetId,
      averageLoadTime: 2500,
      averageFilterTime: 350,
      chartRenderTimes: [],
      userSessions: 0,
      errorRate: 0
    };

    res.json({
      success: true,
      data: performanceData
    });

  } catch (error) {
    loggingService.error('Performance metrics fetch failed', {
      error: error.message,
      datasetId: req.params.datasetId
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch performance metrics'
    });
  }
});

export default router;
