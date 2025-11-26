/**
 * KPI Extraction Controller (Module 4)
 * Handles KPI identification and selection requests
 */

import kpiExtractionService from '../services/kpiExtractionService.js';

export const extractKpis = async (req, res) => {
  try {
    const { cleaningJobId, domainJobId } = req.body;

    if (!cleaningJobId || !domainJobId) {
      return res.status(400).json({ 
        error: 'Missing cleaningJobId or domainJobId' 
      });
    }

    const extraction = await kpiExtractionService.extractKpis(cleaningJobId, domainJobId);

    return res.status(200).json({
      success: true,
      data: extraction
    });

  } catch (error) {
    console.error('KPI extraction error:', error);
    return res.status(500).json({
      error: 'KPI extraction failed',
      message: error.message
    });
  }
};

export const getKpiLibrary = async (req, res) => {
  try {
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({ 
        error: 'Missing domain parameter' 
      });
    }

    const library = kpiExtractionService.getKpiLibrary(domain);

    return res.status(200).json({
      success: true,
      data: {
        domain: domain,
        totalKpis: library.length,
        kpis: library
      }
    });

  } catch (error) {
    console.error('Get KPI library error:', error);
    return res.status(500).json({
      error: 'Failed to get KPI library',
      message: error.message
    });
  }
};

export const selectKpis = async (req, res) => {
  try {
    const { kpiJobId, selectedKpiIds, manualKpis } = req.body;

    if (!kpiJobId || !selectedKpiIds || !Array.isArray(selectedKpiIds)) {
      return res.status(400).json({ 
        error: 'Missing kpiJobId or selectedKpiIds (array)' 
      });
    }

    const selection = await kpiExtractionService.selectKpis(kpiJobId, selectedKpiIds, manualKpis);

    return res.status(200).json({
      success: true,
      data: selection
    });

  } catch (error) {
    console.error('KPI selection error:', error);
    return res.status(500).json({
      error: 'KPI selection failed',
      message: error.message
    });
  }
};

export const getKpiJobStatus = async (req, res) => {
  try {
    const { kpiJobId } = req.params;

    const status = await kpiExtractionService.getKpiJobStatus(kpiJobId);

    return res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Get KPI job status error:', error);
    return res.status(500).json({
      error: 'Failed to get KPI job status',
      message: error.message
    });
  }
};
