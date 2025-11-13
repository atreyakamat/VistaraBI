/**
 * Test script to verify the full data cleaning and report generation flow
 * Run with: node test-report-flow.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5001/api/v1';

// Create a test CSV file
const testCsvContent = `Name,Age,Email,Salary,City
John Doe,25,john@example.com,50000,New York
Jane Smith,,jane@example.com,60000,
Bob Johnson,30,bob@example,70000,Chicago
Alice Brown,35,alice@example.com,,Boston
John Doe,25,john@example.com,50000,New York
Mary Wilson,28,mary@example.com,55000,Seattle
Tom Davis,,tom@example.com,65000,Denver
Sarah Miller,32,sarah@example.com,58000,
Mike Anderson,29,mike@example.com,62000,Portland
Lisa Taylor,31,lisa@example.com,,Miami`;

async function testFullFlow() {
  console.log('🧪 Testing Full Report Generation Flow\n');

  try {
    // Step 1: Create test CSV file
    console.log('📝 Step 1: Creating test CSV file...');
    const testFilePath = path.join(__dirname, 'test-data.csv');
    fs.writeFileSync(testFilePath, testCsvContent);
    console.log('✅ Test CSV created:', testFilePath);

    // Step 2: Upload CSV file
    console.log('\n📤 Step 2: Uploading CSV file...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));

    const uploadResponse = await axios.post(`${API_BASE}/upload`, formData, {
      headers: formData.getHeaders()
    });

    if (!uploadResponse.data.success) {
      throw new Error('Upload failed');
    }

    const uploadId = uploadResponse.data.data.id;
    console.log('✅ File uploaded successfully!');
    console.log('   Upload ID:', uploadId);
    console.log('   File Name:', uploadResponse.data.data.fileName);
    console.log('   Rows:', uploadResponse.data.data.rowCount);

    // Step 3: Auto-configure cleaning pipeline
    console.log('\n⚙️  Step 3: Getting auto-configuration...');
    const autoConfigResponse = await axios.post(`${API_BASE}/clean/auto-config`, {
      uploadId
    });

    const config = autoConfigResponse.data.data;
    console.log('✅ Auto-configuration generated:');
    console.log('   Imputation strategies:', Object.keys(config.imputation || {}).length, 'columns');
    console.log('   Outlier detection:', config.outliers?.enabled ? 'Enabled' : 'Disabled');
    console.log('   Deduplication:', config.deduplication?.enabled ? 'Enabled' : 'Disabled');
    console.log('   Standardization:', Object.keys(config.standardization || {}).length, 'columns');

    // Step 4: Start cleaning
    console.log('\n🧹 Step 4: Starting data cleaning...');
    const cleanResponse = await axios.post(`${API_BASE}/clean`, {
      uploadId,
      config
    });

    const jobId = cleanResponse.data.data.jobId;
    console.log('✅ Cleaning job started!');
    console.log('   Job ID:', jobId);
    console.log('   Status:', cleanResponse.data.data.status);

    // Step 5: Wait for completion (poll status)
    console.log('\n⏳ Step 5: Waiting for cleaning to complete...');
    let completed = false;
    let attempts = 0;
    let finalStatus;

    while (!completed && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await axios.get(`${API_BASE}/clean/${jobId}/status`);
      finalStatus = statusResponse.data.data;
      
      console.log(`   Attempt ${attempts + 1}: Status = ${finalStatus.status}`);
      
      if (finalStatus.status === 'completed' || finalStatus.status === 'failed') {
        completed = true;
      }
      attempts++;
    }

    if (finalStatus.status === 'failed') {
      console.log('❌ Cleaning failed:', finalStatus.error);
      return;
    }

    if (!completed) {
      console.log('⏱️  Timeout waiting for job to complete');
      return;
    }

    console.log('✅ Cleaning completed successfully!');
    console.log('   Original rows:', finalStatus.stats?.original?.totalRows);
    console.log('   Final rows:', finalStatus.stats?.final?.totalRows);
    console.log('   Rows removed:', finalStatus.stats?.rowsRemoved);

    // Step 6: Get report
    console.log('\n📊 Step 6: Fetching cleaning report...');
    const reportResponse = await axios.get(`${API_BASE}/clean/${jobId}/report`);

    const report = reportResponse.data.data;
    console.log('✅ Report fetched successfully!');
    console.log('\n📋 Report Structure:');
    console.log('   Job ID:', report.job?.id);
    console.log('   Job Status:', report.job?.status);
    console.log('   Upload ID:', report.job?.uploadId);
    console.log('   Logs count:', report.logs?.length);
    console.log('   Operations:', report.report?.operations?.length);

    // Display statistics
    if (report.job?.stats) {
      console.log('\n📊 Cleaning Statistics:');
      console.log('   Original rows:', report.job.stats.original?.totalRows);
      console.log('   Final rows:', report.job.stats.final?.totalRows);
      console.log('   Rows removed:', report.job.stats.rowsRemoved);
      console.log('   Removal percentage:', report.job.stats.removalPercentage + '%');

      if (report.job.stats.stages?.imputation) {
        console.log('\n🔢 Imputation Stage:');
        console.log('   Total missing values:', report.job.stats.stages.imputation.totalMissing);
        console.log('   Columns processed:', Object.keys(report.job.stats.stages.imputation.byColumn || {}).length);
        
        Object.entries(report.job.stats.stages.imputation.byColumn || {}).forEach(([col, stats]) => {
          console.log(`   - ${col}: ${stats.strategy.toUpperCase()} (filled ${stats.missingBefore - stats.missingAfter} values)`);
        });
      }

      if (report.job.stats.stages?.outliers) {
        console.log('\n📈 Outlier Detection:');
        console.log('   Total outliers found:', report.job.stats.stages.outliers.totalOutliers);
        console.log('   Columns checked:', Object.keys(report.job.stats.stages.outliers.byColumn || {}).length);
      }

      if (report.job.stats.stages?.deduplication) {
        console.log('\n🔄 Deduplication:');
        console.log('   Duplicates removed:', report.job.stats.stages.deduplication.duplicateCount);
        console.log('   Unique rows:', report.job.stats.stages.deduplication.uniqueCount);
      }
    }

    console.log('\n✅ Full flow test completed successfully!');
    console.log('\n🌐 You can now view the report at:');
    console.log(`   http://localhost:3000/cleaning/${jobId}/report`);

    // Cleanup
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Test file cleaned up');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('   Stack:', error.stack);
  }
}

// Run the test
console.log('Starting test at', new Date().toISOString());
console.log('Backend URL:', API_BASE);
console.log('---'.repeat(20));

testFullFlow().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('Test completed');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
