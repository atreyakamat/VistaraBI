/**
 * Cleaning API Service
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

export interface CleaningConfig {
  imputation?: Record<string, 'median' | 'mode' | 'forward-fill'>;
  outliers?: {
    enabled: boolean;
    columns?: string[];
    threshold?: number;
    remove?: boolean;
  };
  deduplication?: {
    enabled: boolean;
    keyColumns?: string[];
  };
  standardization?: Record<string, {
    type: 'phone' | 'email' | 'date' | 'currency';
    format?: string;
  }>;
  detectionLog?: Array<{
    column: string;
    dataType: string;
    missingCount?: number;
    missingRatio?: number;
    reasoning?: string;
    recommendedImputation?: string;
    sampleValues?: any[];
  }>;
}

export interface CleaningJob {
  id: string;
  jobId?: string; // Alias for id
  uploadId: string;
  status: 'running' | 'completed' | 'failed';
  config: CleaningConfig;
  stats?: any;
  cleanedTableName?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CleaningReport {
  job: CleaningJob;
  logs: any[];
  report: any;
}

class CleaningApiService {
  /**
   * Start cleaning pipeline
   */
  async startCleaning(uploadId: string, config?: CleaningConfig): Promise<CleaningJob> {
    const response = await axios.post(`${API_BASE}/clean`, {
      uploadId,
      config: config || {}
    });
    return response.data.data;
  }

  /**
   * Get auto-configuration suggestions
   */
  async autoConfig(uploadId: string): Promise<CleaningConfig> {
    const response = await axios.post(`${API_BASE}/clean/auto-config`, {
      uploadId
    });
    return response.data.data;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<CleaningJob> {
    const response = await axios.get(`${API_BASE}/clean/${jobId}/status`);
    return response.data.data;
  }

  /**
   * Get cleaning report
   */
  async getReport(jobId: string): Promise<CleaningReport> {
    const response = await axios.get(`${API_BASE}/clean/${jobId}/report`);
    return response.data.data;
  }

  /**
   * Get cleaned data
   */
  async getCleanedData(jobId: string, page = 1, limit = 100): Promise<any> {
    const response = await axios.get(`${API_BASE}/clean/${jobId}/data`, {
      params: { page, limit }
    });
    return response.data.data;
  }

  /**
   * Download cleaned data
   */
  getDownloadUrl(jobId: string, format: 'json' | 'csv' = 'csv'): string {
    return `${API_BASE}/clean/${jobId}/download?format=${format}`;
  }
}

export const cleaningApi = new CleaningApiService();
