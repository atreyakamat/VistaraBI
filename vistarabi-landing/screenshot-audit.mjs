import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
    console.log('Starting screenshot audit...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log('Waiting for Next.js dev server...');
    let retries = 15;
    while(retries > 0) {
        try {
            await page.goto('http://localhost:3005', { waitUntil: 'networkidle' });
            break;
        } catch(e) {
            await new Promise(r => setTimeout(r, 2000));
            retries--;
        }
    }
    
    if (retries === 0) {
        console.error('Failed to connect to dev server.');
        await browser.close();
        process.exit(1);
    }

    const artifactsDir = 'C:\\Users\\atkam\\.gemini\\antigravity-ide\\brain\\af86b734-8103-4dd8-a3d2-127c3daf3ca7';
    await page.setViewportSize({ width: 1440, height: 900 });

    console.log('Capturing Image 1: Main Dashboard');
    await page.screenshot({ path: path.join(artifactsDir, 'image1.png'), fullPage: false });

    // Try clicking Data Source
    try {
        await page.click('text=Data Source');
        await page.waitForTimeout(1000);
        console.log('Capturing Image 2: Data Source');
        await page.screenshot({ path: path.join(artifactsDir, 'image2.png') });
    } catch(e) { console.log('Could not find Data Source tab'); }

    // Try clicking Governance
    try {
        await page.click('text=Governance');
        await page.waitForTimeout(1000);
        console.log('Capturing Image 3: Governance / Purification');
        await page.screenshot({ path: path.join(artifactsDir, 'image3.png') });
        
        // Inside Governance, click Alerts
        try {
            await page.click('text=Alerts');
            await page.waitForTimeout(1000);
            console.log('Capturing Image 5: Alerts');
            await page.screenshot({ path: path.join(artifactsDir, 'image5.png') });
        } catch(e) { console.log('Could not find Alerts tab'); }
        
    } catch(e) { console.log('Could not find Governance tab'); }

    // Try clicking Insights
    try {
        await page.click('text=Insights');
        await page.waitForTimeout(1000);
        console.log('Capturing Image 4: Insights & Forecasting');
        await page.screenshot({ path: path.join(artifactsDir, 'image4.png') });
    } catch(e) { console.log('Could not find Insights tab'); }

    await browser.close();
    console.log('Screenshot capture complete.');
})();
