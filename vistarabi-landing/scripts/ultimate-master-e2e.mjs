import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const REPORTS_DIR = path.join(__dirname, '../e2e_reports');

if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

async function fetchAPI(endpoint, options = {}, cookieHeader = '') {
    const headers = new Headers(options.headers || {});
    if (cookieHeader) headers.set('cookie', cookieHeader);
    const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    let newCookie = cookieHeader;
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) newCookie = setCookie.split(';')[0];
    return { res, cookie: newCookie };
}

async function runDomainE2E(domain, filePath, cookie) {
    const projectLabel = `${domain}_Ultimate_E2E`;
    console.log(`\n======================================================`);
    console.log(`🚀 [${projectLabel}] Starting Comprehensive Workflow...`);
    console.log(`======================================================`);

    try {
        // 1. Create Project
        console.log(`[${domain}] Creating project...`);
        const projRes = await fetchAPI('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: projectLabel, description: `Ultimate E2E for ${domain}` })
        }, cookie);
        
        if (!projRes.res.ok) throw new Error(`Project creation failed: ${await projRes.res.text()}`);
        const { project } = await projRes.res.json();
        const projectId = project.id;

        // 2. Upload Data
        console.log(`[${domain}] Uploading data: ${path.basename(filePath)}...`);
        
        // Handle large files safely by reading chunks
        let csvContent = "";
        const MAX_BYTES = 5 * 1024 * 1024; // 5MB limit
        const stats = fs.statSync(filePath);
        if (stats.size > MAX_BYTES) {
            const buffer = Buffer.alloc(MAX_BYTES);
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, buffer, 0, MAX_BYTES, 0);
            fs.closeSync(fd);
            csvContent = buffer.toString('utf8');
            // truncate at last newline to avoid partial rows
            csvContent = csvContent.substring(0, csvContent.lastIndexOf('\n'));
            console.log(`[${domain}] Truncated large file to ~5MB for testing`);
        } else {
            csvContent = fs.readFileSync(filePath, 'utf8');
        }

        const formData = new FormData();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        formData.append('files', blob, path.basename(filePath));
        const uploadRes = await fetchAPI(`/api/projects/${projectId}/sources`, { method: 'POST', body: formData }, cookie);
        if (!uploadRes.res.ok) throw new Error(`Upload failed: ${await uploadRes.res.text()}`);

        // 3. Set Domain
        console.log(`[${domain}] Setting domain...`);
        await fetchAPI(`/api/projects/${projectId}/governance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set', domain, reason: 'Ultimate E2E' })
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

        // 5. Dashboard Generation
        console.log(`[${domain}] Generating Dashboard...`);
        await fetchAPI(`/api/projects/${projectId}/dashboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }, cookie);
        await fetchAPI(`/api/projects/${projectId}/dashboard-state`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }) }, cookie);
        await fetchAPI(`/api/projects/${projectId}/dashboard-intelligence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skipAnomalyDetection: true }) }, cookie);

        // 6. AI Chat (Module 6)
        console.log(`[${domain}] Testing AI Chat...`);
        const chatRes = await fetchAPI(`/api/projects/${projectId}/ask-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `What are the key performance drivers for ${domain}?` })
        }, cookie);
        if (chatRes.res.ok) {
            const chatData = await chatRes.res.json();
            console.log(`✅ [${domain}] AI Chat Success: ${chatData.content?.substring(0, 50) || chatData.message?.substring(0, 50) || 'Response received'}...`);
        } else {
            console.error(`❌ [${domain}] AI Chat Failed: ${await chatRes.res.text()}`);
        }

        // 7. Strategy Engine (Module 7)
        console.log(`[${domain}] Testing Strategy Engine...`);
        const goalRes = await fetchAPI(`/api/projects/${projectId}/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawQuery: `Increase growth by 15% next quarter` })
        }, cookie);
        let strategyCanvas = null;
        if (goalRes.res.ok) {
            const goalData = await goalRes.res.json();
            strategyCanvas = goalData.strategyCanvas;
            console.log(`✅ [${domain}] Strategy Generated successfully`);
        } else {
            console.error(`❌ [${domain}] Strategy Failed: ${await goalRes.res.text()}`);
        }

        // 8. Forecasting (Module 8)
        console.log(`[${domain}] Testing Forecasting Engine...`);
        // Use Validate API for forecast testing
        const forecastRes = await fetchAPI(`/api/v1/forecast/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                kpiId: topKPIs[0]?.kpiId || "test",
                months: 6,
                confidence: 0.95
            })
        }, cookie);
        
        if (forecastRes.res.ok) {
            console.log(`✅ [${domain}] Forecast validation successful`);
        } else {
            console.log(`⚠️ [${domain}] Forecast API returned: ${forecastRes.res.status} (This might be expected if no historical data is sufficient)`);
        }

        // 9. PDF Generation
        console.log(`[${domain}] Generating PDF Report...`);
        const placeholderImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
        const reportPayload = {
            domain,
            metrics: { probability: 0.85, gap: "100", target: "500" },
            chartImage: placeholderImg,
            dashboardImage: placeholderImg,
            selectedKPIs: topKPIs.map(k => k.kpiName),
            actions: strategyCanvas?.topActions?.map(a => a.actionName) || ["Optimization Action A", "Resource Reallocation"],
            forecastData: strategyCanvas?.scenarios?.[0]?.scenarios || [],
            uploadedDatasets: [path.basename(filePath)],
            cleaningSummary: "E2E Automated Audit."
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
            console.log(`✅ [${domain}] PDF Report Saved: ${reportPath}`);
            return true;
        } else {
            console.error(`❌ [${domain}] PDF Report Failed: ${await finalReportRes.res.text()}`);
            return false;
        }

    } catch (err) {
        console.error(`❌ [${domain}] Workflow Failed: ${err.message}`);
        return false;
    }
}

