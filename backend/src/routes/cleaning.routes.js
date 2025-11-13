/**
 * Cleaning Routes
 */

import express from 'express';
const router = express.Router();
import * as cleaningController from '../controllers/cleaningController.js';

// Start cleaning pipeline
router.post('/', cleaningController.startCleaning);

// Auto-configure cleaning pipeline
router.post('/auto-config', cleaningController.autoConfig);

// Get job status
router.get('/:jobId/status', cleaningController.getJobStatus);

// Get cleaning report
router.get('/:jobId/report', cleaningController.getReport);

// Get cleaned data
router.get('/:jobId/data', cleaningController.getCleanedData);

// Download cleaned data
router.get('/:jobId/download', cleaningController.downloadCleanedData);

export default router;
