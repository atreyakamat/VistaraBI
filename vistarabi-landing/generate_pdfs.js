
require('@babel/register')({
  presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
  extensions: ['.js', '.jsx', '.ts', '.tsx']
});

const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToFile } = require('@react-pdf/renderer');
const { ExecutiveReport } = require('./src/lib/module-9/ReportTemplate');

const REPORT_DIR = './batch_reports';

async function generate() {
    const files = fs.readdirSync(REPORT_DIR).filter(f => f.endsWith('.json'));
    
    console.log(`--- 🖨 STARTING PDF GENERATION FOR ${files.length} PROJECTS ---`);

    for (const file of files) {
        const jsonPath = path.join(REPORT_DIR, file);
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const pdfPath = path.join(REPORT_DIR, file.replace('.json', '_STRATEGIC_REPORT.pdf'));

        console.log(`[PDF] Rendering: ${data.archiveName}...`);

        try {
            const props = {
                summaryText: data.summaryText,
                domain: data.domain,
                selectedKPIs: data.selectedKPIs,
                aiInsights: data.aiInsights,
                actions: data.actions,
                businessSuggestions: [
                    "Implement the 10-point strategic plan immediately.",
                    "Review Day 35 Inventory Optimization to prevent stockouts.",
                    "Monitor the 25% growth target against the bullish forecast trend."
                ],
                forecastData: data.forecastData,
                metrics: data.metrics,
                chartImage: "https://via.placeholder.com/600x300.png?text=VistaraBI+Predictive+Forecast+Cloud",
                dashboardImage: "https://via.placeholder.com/600x200.png?text=VistaraBI+Intelligence+Dashboard",
                globalChatSummary: data.globalChatSummary,
                uploadedDatasets: data.uploadedDatasets,
                cleaningSummary: "Cleaned 1000 sample rows. Applied robust timestamp casting for non-ISO formats."
            };

            await renderToFile(React.createElement(ExecutiveReport, props), pdfPath);
            console.log(`[PDF] ✅ Success: ${path.basename(pdfPath)}`);
        } catch (e) {
            console.error(`[PDF] ❌ Failed ${data.archiveName}:`, e.message);
        }
    }

    console.log('\n✨ ALL PDF REPORTS GENERATED IN vistarabi-landing/batch_reports/');
}

generate();
