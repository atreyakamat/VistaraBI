import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const REPORTS_DIR = path.join(__dirname, '../e2e_reports');

if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR);
}

async function fetchAPI(endpoint, options = {}, cookieHeader = '') {
    const headers = new Headers(options.headers || {});
    if (cookieHeader) headers.set('cookie', cookieHeader);

    const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    let newCookie = cookieHeader;
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) newCookie = setCookie.split(';')[0];
    return { res, cookie: newCookie };
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

async function runE2EForFile(filePath, domain, cookie) {
    const fileName = path.basename(filePath);
    const parentDir = path.basename(path.dirname(filePath));
    const projectLabel = `${domain}_${parentDir}_${fileName}`.replace(/[^a-zA-Z0-9_]/g, '_');

    console.log(`\n[${projectLabel}] Starting full workflow...`);

    try {
        // 1. Create Project
        const projRes = await fetchAPI('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `E2E Audit: ${projectLabel}`, description: `Automated test for ${fileName}` })
        }, cookie);
        
        if (!projRes.res.ok) throw new Error(`Project creation failed: ${await projRes.res.text()}`);
        const { project } = await projRes.res.json();
        const projectId = project.id;
        console.log(`[${projectLabel}] Created Project: ${projectId}`);

        // 2. Upload Data
        let csvContent = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        if (stats.size > 2 * 1024 * 1024) { 
            csvContent = csvContent.split('\n').slice(0, 3000).join('\n');
            console.log(`[${projectLabel}] Truncated large file`);
        }

        const formData = new FormData();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        formData.append('files', blob, fileName);
        const uploadRes = await fetchAPI(`/api/projects/${projectId}/sources`, { method: 'POST', body: formData }, cookie);
        if (!uploadRes.res.ok) throw new Error(`Upload failed: ${await uploadRes.res.text()}`);
        console.log(`[${projectLabel}] Data uploaded`);

        // 3. Set Domain & Governance
        await fetchAPI(`/api/projects/${projectId}/governance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set', domain, reason: 'Master E2E Audit' })
        }, cookie);
        console.log(`[${projectLabel}] Domain locked: ${domain}`);

        // 4. KPI Discovery & Finalize
        const kpiRes = await fetchAPI(`/api/projects/${projectId}/kpis`, { method: 'POST' }, cookie);
        const kpiData = await kpiRes.res.json();
        const topKPIs = (kpiData.discovery?.computableKPIs || []).slice(0, 3);
        
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
        console.log(`[${projectLabel}] KPIs discovered and finalized`);

        // 5. Dashboard Setup (5A + 5.5)
        await fetchAPI(`/api/projects/${projectId}/dashboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }, cookie);
        await fetchAPI(`/api/projects/${projectId}/dashboard-state`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }) }, cookie);
        await fetchAPI(`/api/projects/${projectId}/dashboard-intelligence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skipAnomalyDetection: true }) }, cookie);
        console.log(`[${projectLabel}] Dashboard Intelligence generated`);

        // 6. Ask AI (Module 6) - Testing Domain Skill Activation
        const aiRes = await fetchAPI(`/api/projects/${projectId}/ask-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Explain the current trend for ${domain} based on the data.` })
        }, cookie);
        if (aiRes.res.ok) console.log(`[${projectLabel}] AI Analysis completed`);

        // 7. Goal Engine (Module 7)
        const goalRes = await fetchAPI(`/api/projects/${projectId}/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawQuery: `Achieve 20% growth in ${domain} metrics by end of year` })
        }, cookie);
        const goalData = await goalRes.res.json();
        console.log(`[${projectLabel}] Strategic goals generated`);

        // 8. PDF Report Generation (Module 9)
        const placeholderImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
        const reportPayload = {
            domain,
            metrics: { probability: 0.88, gap: "5,000", target: "100,000" },
            chartImage: placeholderImg,
            dashboardImage: placeholderImg,
            selectedKPIs: topKPIs.map(k => k.kpiName),
            actions: goalData.strategyCanvas?.topActions?.map(a => a.actionName) || ["Efficiency Optimization", "Revenue Protection"],
            forecastData: [],
            uploadedDatasets: [fileName],
            cleaningSummary: "Full data health validation passed."
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
            console.log(`✅ [${projectLabel}] Report Saved: ${reportPath}`);
            return true;
        } else {
            console.error(`❌ [${projectLabel}] Report generation failed`);
            return false;
        }

    } catch (err) {
        console.error(`❌ [${projectLabel}] Workflow failed: ${err.message}`);
        return false;
    }
}

async function main() {
    console.log("🚀 STARTING GLOBAL E2E AUDIT FOR ALL DOMAINS AND DATASETS...");
    
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
    { name: 'SAAS', file: '../dummy-data/synthetic_saas_data.csv' },
    { name: 'EDTECH', dir: '../datasets/edtech' },
    { name: 'RETAIL', dir: '../datasets/retail' },
    { name: 'SERVICES', file: '../dummy-data/synthetic_services_data.csv' },
    { name: 'MANUFACTURING', dir: '../datasets/manufacturing' },
    { name: 'HEALTHCARE', dir: '../datasets/healthcare' },
    { name: 'FINANCE', dir: '../datasets/finance' }
];

    let successCount = 0;
    let totalCount = 0;

    for (const d of domains) {
        let files = [];
        if (d.dir) {
            files = getCSVFiles(path.join(__dirname, d.dir));
        } else if (d.file) {
            files = [path.join(__dirname, d.file)];
        }

        console.log(`\n📂 Found ${files.length} datasets for domain ${d.name}`);

        for (const file of files) {
            totalCount++;
            const success = await runE2EForFile(file, d.name, cookie);
            if (success) successCount++;
            
            // Interval to respect server load
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log(`\n======================================================`);
    console.log(`🏁 MASTER AUDIT COMPLETE`);
    console.log(`📊 Total Datasets Processed: ${totalCount}`);
    console.log(`✅ Reports Generated: ${successCount}`);
    console.log(`📂 Output Directory: ${REPORTS_DIR}`);
    console.log(`======================================================`);
}

main().catch(console.error);
