/**
 * Domain Detection Routes (Module 3)
 */

import express from 'express';
import { detectDomain, confirmDomain, getDetectionStatus, detectProjectDomain, listDomains } from '../controllers/domainController.js';

const router = express.Router();

/**
 * POST /api/v1/domain/detect
 * Detect domain from cleaned data
 * Body: { cleaningJobId }
 */
router.post('/detect', detectDomain);

/**
 * POST /api/v1/domain/detect-project
 * Detect domain across multiple files in a project
 * Body: { projectId, cleaningJobIds }
 */
router.post('/detect-project', detectProjectDomain);

/**
 * POST /api/v1/domain/confirm
 * Confirm/manually select domain
 * Body: { domainJobId, selectedDomain }
 */
router.post('/confirm', confirmDomain);

/**
 * GET /api/v1/domain/:domainJobId/status
 * Get domain detection job status
 */
router.get('/:domainJobId/status', getDetectionStatus);

/**
 * GET /api/v1/domain/list
 * Get list of all available domains
 */
router.get('/list', listDomains);

export default router;