async function main() {
    console.log("🚀 STARTING ULTIMATE E2E VALIDATION (All 8 Domains + Chat + Strategy + Forecast)");
    
    // Auth
    const loginPayload = { email: "testbatch@examples.com", password: "1234567890" };
    let { res: loginRes, cookie } = await fetchAPI('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
    });
    if (!loginRes.ok) throw new Error("Auth failed");
    console.log("👤 Authenticated as testbatch@examples.com");

    const domainsToTest = [
        { name: 'ECOMMERCE', file: '../datasets/ecommerce/archive (66)/2019-Nov.csv' },
        { name: 'RETAIL', file: '../datasets/retail/archive (1)/Chocolate Sales.csv' },
        { name: 'LOGISTICS', file: '../datasets/logistics/archive (1)/shipments.csv' },
        { name: 'MANUFACTURING', file: '../datasets/manufacturing/archive (51)/data.csv' },
        { name: 'HEALTHCARE', file: '../datasets/healthcare/archive (1)/patient_data.csv' },
        { name: 'FINANCE', file: '../datasets/finance/archive (1)/financial_data.csv' },
        { name: 'EDTECH', file: '../datasets/edtech/archive (1)/student_data.csv' },
        { name: 'REAL_ESTATE', file: '../datasets/real_estate/re1/House_Price_dataset.csv' }
    ];

    let successCount = 0;
    for (const d of domainsToTest) {
        const fullPath = path.join(__dirname, d.file);
        if (fs.existsSync(fullPath)) {
            const success = await runDomainE2E(d.name, fullPath, cookie);
            if (success) successCount++;
        } else {
            console.log(`⚠️ Skipping ${d.name}: Dataset not found at ${fullPath}`);
        }
    }

    console.log(`\n======================================================`);
    console.log(`🏁 ULTIMATE AUDIT COMPLETE`);
    console.log(`✅ Successful Workflows: ${successCount} / ${domainsToTest.length}`);
    console.log(`======================================================`);
}

main().catch(console.error);
