/**
 * Domain Detection Routes (Module 3)
 */

import express from 'express';
import { detectDomain, confirmDomain, getDetectionStatus } from '../controllers/domainController.js';

const router = express.Router();

/**
 * POST /api/v1/domain/detect
 * Detect domain from cleaned data
 * Body: { cleaningJobId }
 */
router.post('/detect', detectDomain);

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

export default router;
