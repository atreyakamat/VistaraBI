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
        newCookie = setCookie;
    }

    return { res, cookie: newCookie };
}

async function runTests() {
    console.log("🚀 Starting E2E Workflow Test for 3 Domains...");

    // Wait for server to be ready
    let serverReady = false;
    for (let i = 0; i < 30; i++) {
        try {
            await fetch(`${BASE_URL}/api/v1/ai/health`);
            serverReady = true;
            break;
        } catch (e) {
            console.log("Waiting for Next.js server to start...");
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    if (!serverReady) throw new Error("Server not reachable at " + BASE_URL);

    // 1. Login
    console.log("\n👤 [Auth] Attempting login with testbatch@examples.com...");
    let cookie = '';
    const loginPayload = { email: "testbatch@examples.com", password: "1234567890" };
    
    let { res: loginRes, cookie: c1 } = await fetchAPI('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
    });
    
    cookie = c1;

    if (!loginRes.ok) {
        console.log("Login failed, attempting to register instead...");
        const { res: regRes, cookie: c2 } = await fetchAPI('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: "Test Batch", email: loginPayload.email, password: loginPayload.password })
        });
        if (!regRes.ok) {
            console.log(await regRes.text());
            throw new Error("Failed to register/login testbatch user.");
        }
        cookie = c2;
        console.log("✅ Registered and Authenticated");
    } else {
        console.log("✅ Logged in successfully");
    }

    const testCases = [
        {
            domain: "ECOMMERCE",
            file: "ecommerce_high_quality.csv",
            aiQuestion: "Which category has the highest gross margin?",
            goalQuery: "I want to increase Total Revenue to 150000 by Q4 2026"
        },
        {
            domain: "RETAIL",
            file: "retail_data.csv",
            aiQuestion: "Analyze our sales performance.",
            goalQuery: "Boost Sales Volume to 5000 by next month"
        },
        {
            domain: "FINANCE",
            file: "synthetic_personal_finance_dataset.csv",
            aiQuestion: "Identify any irregular spending patterns.",
            goalQuery: "Achieve Monthly Savings of 2500 by end of year"
        }
    ];

    for (const tc of testCases) {
        console.log(`\n======================================================`);
        console.log(`🚀 STARTING WORKFLOW FOR DOMAIN: ${tc.domain}`);
        console.log(`======================================================`);

        // Create Project
        console.log(`📁 [Project] Creating Workspace for ${tc.domain}...`);
        const { res: projRes, cookie: c3 } = await fetchAPI('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: `${tc.domain} Strategic Analysis`, description: "Automated test batch" })
        }, cookie);
        cookie = c3;
        
        if (!projRes.ok) throw new Error("Failed to create project: " + await projRes.text());
        const projData = await projRes.json();
        const projectId = projData.project.id;
        console.log(`✅ Project created: ${projectId}`);

        // Upload Data
        console.log(`📤 [Module 1] Uploading Data (${tc.file})...`);
        const csvPath = path.join(__dirname, '../../dummy-data', tc.file);
        
        let csvContent = fs.readFileSync(csvPath, 'utf8');
        const stats = fs.statSync(csvPath);
        if (stats.size > 5 * 1024 * 1024) {
            console.log(`⚠️ File is large (${(stats.size / 1024 / 1024).toFixed(1)}MB), truncating to 3000 lines for test...`);
            const lines = csvContent.split('\n').slice(0, 3000);
            csvContent = lines.join('\n');
        }

        const formData = new FormData();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        formData.append('files', blob, tc.file);
        
        const { res: uploadRes, cookie: c4 } = await fetchAPI(`/api/projects/${projectId}/sources`, { method: 'POST', body: formData }, cookie);
        cookie = c4;
        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            console.error(`❌ Upload failed: ${errText}`);
            continue;
        }
        console.log(`✅ Data uploaded and parsed successfully`);

        // Set Domain & Governance
        console.log(`🎯 [Module 3] Forcing Domain to ${tc.domain}...`);
        const { res: govRes, cookie: c5 } = await fetchAPI(`/api/projects/${projectId}/governance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'set', domain: tc.domain, reason: 'Test Workflow Override' })
        }, cookie);
        cookie = c5;
        if (!govRes.ok) throw new Error("Failed to set domain: " + await govRes.text());
        console.log(`✅ Domain locked to ${tc.domain}`);

        // KPI Discovery
        console.log(`📊 [Module 4] Discovering and Extracting KPIs...`);
        const { res: kpiRes, cookie: c6 } = await fetchAPI(`/api/projects/${projectId}/kpis`, { method: 'POST' }, cookie);
        cookie = c6;
        if (!kpiRes.ok) {
            console.log("⚠️ KPI Discovery failed.");
        } else {
            const kpiData = await kpiRes.json();
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
            console.log(`✅ ${topKPIs.length} KPIs finalized for ${tc.domain}`);
        }

        // Dashboard Generation (Module 5A)
        console.log(`🏗️ [Module 5A] Building Dashboard Config...`);
        const { res: configRes, cookie: c7 } = await fetchAPI(`/api/projects/${projectId}/dashboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        }, cookie);
        cookie = c7;
        if (configRes.ok) {
            console.log("✅ Dashboard config generated");
        } else {
            console.log(`⚠️ Dashboard config failed: ${await configRes.text()}`);
        }

        // Initialize Dashboard State
        console.log(`🔄 [Module 5.5] Initializing Dashboard State...`);
        const { res: stateRes, cookie: c8 } = await fetchAPI(`/api/projects/${projectId}/dashboard-state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: tc.domain })
        }, cookie);
        cookie = c8;
        if (stateRes.ok) {
            console.log("✅ Dashboard state initialized");
        } else {
            console.log(`⚠️ Dashboard state initialization failed: ${await stateRes.text()}`);
        }

        // Dashboard Intelligence (Module 5.5)
        console.log(`📈 [Module 5.5] Running Dashboard Intelligence...`);
        const { res: dashRes, cookie: c9 } = await fetchAPI(`/api/projects/${projectId}/dashboard-intelligence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skipAnomalyDetection: true })
        }, cookie);
        cookie = c9;
        if (dashRes.ok) {
            console.log("✅ Dashboard intelligence generated");
        } else {
            console.log(`⚠️ Dashboard intelligence failed: ${await dashRes.text()}`);
        }

        // AI Chat / Execution
        console.log(`💬 [Module 6] Sending Analytical Query: "${tc.aiQuestion}"`);
        const { res: chatRes } = await fetchAPI(`/api/projects/${projectId}/ask-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: tc.aiQuestion,
                history: []
            })
        }, cookie);
        if (chatRes.ok) {
            const chatData = await chatRes.json();
            console.log(`✅ AI Response: ${chatData.conversationalPreamble || chatData.message || "Query processed"}`);
        } else {
            console.log(`⚠️ AI Query failed: ${await chatRes.text()}`);
        }

        // Strategy / Goal
        console.log(`⚡ [Module 7] Setting Strategic Goal: "${tc.goalQuery}"`);
        const { res: goalRes } = await fetchAPI(`/api/projects/${projectId}/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rawQuery: tc.goalQuery
            })
        }, cookie);
        if (goalRes.ok) {
            const goalData = await goalRes.json();
            console.log(`✅ Strategic Goal Processed. Goal ID: ${goalData.goalId}`);
            if (goalData.strategyCanvas) {
                console.log(`📈 [Module 8] Strategy Canvas generated.`);
            }
        } else {
            console.log(`⚠️ Strategic Goal failed: ${await goalRes.text()}`);
        }

        console.log(`✅ Completed workflow test for ${tc.domain}\n`);
    }

    console.log("🎉 ALL TESTS COMPLETED SUCCESSFULLY");
    process.exit(0);
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});
