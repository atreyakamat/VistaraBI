import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

const baseUrl = 'http://localhost:5001/api';

async function testMultiFileUpload() {
  try {
    console.log('\n=== Testing Multi-File Intelligence Pipeline ===\n');
    
    // Step 1: Upload files
    console.log('Step 1: Uploading 3 CSV files...');
    const formData = new FormData();
    formData.append('name', 'E-Commerce Analytics Project');
    formData.append('description', 'Testing multi-file intelligence with related datasets');
    formData.append('files', fs.createReadStream('./test_data/customers.csv'));
    formData.append('files', fs.createReadStream('./test_data/products.csv'));
    formData.append('files', fs.createReadStream('./test_data/sales.csv'));
    
    const uploadResponse = await axios.post(`${baseUrl}/projects`, formData, {
      headers: formData.getHeaders()
    });
    
    console.log('✓ Upload successful!');
    console.log(`Project ID: ${uploadResponse.data.data.projectId}`);
    console.log(`Files: ${uploadResponse.data.data.fileCount}`);
    console.log(`Records: ${uploadResponse.data.data.totalRecords}\n`);
    
    const projectId = uploadResponse.data.data.projectId;
    
    // Step 2: Finalize and trigger pipeline
    console.log('Step 2: Triggering multi-file intelligence pipeline...');
    const finalizeResponse = await axios.post(`${baseUrl}/projects/${projectId}/finalize`);
    
    console.log('✓ Pipeline started!');
    console.log(`Status: ${finalizeResponse.data.data.status}\n`);
    
    // Wait for processing
    console.log('Step 3: Waiting 15 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Step 4: Get results
    console.log('\nStep 4: Fetching results...');
    const resultsResponse = await axios.get(`${baseUrl}/projects/${projectId}/results`);
    const results = resultsResponse.data.data;
    
    console.log('\n=== RESULTS ===\n');
    console.log(`Project Status: ${results.project.status}`);
    console.log(`Domain: ${results.project.domain}`);
    console.log(`\nRelationships Found: ${results.relationships.length}`);
    
    if (results.relationships.length > 0) {
      console.log('\nDetected Relationships:');
      results.relationships.forEach(rel => {
        console.log(`  • ${rel.sourceTable}.${rel.sourceColumn} → ${rel.targetTable}.${rel.targetColumn}`);
        console.log(`    Match Rate: ${rel.matchRate}% | Status: ${rel.status}`);
      });
    }
    
    console.log(`\nUnified Views: ${results.unifiedViews.length}`);
    if (results.unifiedViews.length > 0) {
      results.unifiedViews.forEach(view => {
        console.log(`  • ${view.viewName} (${view.status})`);
      });
    }
    
    console.log(`\nKPIs: ${results.kpis.length}`);
    
    console.log('\n✓ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testMultiFileUpload();
