/**
 * Domain Detection Controller (Module 3)
 * Handles domain classification requests
 */

import domainDetectionService from '../services/domainDetectionService.js';

export const detectDomain = async (req, res) => {
  try {
    const { cleaningJobId } = req.body;

    if (!cleaningJobId) {
      return res.status(400).json({ 
        error: 'Missing cleaningJobId' 
      });
    }

    const detection = await domainDetectionService.detectDomain(cleaningJobId);

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
