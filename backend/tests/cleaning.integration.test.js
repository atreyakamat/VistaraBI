/**
 * Module 2 Integration Tests - Data Cleaning Pipeline
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:5000/api/v1';

describe('Module 2: Data Cleaning Pipeline', () => {
  let uploadId;
  let cleaningJobId;

  beforeAll(async () => {
    // Upload test CSV file
    const testFile = path.join(__dirname, '../test_data/train_large.csv');
    const formData = new FormData();
    const blob = new Blob([fs.readFileSync(testFile)], { type: 'text/csv' });
    formData.append('file', blob, 'train_large.csv');

    const uploadResponse = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    
    expect(uploadResponse.ok).toBe(true);
    const uploadData = await uploadResponse.json();
    uploadId = uploadData.data.uploadId;
    
    console.log('✓ Test file uploaded:', uploadId);
  });

  it('should auto-configure cleaning pipeline', async () => {
    const response = await fetch(`${API_BASE}/clean/auto-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('imputation');
    expect(data.data).toHaveProperty('outliers');
    expect(data.data).toHaveProperty('deduplication');
    expect(data.data).toHaveProperty('standardization');

    console.log('✓ Auto-configuration generated');
  });

  it('should start cleaning pipeline', async () => {
    const config = {
      imputation: {
        'Delivery_person_Age': 'median',
        'multiple_deliveries': 'median'
      },
      outliers: {
        enabled: true,
        threshold: 1.5,
        remove: false
      },
      deduplication: {
        enabled: true,
        keyColumns: []
      },
      standardization: {}
    };

    const response = await fetch(`${API_BASE}/clean`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, config })
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('jobId');
    expect(data.data.status).toBe('completed');

    cleaningJobId = data.data.jobId;
    console.log('✓ Cleaning pipeline completed:', cleaningJobId);
  });

  it('should get job status', async () => {
    const response = await fetch(`${API_BASE}/clean/${cleaningJobId}/status`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('completed');
    expect(data.data).toHaveProperty('stats');

    console.log('✓ Job status retrieved');
    console.log('  - Original rows:', data.data.stats.original.totalRows);
    console.log('  - Final rows:', data.data.stats.final.totalRows);
    console.log('  - Rows removed:', data.data.stats.rowsRemoved);
  });

  it('should generate cleaning report', async () => {
    const response = await fetch(`${API_BASE}/clean/${cleaningJobId}/report`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('job');
    expect(data.data).toHaveProperty('logs');
    expect(data.data).toHaveProperty('report');

    console.log('✓ Cleaning report generated');
    console.log('  - Total operations:', data.data.logs.length);
  });

  it('should retrieve cleaned data', async () => {
    const response = await fetch(`${API_BASE}/clean/${cleaningJobId}/data?page=1&limit=10`);
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('rows');
    expect(data.data).toHaveProperty('pagination');
    expect(Array.isArray(data.data.rows)).toBe(true);

    console.log('✓ Cleaned data retrieved');
    console.log('  - Total rows:', data.data.pagination.total);
    console.log('  - Page size:', data.data.rows.length);
  });

  it('should download cleaned data as CSV', async () => {
    const response = await fetch(`${API_BASE}/clean/${cleaningJobId}/download?format=csv`);
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain('text/csv');

    console.log('✓ CSV download endpoint working');
  });

  it('should download cleaned data as JSON', async () => {
    const response = await fetch(`${API_BASE}/clean/${cleaningJobId}/download?format=json`);
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain('application/json');

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);

    console.log('✓ JSON download endpoint working');
  });
});
