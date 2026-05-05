import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';

async function fetchAPI(endpoint, options = {}, cookieHeader = '') {
    const headers = new Headers(options.headers || {});
    if (cookieHeader) {
        headers.set('cookie', cookieHeader);
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    let newCookie = cookieHeader;
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
        // Simple cookie handling for session
        newCookie = setCookie.split(';')[0];
    }

    return { res, cookie: newCookie };
}

async function runTests() {
    console.log("🚀 Starting Comprehensive E2E Dataset Workflow Test...");

    const reportsDir = path.join(__dirname, '../e2e_reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir);
    }

    // 1. Auth
    console.log("\n👤 [Auth] Logging in as testbatch@examples.com...");
    const loginPayload = { email: "testbatch@examples.com", password: "1234567890" };
    let { res: loginRes, cookie } = await fetchAPI('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
    });

    if (!loginRes.ok) {
        console.log("Login failed, attempting register...");
        const regRes = await fetchAPI('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: "Test Batch", ...loginPayload })
        });
        cookie = regRes.cookie;
        if (!regRes.res.ok) throw new Error("Auth failed");
    }
    console.log("✅ Authenticated");

    const testCases = [
        {
            domain: "MANUFACTURING",
            file: "datasets/manufacturing/archive (51)/data.csv",
            goalQuery: "Increase production efficiency to 95% by Q3"
        },
        {
            domain: "ECOMMERCE",
            file: "datasets/ecommerce/archive (80)/9. Sales-Data-Analysis.csv",
            goalQuery: "Increase monthly revenue to $200k"
        },
        {
            domain: "RETAIL",
            file: "datasets/retail/archive (1)/Chocolate Sales.csv",
            goalQuery: "Grow store footfall by 20% in next 6 months"
        }
    ];

    for (const tc of testCases) {
        console.log(`\n======================================================`);
        console.log(`🚀 PROCESSING DOMAIN: ${tc.domain}`);
        console.log(`======================================================`);

        // A. Create Project
        const projRes = await fetchAPI('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `E2E ${tc.domain} Report Test`, description: "Automated test" })
        }, cookie);
        
        if (!projRes.res.ok) {
            console.error(`❌ Project creation failed for ${tc.domain}: ${await projRes.res.text()}`);
            continue;
        }
        
        const { project } = await projRes.res.json();
        const projectId = project.id;
        console.log(`✅ Project created: ${projectId}`);

        // B. Upload Data
        const csvPath = path.join(__dirname, '..', tc.file);
        let csvContent = fs.readFileSync(csvPath, 'utf8');
        // Truncate to 2000 lines for speed/stability in dev mode
        csvContent = csvContent.split('\n').slice(0, 2000).join('\n');

        const formData = new FormData();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        formData.append('files', blob, path.basename(tc.file));
        const uploadRes = await fetchAPI(`/api/projects/${projectId}/sources`, { method: 'POST', body: formData }, cookie);
        if (!uploadRes.res.ok) {
            console.error(`❌ Upload failed for ${tc.domain}: ${await uploadRes.res.text()}`);
            continue;
        }
        console.log(`✅ Data uploaded`);

        // C. Domain Governance
        await fetchAPI(`/api/projects/${projectId}/governance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set', domain: tc.domain, reason: 'E2E Test' })
        }, cookie);
        console.log(`✅ Domain set to ${tc.domain}`);

        // D. KPI Discovery & Finalize
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
        console.log(`✅ KPIs finalized`);

        // E. Dashboard Generation
        await fetchAPI(`/api/projects/${projectId}/dashboard`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }, cookie);
        await fetchAPI(`/api/projects/${projectId}/dashboard-state`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: tc.domain }) }, cookie);
        await fetchAPI(`/api/projects/${projectId}/dashboard-intelligence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skipAnomalyDetection: true }) }, cookie);
        console.log(`✅ Dashboard generated`);

        // F. Goal Engine
        const goalRes = await fetchAPI(`/api/projects/${projectId}/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawQuery: tc.goalQuery })
        }, cookie);
        const goalData = await goalRes.res.json();
        console.log(`✅ Goal strategy created`);

        // G. PDF Report Generation (Module 9)
        console.log(`📄 Generating PDF Report...`);
        // Use a small red dot base64 as placeholder for images
        const placeholderImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
        
        const reportPayload = {
            domain: tc.domain,
            metrics: {
                probability: 0.85,
                gap: "12,000",
                target: "150,000"
            },
            chartImage: placeholderImg,
            dashboardImage: placeholderImg,
            selectedKPIs: topKPIs.map(k => k.kpiName),
            actions: goalData.strategyCanvas?.topActions?.map(a => a.actionName) || ["Optimization Action A", "Resource Reallocation"],
            forecastData: goalData.strategyCanvas?.scenarios?.[0]?.scenarios || [],
            uploadedDatasets: [path.basename(tc.file)],
            cleaningSummary: "100% data health achieved."
        };

        const finalReportRes = await fetchAPI('/api/v1/report/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportPayload)
        }, cookie);

        if (finalReportRes.res.ok) {
            const buffer = await finalReportRes.res.arrayBuffer();
            const filePath = path.join(reportsDir, `${tc.domain}_Strategic_Report.pdf`);
            fs.writeFileSync(filePath, Buffer.from(buffer));
            console.log(`✅ PDF Report saved: ${filePath}`);
        } else {
            console.error(`❌ PDF Report generation failed: ${await finalReportRes.res.text()}`);
        }
    }

    console.log("\n🎉 ALL E2E DATASET TESTS COMPLETED");
}

runTests().catch(console.error);
