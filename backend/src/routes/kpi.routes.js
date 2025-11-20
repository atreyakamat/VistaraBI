/**
 * KPI Extraction Routes (Module 4)
 */

import express from 'express';
import { extractKpis, getKpiLibrary, selectKpis, getKpiJobStatus } from '../controllers/kpiController.js';

const router = express.Router();

/**
 * POST /api/v1/kpi/extract
 * Extract KPIs from cleaned data for confirmed domain
 * Body: { cleaningJobId, domainJobId }
 */
router.post('/extract', extractKpis);

/**
 * GET /api/v1/kpi/library?domain=retail
 * Get KPI library for specific domain
 */
router.get('/library', getKpiLibrary);

/**
 * POST /api/v1/kpi/select
 * Select KPIs for dashboard creation
 * Body: { kpiJobId, selectedKpiIds: [] }
 */
router.post('/select', selectKpis);

/**
 * GET /api/v1/kpi/:kpiJobId/status
 * Get KPI extraction job status
 */
router.get('/:kpiJobId/status', getKpiJobStatus);

export default router;
