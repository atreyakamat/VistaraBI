/**
 * Complete End-to-End Flow Test
 * Tests: Upload → Clean → Detect Domain → Extract KPIs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FormData, Blob } from 'formdata-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:5001/api/v1';
const TEST_FILE = path.join(__dirname, '..', '..', 'test-data', 'retail-sample-data.csv');

console.log('🧪 Starting Complete Flow Test\n');
console.log('═'.repeat(60));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteFlow() {
  try {
    // ===== STEP 1: UPLOAD =====
    console.log('\n📤 STEP 1: Uploading Test File');
    console.log('File:', TEST_FILE);
    
    if (!fs.existsSync(TEST_FILE)) {
      throw new Error(`Test file not found: ${TEST_FILE}`);
    }

    const fileContent = fs.readFileSync(TEST_FILE);
    const blob = new Blob([fileContent], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'retail-sample-data.csv');

    const uploadResponse = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Upload failed: ${error}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload successful');
    
    const uploadData = uploadResult.data || uploadResult;
    const uploadId = uploadData.uploadId || uploadData.id;
    
    console.log('   Upload ID:', uploadId);
    console.log('   File:', uploadData.fileName || uploadData.originalName);
    console.log('   Status:', uploadData.status);
    
    // Wait for upload to be processed
    console.log('   Waiting for upload to be processed...');
    let uploadProcessed = false;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const statusResponse = await fetch(`${API_BASE}/upload/${uploadId}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.status === 'completed' || statusData.recordsProcessed > 0) {
          uploadProcessed = true;
          console.log('   ✅ Upload processed:', statusData.recordsProcessed, 'records');
          break;
        }
      }
    }
    
    if (!uploadProcessed) {
      throw new Error('Upload processing timeout');
    }

    // ===== STEP 2: CLEANING =====
    console.log('\n🧹 STEP 2: Cleaning Data');
    
    const cleaningConfig = {
      uploadId: uploadId,
      removeNulls: true,
      removeDuplicates: true,
      standardizeFormats: true,
      trimWhitespace: true
    };

    const cleanResponse = await fetch(`${API_BASE}/clean`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleaningConfig)
    });

    if (!cleanResponse.ok) {
      const error = await cleanResponse.text();
      throw new Error(`Cleaning failed: ${error}`);
    }

    const cleanResult = await cleanResponse.json();
    const cleanData = cleanResult.data || cleanResult;
    
    console.log('✅ Cleaning successful');
    const cleaningJobId = cleanData.cleaningJobId || cleanData.jobId || cleanData.id;
    console.log('   Cleaning Job ID:', cleaningJobId);
    console.log('   Status:', cleanData.status);
    if (cleanData.stats) {
      console.log('   Original rows:', cleanData.stats.original?.rowCount || 'N/A');
      console.log('   Cleaned rows:', cleanData.stats.final?.rowCount || 'N/A');
      console.log('   Duration:', cleanData.duration ? `${cleanData.duration}ms` : 'N/A');
    }

    // ===== STEP 3: DOMAIN DETECTION =====
    console.log('\n🔍 STEP 3: Detecting Domain');
    
    const domainResponse = await fetch(`${API_BASE}/domain/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cleaningJobId: cleaningJobId })
    });

    if (!domainResponse.ok) {
      const error = await domainResponse.text();
      throw new Error(`Domain detection failed: ${error}`);
    }

    const domainResult = await domainResponse.json();
    const domainData = domainResult.data || domainResult;
    
    console.log('✅ Domain detection successful');
    const domainJobId = domainData.domainJobId || domainData.jobId || domainData.id;
    const detectedDomain = domainData.detectedDomain || domainData.domain;
    const confidence = domainData.confidence || 0;
    const alternativeDomains = domainData.alternativeDomains || domainData.alternatives || [];
    
    console.log('   Domain Job ID:', domainJobId);
    console.log('   Detected Domain:', detectedDomain);
    console.log('   Confidence:', Math.round(confidence) + '%');
    console.log('   Alternative domains:');
    alternativeDomains.slice(0, 3).forEach(alt => {
      console.log(`      - ${alt.domain}: ${Math.round(alt.confidence)}%`);
    });

    // ===== STEP 4: KPI EXTRACTION =====
    console.log('\n📊 STEP 4: Extracting KPIs');
    
    const kpiResponse = await fetch(`${API_BASE}/kpi/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cleaningJobId: cleaningJobId,
        domainJobId: domainJobId
      })
    });

    if (!kpiResponse.ok) {
      const error = await kpiResponse.json();
      throw new Error(`KPI extraction failed: ${error.message || error.error}`);
    }

    const kpiResult = await kpiResponse.json();
    const kpiData = kpiResult.data || kpiResult;
    
    console.log('✅ KPI extraction successful');
    console.log('   KPI Job ID:', kpiData.kpiJobId);
    console.log('   Domain:', kpiData.domain);
    console.log('   Total KPIs in Library:', kpiData.totalKpisInLibrary);
    console.log('   Feasible KPIs:', kpiData.feasibleCount);
    console.log('   Infeasible KPIs:', kpiData.infeasibleCount);
    console.log('   Avg Completeness:', Math.round(kpiData.completenessAverage * 100) + '%');
    
    console.log('\n🏆 TOP 10 RECOMMENDED KPIs:');
    kpiData.top10Kpis.forEach((kpi, idx) => {
      console.log(`   ${idx + 1}. ${kpi.name}`);
      console.log(`      Priority: ${kpi.priority}, Completeness: ${Math.round(kpi.completeness * 100)}%`);
      console.log(`      Formula: ${kpi.formula_expr}`);
      console.log(`      Columns: ${kpi.columns_needed.join(', ')}`);
    });

    if (kpiData.unresolvedColumns.length > 0) {
      console.log('\n⚠️  Unresolved Columns:', kpiData.unresolvedColumns.join(', '));
    } else {
      console.log('\n✅ All columns resolved successfully!');
    }

    console.log('\n📍 COLUMN MAPPING:');
    Object.entries(kpiData.canonicalMapping).forEach(([canonical, userCol]) => {
      console.log(`   ${canonical} ← ${userCol}`);
    });

    // ===== SUMMARY =====
    console.log('\n═'.repeat(60));
    console.log('🎉 COMPLETE FLOW TEST PASSED!\n');
    console.log('Test Results Summary:');
    console.log(`✅ Upload ID: ${uploadId}`);
    console.log(`✅ Cleaning Job ID: ${cleaningJobId}`);
    console.log(`✅ Domain Job ID: ${domainJobId}`);
    console.log(`✅ KPI Job ID: ${kpiData.kpiJobId}`);
    console.log(`✅ Detected Domain: ${detectedDomain}`);
    console.log(`✅ Feasible KPIs: ${kpiData.feasibleCount}/${kpiData.totalKpisInLibrary}`);
    console.log(`✅ Column Resolution: ${Object.keys(kpiData.canonicalMapping).length} columns mapped`);
    
    console.log('\n🌐 Test in Browser:');
    console.log(`   1. Go to: http://localhost:3001`);
    console.log(`   2. Upload: test-data/retail-sample-data.csv`);
    console.log(`   3. Configure cleaning and proceed`);
    console.log(`   4. View domain detection results`);
    console.log(`   5. Click "Continue with Domain"`);
    console.log(`   6. See KPI selection page with ${kpiData.top10Kpis.length} recommended KPIs`);
    console.log('\n═'.repeat(60));

    return {
      uploadId,
      cleaningJobId,
      domainJobId,
      kpiJobId: kpiData.kpiJobId,
      success: true
    };

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run the test
testCompleteFlow().then(result => {
  if (result.success) {
    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Tests failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
