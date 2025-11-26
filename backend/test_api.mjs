// Quick backend API test
import axios from 'axios';

const baseUrl = 'http://localhost:5001/api';

async function testHealthCheck() {
  try {
    const response = await axios.get(`${baseUrl}/health`);
    console.log('✅ Backend health check:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

async function testProjectsList() {
  try {
    const response = await axios.get(`${baseUrl}/projects`);
    console.log('✅ Projects list:', response.data.data?.length || 0, 'projects');
    return true;
  } catch (error) {
    console.error('❌ Projects list failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 Testing VistaraBI Backend APIs\n');
  console.log('='.repeat(50));
  
  const health = await testHealthCheck();
  const projects = await testProjectsList();
  
  console.log('='.repeat(50));
  console.log('\n📊 Test Summary:');
  console.log(`Health Check: ${health ? '✅' : '❌'}`);
  console.log(`Projects API: ${projects ? '✅' : '❌'}`);
  
  if (health && projects) {
    console.log('\n✨ All backend tests passed! Ready to test in browser.\n');
    console.log('📝 Next steps:');
    console.log('1. Open http://localhost:3000/project/upload');
    console.log('2. Upload test files from: C:\\Projects\\VistaraBI\\backend\\test_data\\');
    console.log('3. Follow the pipeline: Clean → Domain → Relationships → KPIs → Dashboard\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check server logs.\n');
  }
}

runTests();
