/**
 * Domain Detection API Service
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/v1';

export interface DomainDetection {
  domainJobId: string;
  domain: string;
  confidence: number;
  decision: 'auto_detect' | 'show_top_3' | 'manual_select';
  primaryMatches: string[];
  keywordMatches: string[];
  top3Alternatives: Array<{ domain: string; score: number }>;
  allDomains: string[];
}

export interface DomainConfirmation {
  status: string;
  domain: string;
  cleaningJobId: string;
  uploadId: string;
}

export interface DomainJob {
  id: string;
  cleaningJobId: string;
  detectedDomain: string;
  confidence: number;
  decision: string;
  primaryMatches: string[];
  keywordMatches: string[];
  allScores: Record<string, number>;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Detect domain from cleaned data
 */
export const detectDomain = async (cleaningJobId: string): Promise<DomainDetection> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/domain/detect`, {
      cleaningJobId
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Domain detection failed:', error);
    throw new Error(error.response?.data?.message || 'Failed to detect domain');
  }
};

/**
 * Confirm or manually select domain
 */
export const confirmDomain = async (
  domainJobId: string, 
  selectedDomain: string
): Promise<DomainConfirmation> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/domain/confirm`, {
      domainJobId,
      selectedDomain
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Domain confirmation failed:', error);
    throw new Error(error.response?.data?.message || 'Failed to confirm domain');
  }
};

/**
 * Get domain detection job status
 */
export const getDomainStatus = async (domainJobId: string): Promise<DomainJob> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/domain/${domainJobId}/status`);
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to get domain status:', error);
    throw new Error(error.response?.data?.message || 'Failed to get domain status');
  }
};
