import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const REPORTS_DIR = path.join(__dirname, '../e2e_reports');
const STATE_FILE = path.join(__dirname, 'audit_state.json');

if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

async function fetchAPI(endpoint, options = {}, cookieHeader = '') {
    const headers = new Headers(options.headers || {});
    if (cookieHeader) headers.set('cookie', cookieHeader);
    
    // 15 minute timeout to prevent Node.js fetch from dropping long AI connections
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900000);
    
    try {
        const res = await fetch(`${BASE_URL}${endpoint}`, { 
            ...options, 
            headers,
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        let newCookie = cookieHeader;
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) newCookie = setCookie.split(';')[0];
        
        return { res, cookie: newCookie };
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

function getCSVFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getCSVFiles(filePath, fileList);
        } else if (path.extname(file).toLowerCase() === '.csv') {
            fileList.push(filePath);
        }
    });
    return fileList;
}

async function runDomainE2E(domain, filePath, cookie) {
    const fileName = path.basename(filePath);
    const parentDir = path.basename(path.dirname(filePath));
    const projectLabel = `${domain}_${parentDir}_${fileName}`.replace(/[^a-zA-Z0-9_]/g, '_');

    console.log(`\n======================================================`);
    console.log(`🚀 [${projectLabel}] Starting Resilient Comprehensive Workflow...`);
    console.log(`======================================================`);

    try {
        // 1. Create Project
        console.log(`[${domain}] Creating project...`);
        const projRes = await fetchAPI('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: projectLabel, description: `Master Audit for ${fileName}` })
        }, cookie);
        
        if (!projRes.res.ok) throw new Error(`Project creation failed: ${await projRes.res.text()}`);
        const { project } = await projRes.res.json();
        const projectId = project.id;
        console.log(`[${domain}] Project: ${projectId}`);

        // 2. Upload Data
        console.log(`[${domain}] Uploading data...`);
        let csvContent = "";
        const MAX_BYTES = 3 * 1024 * 1024; // 3MB limit for stability
        const stats = fs.statSync(filePath);
        if (stats.size > MAX_BYTES) {
            const buffer = Buffer.alloc(MAX_BYTES);
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, buffer, 0, MAX_BYTES, 0);
            fs.closeSync(fd);
            csvContent = buffer.toString('utf8');
            csvContent = csvContent.substring(0, csvContent.lastIndexOf('\n'));
            console.log(`[${domain}] Truncated large file to ~3MB`);
        } else {
            csvContent = fs.readFileSync(filePath, 'utf8');
        }

        const formData = new FormData();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        formData.append('files', blob, fileName);
        const uploadRes = await fetchAPI(`/api/projects/${projectId}/sources`, { method: 'POST', body: formData }, cookie);
        if (!uploadRes.res.ok) throw new Error(`Upload failed: ${await uploadRes.res.text()}`);

        // 3. Set Domain
        console.log(`[${domain}] Setting domain...`);
        await fetchAPI(`/api/projects/${projectId}/governance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set', domain, reason: 'Master Audit' })
        }, cookie);

        // 4. KPI Discovery
        console.log(`[${domain}] Discovering KPIs...`);
        const kpiRes = await fetchAPI(`/api/projects/${projectId}/kpis`, { method: 'POST' }, cookie);
        const kpiData = await kpiRes.res.json();
        const topKPIs = (kpiData.discovery?.computableKPIs || []).slice(0, 2);
        
        for (const kpi of topKPIs) {
            await fetchAPI(`/api/projects/${projectId}/kpi-blueprint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kpi: {
                        id: kpi.kpiId,
                        name: kpi.kpiName,
                        aggregations: kpi.matchedColumns.map(c => ({ function: "SUM", column: c })),
                        sourceTable: "merged_data",
                        category: kpi.category || 'general',
                        lineage: { formula: kpi.formulaExpression || '' }
                    }
                })
            }, cookie);
        }
        await fetchAPI(`/api/projects/${projectId}/kpi-blueprint/finalize`, { method: 'POST' }, cookie);

        // 5. Dashboard Setup
        console.log(`[${domain}] Generating Dashboard...`);
        await fetchAPI(`/api/projects/${projectId}/dashboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }, cookie);
        await fetchAPI(`/api/projects/${projectId}/dashboard-state`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }) }, cookie);
        await fetchAPI(`/api/projects/${projectId}/dashboard-intelligence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skipAnomalyDetection: true }) }, cookie);

        // 6. AI Chat (Module 6)
        console.log(`[${domain}] Testing AI Chat...`);
        const chatRes = await fetchAPI(`/api/projects/${projectId}/ask-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Explain the strategic importance of these ${domain} metrics.` })
        }, cookie);
        if (chatRes.res.ok) {
            const chatData = await chatRes.res.json();
            console.log(`✅ [${domain}] AI Chat Success`);
        }

        // 7. Strategy Engine (Module 7)
        console.log(`[${domain}] Generating Strategic Goal...`);
        const goalRes = await fetchAPI(`/api/projects/${projectId}/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawQuery: `Achieve 15% growth in ${domain} KPIs by next year` })
        }, cookie);
        let strategyCanvas = null;
        if (goalRes.res.ok) {
            const goalData = await goalRes.res.json();
            strategyCanvas = goalData.strategyCanvas;
            console.log(`✅ [${domain}] Strategy Generated`);
        }

        // 8. PDF Generation (Module 9)
        console.log(`[${domain}] Generating PDF Report...`);
        const placeholderImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
        const reportPayload = {
            domain,
            metrics: { probability: 0.85, gap: "100", target: "500" },
            chartImage: placeholderImg,
            dashboardImage: placeholderImg,
            selectedKPIs: topKPIs.map(k => k.kpiName),
            actions: strategyCanvas?.topActions?.map(a => a.actionName) || ["Optimization Action A", "Resource Reallocation"],
            forecastData: strategyCanvas?.scenarios?.baseline || [],
            uploadedDatasets: [fileName],
            cleaningSummary: "Cleaned and verified via Master Audit."
        };

        const finalReportRes = await fetchAPI('/api/v1/report/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportPayload)
        }, cookie);

        if (finalReportRes.res.ok) {
            const buffer = await finalReportRes.res.arrayBuffer();
            const reportPath = path.join(REPORTS_DIR, `${projectLabel}_Executive_Report.pdf`);
            fs.writeFileSync(reportPath, Buffer.from(buffer));
            console.log(`✅ [${domain}] PDF Saved: ${reportPath}`);
            return true;
        } else {
            console.error(`❌ [${domain}] PDF Failed: ${await finalReportRes.res.text()}`);
            return false;
        }

    } catch (err) {
        console.error(`❌ [${domain}] Workflow Failed: ${err.message}`);
        return false;
    }
}

async function main() {
    console.log("🚀 STARTING MASTER-TO-MASTER RESILIENT AUDIT (8 Domains)");
    
    let state = { processedFiles: [] };
    if (fs.existsSync(STATE_FILE)) {
        state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        console.log(`📂 Resuming from state: ${state.processedFiles.length} files already processed.`);
    }

    // Auth
    const loginPayload = { email: "testbatch@examples.com", password: "1234567890" };
    let { res: loginRes, cookie } = await fetchAPI('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
    });
    if (!loginRes.ok) throw new Error("Auth failed");
    console.log("👤 Authenticated as testbatch@examples.com");

    const domains = [
        { name: 'ECOMMERCE', dir: '../datasets/ecommerce' },
        { name: 'EDTECH', dir: '../datasets/edtech' },
        { name: 'RETAIL', dir: '../datasets/retail' },
        { name: 'SAAS', dir: '../datasets/saas' },
        { name: 'MANUFACTURING', dir: '../datasets/manufacturing' },
        { name: 'HEALTHCARE', dir: '../datasets/healthcare' },
        { name: 'FINANCE', dir: '../datasets/finance' },
        { name: 'SERVICES', dir: '../datasets/services' }
    ];

    for (const d of domains) {
        const files = getCSVFiles(path.join(__dirname, d.dir));
        console.log(`\n📂 Found ${files.length} datasets for domain ${d.name}`);

        for (const file of files) {
            if (state.processedFiles.includes(file)) continue;
            
            const success = await runDomainE2E(d.name, file, cookie);
            if (success) {
                state.processedFiles.push(file);
                fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
            } else {
                console.log(`⚠️ Project failed but continuing to next file...`);
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log(`\n🏁 MASTER-TO-MASTER AUDIT COMPLETE`);
    console.log(`📂 Reports dir: ${REPORTS_DIR}`);
}

main().catch(console.error);
