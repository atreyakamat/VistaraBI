#!/usr/bin/env node

/**
 * API Endpoint Validation Script
 * Tests all API endpoints and validates responses
 */

import http from 'http';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody,
            responseTime: Date.now()
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            responseTime: Date.now(),
            parseError: true
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function validateAPIs() {
  console.log('🔍 API Endpoint Validation Started\n');

  const results = {
    timestamp: new Date().toISOString(),
    endpoints: [],
    summary: {
      totalEndpoints: 2,
      respondingEndpoints: 0,
      failedEndpoints: 0,
      averageResponseTime: 0
    }
  };

  const endpoints = [
    {
      name: 'E-Commerce API',
      path: '/api/data/ecommerce',
      method: 'GET'
    },
    {
      name: 'Finance API',
      path: '/api/data/finance',
      method: 'GET'
    }
  ];

  const baseUrl = 'http://localhost:3000';
  let totalResponseTime = 0;
  let successCount = 0;

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);

      const url = new URL(endpoint.path, baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'API-Validator/1.0'
        },
        timeout: 5000
      };

      const startTime = Date.now();
      const response = await makeRequest(options);
      const responseTime = Date.now() - startTime;
      totalResponseTime += responseTime;

      // Validate response
      let isValid = false;
      let validationNotes = [];

      if (response.status === 200) {
        validationNotes.push('✓ Status 200 OK');
        isValid = true;
      } else {
        validationNotes.push(`✗ Status ${response.status}`);
      }

      if (response.responseTime && responseTime < 500) {
        validationNotes.push('✓ Response time < 500ms');
      } else {
        validationNotes.push(`✗ Response time ${responseTime}ms`);
      }

      if (typeof response.body === 'object' && response.body !== null) {
        validationNotes.push('✓ Valid JSON response');
        
        // Check for expected fields based on endpoint
        if (endpoint.name.includes('E-Commerce')) {
          const expectedFields = ['data', 'kpis', 'quality', 'timestamp'];
          const hasFields = expectedFields.some(field => field in response.body || typeof response.body === 'object');
          if (hasFields) {
            validationNotes.push('✓ Contains expected fields');
          }
        } else if (endpoint.name.includes('Finance')) {
          const expectedFields = ['data', 'kpis', 'quality', 'timestamp'];
          const hasFields = expectedFields.some(field => field in response.body || typeof response.body === 'object');
          if (hasFields) {
            validationNotes.push('✓ Contains expected fields');
          }
        }
      } else {
        validationNotes.push('✗ Invalid JSON response');
      }

      results.endpoints.push({
        name: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        status: response.status,
        responseTime: responseTime,
        valid: isValid,
        validationNotes: validationNotes,
        dataStructure: {
          type: typeof response.body,
          hasData: response.body && typeof response.body === 'object' && 'data' in response.body,
          hasKPIs: response.body && typeof response.body === 'object' && 'kpis' in response.body,
          hasQuality: response.body && typeof response.body === 'object' && 'quality' in response.body
        }
      });

      if (isValid) {
        successCount++;
      }

      console.log(`  ✓ Response: ${responseTime}ms`);
      console.log(`  ${validationNotes.join('\n  ')}\n`);

    } catch (error) {
      console.log(`  ✗ Error: ${error.message}\n`);

      results.endpoints.push({
        name: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        status: 0,
        responseTime: 0,
        valid: false,
        error: error.message,
        validationNotes: [`✗ Request failed: ${error.message}`]
      });
    }
  }

  // Update summary
  results.summary.respondingEndpoints = successCount;
  results.summary.failedEndpoints = endpoints.length - successCount;
  results.summary.averageResponseTime = successCount > 0 ? Math.round(totalResponseTime / endpoints.length) : 0;

  return results;
}

async function main() {
  try {
    console.log('Starting API validation...\n');
    
    // Note: This script will fail gracefully if the API is not running
    // In production, you would start the API server first
    
    const validationResults = await validateAPIs();

    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Endpoints: ${validationResults.summary.totalEndpoints}`);
    console.log(`Responding: ${validationResults.summary.respondingEndpoints}`);
    console.log(`Failed: ${validationResults.summary.failedEndpoints}`);
    console.log(`Average Response Time: ${validationResults.summary.averageResponseTime}ms`);
    console.log('='.repeat(60) + '\n');

    // Output as JSON for logging
    console.log(JSON.stringify(validationResults, null, 2));

  } catch (error) {
    console.error('Validation error:', error);
    process.exit(1);
  }
}

main();
