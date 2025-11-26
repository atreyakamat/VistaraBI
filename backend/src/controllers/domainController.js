/**
 * Domain Detection Controller (Module 3)
 * Handles domain classification requests
 */

import domainDetectionService from '../services/domainDetectionService.js';

export const detectDomain = async (req, res) => {
  try {
    const { cleaningJobId, cleaningJobIds } = req.body;

    // Support both single and multiple cleaning jobs
    let jobIds;
    if (cleaningJobIds) {
      jobIds = Array.isArray(cleaningJobIds) ? cleaningJobIds : [cleaningJobIds];
    } else if (cleaningJobId) {
      jobIds = [cleaningJobId];
    } else {
      return res.status(400).json({ 
        error: 'Missing cleaningJobId or cleaningJobIds' 
      });
    }

    // If single job, use existing method
    let detection;
    if (jobIds.length === 1) {
      detection = await domainDetectionService.detectDomain(jobIds[0]);
    } else {
      // Multiple jobs not yet implemented in service
      // For now, detect from first job
      detection = await domainDetectionService.detectDomain(jobIds[0]);
    }

    return res.status(200).json({
      success: true,
      data: detection
    });

  } catch (error) {
    console.error('Domain detection error:', error);
    return res.status(500).json({
      error: 'Domain detection failed',
      message: error.message
    });
  }
};

export const confirmDomain = async (req, res) => {
  try {
    const { domainJobId, selectedDomain } = req.body;

    if (!domainJobId || !selectedDomain) {
      return res.status(400).json({ 
        error: 'Missing domainJobId or selectedDomain' 
      });
    }

    const confirmation = await domainDetectionService.confirmDomain(domainJobId, selectedDomain);

    return res.status(200).json({
      success: true,
      data: confirmation
    });

  } catch (error) {
    console.error('Domain confirmation error:', error);
    return res.status(500).json({
      error: 'Domain confirmation failed',
      message: error.message
    });
  }
};

export const getDetectionStatus = async (req, res) => {
  try {
    const { domainJobId } = req.params;

    const status = await domainDetectionService.getDetectionStatus(domainJobId);

    return res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Get detection status error:', error);
    return res.status(500).json({
      error: 'Failed to get detection status',
      message: error.message
    });
  }
};

export const detectProjectDomain = async (req, res) => {
  try {
    const { projectId, cleaningJobIds } = req.body;

    if (!projectId || !cleaningJobIds || !Array.isArray(cleaningJobIds)) {
      return res.status(400).json({ 
        error: 'Missing projectId or cleaningJobIds array' 
      });
    }

    const detection = await domainDetectionService.detectProjectDomain(projectId, cleaningJobIds);

    return res.status(200).json({
      success: true,
      data: detection
    });

  } catch (error) {
    console.error('Project domain detection error:', error);
    return res.status(500).json({
      error: 'Project domain detection failed',
      message: error.message
    });
  }
};

export const listDomains = async (req, res) => {
  try {
    const domains = await domainDetectionService.listAvailableDomains();

    return res.status(200).json({
      success: true,
      data: domains
    });

  } catch (error) {
    console.error('List domains error:', error);
    return res.status(500).json({
      error: 'Failed to list domains',
      message: error.message
    });
  }
};
