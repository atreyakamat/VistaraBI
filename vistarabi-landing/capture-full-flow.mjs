import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const baseDir = 'C:\\Users\\atkam\\.gemini\\antigravity-ide\\brain\\af86b734-8103-4dd8-a3d2-127c3daf3ca7';
const domain = process.argv[2] || 'ecommerce';
const artifactsDir = path.join(baseDir, `screenshots_${domain}`);
if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
}

async function capture() {
    console.log('🚀 Starting comprehensive screenshot audit...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    try {
        // 1. Landing Page
        console.log('Capturing Landing Page...');
        await page.goto('http://localhost:3000/');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(artifactsDir, 'landing_page.png'), fullPage: true });

        // 2. Sign In Page
        console.log('Capturing Sign In...');
        await page.goto('http://localhost:3000/login');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(artifactsDir, 'sign_in.png') });

        // Perform Login
        console.log('Logging in...');
        await page.fill('input[type="email"]', 'demo@vistarabi.com');
        await page.fill('input[type="password"]', 'VistaraDemo@2026');
        await page.click('button[type="submit"]', { timeout: 60000 });
        await page.waitForURL('**/app', { timeout: 60000 });

        // 3. Project Dashboard Selection
        console.log('Capturing Project Selection...');
        await page.goto(`http://localhost:3000/app/projects`);
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(artifactsDir, 'projects_selection.png') });

        // Click on the generated project
        console.log(`Entering ${domain} Project...`);
        await page.getByRole('heading', { name: new RegExp(domain, 'i') }).first().click();
        await page.waitForURL('**/app/projects/**', { timeout: 60000 });
        await page.waitForTimeout(4000);

        // Module 1: Data Source (Data Architecture Page)
        console.log('Capturing Module 1 (Data Source)...');
        await page.screenshot({ path: path.join(artifactsDir, 'module_1_datasource.png') });

        // Navigate to KPI Engine
        console.log('Navigating to KPI Engine...');
        // Click Configure KPIs
        const configureBtn = page.getByRole('link', { name: /Configure KPIs/i });
        if (await configureBtn.isVisible()) {
             await configureBtn.click();
        } else {
             await page.goto(page.url() + '/kpis', { waitUntil: 'networkidle' });
        }
        await page.waitForURL('**/kpis', { timeout: 60000 });
        await page.waitForTimeout(5000); // Wait for dashboard to fully load

        // Screenshot KPI Blueprint Engine
        console.log('Capturing KPI Engine...');
        await page.screenshot({ path: path.join(artifactsDir, 'kpi_engine.png') });

        // Navigate to Dashboard
        console.log('Navigating to Dashboard...');
        const dashboardBtn = page.getByRole('link', { name: /Open Dashboard/i });
        if (await dashboardBtn.isVisible()) {
             await dashboardBtn.click({ force: true });
        } else {
             await page.goto(page.url().replace('/kpis', '/dashboard'), { waitUntil: 'networkidle' });
        }
        await page.waitForURL('**/dashboard', { timeout: 60000 });
        await page.waitForTimeout(5000);

        // Module 3 & 4: Dashboard Overview (KPIs)
        console.log('Capturing Module 3 & 4 (Dashboard & KPIs)...');
        await page.screenshot({ path: path.join(artifactsDir, 'module_3_4_dashboard.png') });

        // Module 2 & 5: Governance & Smart Alerts
        console.log('Capturing Module 2 & 5 (Governance & Alerts)...');
        await page.getByRole('button', { name: /Governance/i }).first().click({ force: true });
        await page.waitForTimeout(4000); // Wait for modal
        await page.screenshot({ path: path.join(artifactsDir, 'module_2_5_governance.png') });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(4000); // Wait for React Hydration

        // Module 7: Strategy
        console.log('Capturing Module 7 (Strategy)...');
        await page.waitForFunction(() => {
            const btn = document.querySelector('button[title="Strategy"]');
            if (btn) btn.click();
            return document.querySelector('.goal-panel') !== null;
        }, { timeout: 30000 });
        await page.waitForTimeout(1000);
        await page.fill('.goal-input', 'Increase our primary target metric by 15% this year');
        await page.click('.goal-submit-btn');
        await page.waitForTimeout(10000); // Pipeline generation takes time
        await page.screenshot({ path: path.join(artifactsDir, 'module_7_strategy.png') });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(4000); // Wait for React Hydration

        // Module 8: Forecasting
        console.log('Capturing Module 8 (Forecasting)...');
        await page.waitForFunction(() => {
            const btn = document.querySelector('button[title="Forecast"]');
            if (btn) btn.click();
            return document.querySelector('h1:has-text("AI Predictive Forecaster Cockpit")') !== null || document.querySelector('.fixed.inset-0') !== null;
        }, { timeout: 30000 });
        await page.waitForTimeout(1000);
        
        // Generate forecast via Simulate
        const hasGenerateBtn = await page.$('button:has-text("Simulate")');
        if (hasGenerateBtn) {
            await page.click('button:has-text("Simulate")', { force: true });
            await page.waitForTimeout(6000); // Wait for chart
        }
        await page.screenshot({ path: path.join(artifactsDir, 'module_8_forecasting.png') });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(4000); // Wait for React Hydration

        // Module 6: Ask AI
        console.log('Capturing Module 6 (Ask AI)...');
        await page.waitForFunction(() => {
            const btn = document.querySelector('button[title="Ask AI"]');
            if (btn) btn.click();
            return document.querySelector('.ask-ai-panel') !== null;
        }, { timeout: 30000 });
        await page.waitForTimeout(1000);
        await page.fill('.ask-ai-input', 'What are the key drivers for our performance?');
        await page.click('.ask-ai-send-btn', { force: true });
        await page.waitForTimeout(8000); // Wait for streaming
        await page.screenshot({ path: path.join(artifactsDir, 'module_6_ask_ai.png') });
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);

        // Module 9: Export Report
        console.log('Capturing Module 9 (Reporting/Export)...');
        await page.getByRole('button', { name: /Export/i }).first().click({ force: true });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(artifactsDir, 'module_9_export.png') });

        console.log('✅ Screenshot capture complete!');
    } catch (e) {
        console.error('Error during capture:', e);
    } finally {
        await browser.close();
    }
}

capture();
