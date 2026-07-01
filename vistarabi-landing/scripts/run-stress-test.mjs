import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3001';
const DATASET_PATH = path.join(__dirname, '../dummy-data/ultimate/ecommerce_1m.csv');

async function runStressTest() {
    console.log("🚀 Starting Stress Test for VistaraBI (1 Million Rows) 🚀");

    if (!fs.existsSync(DATASET_PATH)) {
        console.error(`Dataset not found at ${DATASET_PATH}`);
        process.exit(1);
    }
    
    const stats = fs.statSync(DATASET_PATH);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`📊 Dataset size: ${sizeMB} MB`);

    const axiosInstance = axios.create({
        baseURL: BASE_URL,
        withCredentials: true,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    });

    let cookie = '';
    
    // 1. Authenticate
    console.log("\n[1] Authenticating...");
    const loginStart = performance.now();
    try {
        const loginRes = await axiosInstance.post('/api/auth/login', {
            email: "demo@vistarabi.com",
            password: "VistaraDemo@2026"
        });
        
        const setCookie = loginRes.headers['set-cookie'];
        if (setCookie) {
            cookie = setCookie[0].split(';')[0];
            axiosInstance.defaults.headers.common['Cookie'] = cookie;
        }
        console.log(`✅ Authenticated in ${((performance.now() - loginStart) / 1000).toFixed(2)}s`);
    } catch (err) {
        console.error("❌ Authentication failed:", err.message);
        // Let's try testbatch@examples.com if demo fails
        try {
            console.log("Trying testbatch@examples.com...");
            const loginRes = await axiosInstance.post('/api/auth/login', {
                email: "testbatch@examples.com",
                password: "placeholderpassword"
            });
            const setCookie = loginRes.headers['set-cookie'];
            if (setCookie) {
                cookie = setCookie[0].split(';')[0];
                axiosInstance.defaults.headers.common['Cookie'] = cookie;
            }
            console.log(`✅ Authenticated in ${((performance.now() - loginStart) / 1000).toFixed(2)}s`);
        } catch (e2) {
             console.error("❌ Authentication failed for testbatch:", e2.message);
             process.exit(1);
        }
    }

    // 2. Create Project
    console.log("\n[2] Creating Test Project...");
    const projStart = performance.now();
    let projectId = '';
    try {
        const projRes = await axiosInstance.post('/api/projects', {
            name: `Stress Test 1M - ${Date.now()}`,
            description: "Stress testing platform with 1 million rows"
        });
        projectId = projRes.data.project.id;
        console.log(`✅ Project created (ID: ${projectId}) in ${((performance.now() - projStart) / 1000).toFixed(2)}s`);
    } catch (err) {
        console.error("❌ Project creation failed:", err.message);
        process.exit(1);
    }

    // 3. Upload Data
    console.log("\n[3] Uploading and Parsing 1M Rows...");
    console.log("⚠️ This includes DB insertion and intelligence analysis. It may take a while.");
    const uploadStart = performance.now();
    try {
        const form = new FormData();
        form.append('files', fs.createReadStream(DATASET_PATH), 'ecommerce_1m.csv');
        form.append('preferLocal', 'true');
        
        const uploadRes = await axiosInstance.post(`/api/projects/${projectId}/sources`, form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 300000 // 5 minutes timeout for 1M rows
        });
        
        const uploadTime = ((performance.now() - uploadStart) / 1000).toFixed(2);
        console.log(`✅ Upload and Processing completed in ${uploadTime}s`);
        
        const sourceData = uploadRes.data.sources[0];
        console.log("\n--- Processing Results ---");
        console.log(`Status: ${sourceData.status}`);
        console.log(`Row Count: ${sourceData.rowCount}`);
        console.log(`Column Count: ${sourceData.colCount}`);
        console.log(`Quality Score: ${sourceData.qualityScore}`);
        if (sourceData.cleaningStats) {
            console.log(`Cleaned Rows: ${sourceData.cleaningStats.cleanedRowCount}`);
            console.log(`Duplicates Removed: ${sourceData.cleaningStats.duplicatesRemoved}`);
        }
        
    } catch (err) {
        console.error("❌ Upload failed:", err.response?.data || err.message);
    }
    
    console.log("\n🏁 Stress Test Completed 🏁");
}

runStressTest().catch(console.error);
