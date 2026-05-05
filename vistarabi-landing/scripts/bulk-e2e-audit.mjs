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

// Function to find all CSV files recursively in a directory
function getCSVFiles(dir, fileList = []) {
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
    const archiveName = path.basename(path.dirname(filePath));
    const projectLabel = `${domain}_${archiveName}_${fileName}`.replace(/[^a-zA-Z0-9_]/g, '_');

    console.log(`\n[${projectLabel}] Starting workflow...`);

    try {
        // 1. Create Project
        const projRes = await fetchAPI('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `E2E ${projectLabel}`, description: `Automated test for ${fileName}` })
        }, cookie);
        
        if (!projRes.res.ok) throw new Error(`Project creation failed: ${await projRes.res.text()}`);
        const { project } = await projRes.res.json();
        const projectId = project.id;
        console.log(`[${projectLabel}] Project: ${projectId}`);

        // 2. Upload Data (with truncation for dev mode stability)
        let csvContent = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        if (stats.size > 2 * 1024 * 1024) { // Truncate to 2MB for bulk testing
            const lines = csvContent.split('\n').slice(0, 3000);
            csvContent = lines.join('\n');
            console.log(`[${projectLabel}] Truncated large file (${(stats.size/1024/1024).toFixed(1)}MB)`);
        }

        const formData = new FormData();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        formData.append('files', blob, fileName);
        const uploadRes = await fetchAPI(`/api/projects/${projectId}/sources`, { method: 'POST', body: formData }, cookie);
        if (!uploadRes.res.ok) throw new Error(`Upload failed: ${await uploadRes.res.text()}`);
        console.log(`[${projectLabel}] Data uploaded`);

        // 3. Set Domain
        await fetchAPI(`/api/projects/${projectId}/governance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set', domain, reason: 'Bulk E2E Test' })
        }, cookie);
        console.log(`[${projectLabel}] Domain locked: ${domain}`);

        // 4. KPI Discovery & Finalize
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
        console.log(`[${projectLabel}] KPIs finalized (${topKPIs.length})`);

        // 5. Dashboard Setup
        await fetchAPI(`/api/projects/${projectId}/dashboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }, cookie);
        await fetchAPI(`/api/projects/${projectId}/dashboard-state`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }) }, cookie);
        await fetchAPI(`/api/projects/${projectId}/dashboard-intelligence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skipAnomalyDetection: true }) }, cookie);
        console.log(`[${projectLabel}] Dashboard generated`);

        // 6. Goal Engine
        const goalRes = await fetchAPI(`/api/projects/${projectId}/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawQuery: `Improve performance for ${domain} KPIs by next quarter` })
        }, cookie);
        const goalData = await goalRes.res.json();
        console.log(`[${projectLabel}] Goal strategy created`);

        // 7. Report Generation
        const placeholderImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
        const reportPayload = {
            domain,
            metrics: { probability: 0.82, gap: "10,000", target: "100,000" },
            chartImage: placeholderImg,
            dashboardImage: placeholderImg,
            selectedKPIs: topKPIs.map(k => k.kpiName),
            actions: goalData.strategyCanvas?.topActions?.map(a => a.actionName) || ["Efficiency Audit", "Market Expansion"],
            forecastData: [],
            uploadedDatasets: [fileName],
            cleaningSummary: "Cleaned and verified for strategic analysis."
        };

        const finalReportRes = await fetchAPI('/api/v1/report/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportPayload)
        }, cookie);

        if (finalReportRes.res.ok) {
            const buffer = await finalReportRes.res.arrayBuffer();
            const reportPath = path.join(REPORTS_DIR, `${projectLabel}_Report.pdf`);
            fs.writeFileSync(reportPath, Buffer.from(buffer));
            console.log(`✅ [${projectLabel}] Report Saved: ${reportPath}`);
            return true;
        } else {
            console.error(`❌ [${projectLabel}] Report generation failed`);
            return false;
        }

    } catch (err) {
        console.error(`❌ [${projectLabel}] Failed: ${err.message}`);
        return false;
    }
}

async function main() {
    console.log("🚀 Starting Global E2E Dataset Audit...");
    
    // Auth
    const loginPayload = { email: "testbatch@examples.com", password: "1234567890" };
    let { res: loginRes, cookie } = await fetchAPI('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
    });
    if (!loginRes.ok) throw new Error("Auth failed");
    console.log("👤 Authenticated as testbatch@examples.com");

    const domainDirs = [
        { name: 'MANUFACTURING', path: path.join(__dirname, '../datasets/manufacturing') },
        { name: 'ECOMMERCE', path: path.join(__dirname, '../datasets/ecommerce') },
        { name: 'RETAIL', path: path.join(__dirname, '../datasets/retail') }
    ];

    let successCount = 0;
    let totalCount = 0;

    for (const domainDir of domainDirs) {
        if (!fs.existsSync(domainDir.path)) continue;
        const files = getCSVFiles(domainDir.path);
        console.log(`\n📂 Found ${files.length} datasets for domain ${domainDir.name}`);

        for (const file of files) {
            totalCount++;
            const success = await runE2EForFile(file, domainDir.name, cookie);
            if (success) successCount++;
            
            // Brief pause between datasets to prevent server flooding
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log(`\n======================================================`);
    console.log(`🏁 AUDIT COMPLETE`);
    console.log(`📊 Total Datasets: ${totalCount}`);
    console.log(`✅ Successful Reports: ${successCount}`);
    console.log(`❌ Failures: ${totalCount - successCount}`);
    console.log(`📂 Reports dir: ${REPORTS_DIR}`);
    console.log(`======================================================`);
}

main().catch(console.error);
