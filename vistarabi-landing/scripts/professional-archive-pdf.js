#!/usr/bin/env node

/**
 * Professional Archive Report PDF Generator
 * Generates PDFs matching the actual project structure with:
 * - Project/Archive metadata
 * - Selected KPIs with sparkline charts
 * - AI Insights (Q&A format)
 * - Strategic Actions & Timeline
 * - Metrics, Forecasts, Datasets
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '../reports/professional-archive');

// Create reports directory if it doesn't exist
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Professional color scheme
const COLORS = {
  primary: '#1e40af',      // Deep blue
  secondary: '#7c3aed',    // Purple
  success: '#059669',      // Green
  warning: '#d97706',      // Amber
  danger: '#dc2626',       // Red
  text: '#1f2937',         // Dark gray
  textLight: '#6b7280',    // Light gray
  bg: '#ffffff',           // White
  bgLight: '#f9fafb',      // Light gray bg
};

// Sample project data structure
const SAMPLE_PROJECTS = [
  {
    projectId: 'batch-archive--1--896eba39',
    archiveName: 'archive (1)',
    domain: 'RETAIL',
    summaryText: 'Comprehensive strategic intelligence report for archive (1). Analyzed 5 KPIs across 1 sources.',
    selectedKPIs: [
      { name: 'Total Sales', category: 'revenue', value: '3.1M', trend: '6.9%', sparkData: [15, 0, 54, 83, 30, 83, 88, 81, 2, 0] },
      { name: 'Sales Growth', category: 'growth', value: '86.9M', trend: '14.6%', sparkData: [66, 88, 67, 42, 98, 38, 23, 64, 73, 50] },
      { name: 'Active SKU Count', category: 'product', value: '0.2%', trend: '14.6%', sparkData: [82, 48, 73, 44, 48, 51, 63, 28, 43, 12] },
      { name: 'Gross Margin', category: 'profitability', value: '27.0%', trend: '7.7%', sparkData: [68, 99, 54, 6, 54, 10, 41, 38, 59, 78] },
      { name: 'Top Categories by Revenue', category: 'product', value: '45.1%', trend: '9.2%', sparkData: [87, 91, 63, 46, 18, 36, 95, 55, 80, 53] }
    ],
    metrics: { probability: 1, gap: 250000, baseline: 1000000, target: 1250000 },
    forecastData: { kpi: 'Total Sales', trend: 'Bullish (25% Projected Growth)', confidence: '40% Reliability' },
    uploadedDatasets: [{ fileName: 'Chocolate Sales.csv', status: 'READY', columns: 6 }],
    actions: [
      { title: 'Omnichannel Expansion Starts', impact: 'Day 5' },
      { title: 'Omnichannel Expansion Ramp Complete', impact: 'Day 15' },
      { title: 'Dynamic Pricing Starts', impact: 'Day 15' },
      { title: 'Dynamic Pricing Ramp Complete', impact: 'Day 25' },
      { title: 'Loyalty Program Launch Starts', impact: 'Day 25' }
    ],
    aiInsights: [
      'Q1: Can the current schema structurally support a precise Total Sales aggregation?\nA1: Yes, provided the "Amount" column is defined as DECIMAL or NUMERIC type.',
      'Q2: To derive Gross Margin, does the existing table structure include Cost of Goods Sold?\nA2: No, the 6-column schema lacks "Cost" fields; we must design an ETL join.',
      'Q3: Is the dimensional granularity sufficient for "Sales per Store" KPIs?\nA3: No, without a "Store ID" column, we cannot partition data at store level.',
      'Q4: What structural dependencies exist for calculating Inventory Turnover?\nA4: We require a separate Inventory fact table with "Stock Level" and "Date" columns.',
      'Q5: For seasonal pattern analysis, is the "Date" column typed for time-series extraction?\nA5: We must validate that "Date" is a TIMESTAMP type, not STRING.'
    ]
  }
];

function drawSparkline(doc, x, y, width, height, data) {
  if (!data || data.length === 0) return;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const pointWidth = width / (data.length - 1);
  const points = data.map((val, idx) => ({
    x: x + idx * pointWidth,
    y: y + height - ((val - min) / range) * height
  }));

  doc.strokeColor(COLORS.secondary).lineWidth(2);
  doc.path(points.map((p, idx) => (idx === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')).stroke();

  // Draw points
  doc.fillColor(COLORS.primary);
  points.forEach(p => doc.circle(p.x, p.y, 2).fill());
}

function createArchiveReport(project) {
  const filename = `${project.domain.toLowerCase()}-${project.archiveName.replace(/\s+/g, '-')}-report.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);

  console.log(`\n📄 Generating: ${filename}`);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // === PAGE 1: COVER ===
      doc.fontSize(32)
        .font('Helvetica-Bold')
        .fillColor(COLORS.primary)
        .text('STRATEGIC INTELLIGENCE REPORT', { align: 'center' })
        .moveDown(0.5);

      doc.fontSize(24)
        .font('Helvetica')
        .fillColor(COLORS.secondary)
        .text(project.domain, { align: 'center' })
        .moveDown(2);

      // Metadata box
      doc.rect(40, doc.y, 515, 130)
        .strokeColor(COLORS.primary)
        .lineWidth(2)
        .stroke();

      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(COLORS.text)
        .text('PROJECT METADATA', 50, doc.y + 15);

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.text)
        .text(`Archive: ${project.archiveName}`, 50, doc.y + 5)
        .text(`Project ID: ${project.projectId}`, 50)
        .text(`Domain: ${project.domain}`, 50)
        .text(`Generated: ${new Date().toLocaleString()}`, 50)
        .text(`Summary: ${project.summaryText}`, 50, doc.y, { width: 465 })
        .moveDown(3.5);

      // === PAGE 2: SELECTED KPIs ===
      doc.addPage();
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(COLORS.dark)
        .text('1. SELECTED KPIs & PERFORMANCE METRICS', 40, 40)
        .moveDown(1);

      let currentY = doc.y;
      project.selectedKPIs.forEach((kpi, idx) => {
        if (currentY > doc.page.height - 200) {
          doc.addPage();
          currentY = 40;
        }

        // KPI Card
        doc.rect(50, currentY, 480, 85)
          .strokeColor(COLORS.bgLight)
          .lineWidth(1)
          .stroke();

        // Category badge
        const categoryColor = {
          'revenue': COLORS.success,
          'growth': COLORS.secondary,
          'product': COLORS.primary,
          'profitability': COLORS.warning
        }[kpi.category] || COLORS.primary;

        doc.fillColor(categoryColor)
          .rect(55, currentY + 8, 70, 16)
          .fill();

        doc.fontSize(8)
          .font('Helvetica-Bold')
          .fillColor('white')
          .text(kpi.category.toUpperCase(), 57, currentY + 9, { width: 66 });

        // KPI Title
        doc.fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(COLORS.text)
          .text(kpi.name, 130, currentY + 8, { width: 350 });

        // KPI Value
        doc.fontSize(16)
          .font('Helvetica-Bold')
          .fillColor(COLORS.primary)
          .text(kpi.value, 130, currentY + 25);

        // Trend
        doc.fontSize(9)
          .font('Helvetica')
          .fillColor(COLORS.success)
          .text(`Trend: ${kpi.trend}`, 130, currentY + 48);

        // Sparkline
        drawSparkline(doc, 300, currentY + 10, 200, 50, kpi.sparkData);

        currentY += 95;
      });

      doc.moveDown(2);

      // === PAGE 3: AI INSIGHTS ===
      doc.addPage();
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(COLORS.dark)
        .text('2. AI INSIGHTS & SCHEMA ANALYSIS', 40, 40)
        .moveDown(1);

      let insightY = doc.y;
      project.aiInsights.forEach((insight, idx) => {
        if (insightY > doc.page.height - 150) {
          doc.addPage();
          insightY = 40;
        }

        const lines = insight.split('\n');
        const question = lines[0];
        const answer = lines[1];

        doc.fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(COLORS.primary)
          .text(`${question}`, 50, insightY, { width: 470 });

        doc.fontSize(9)
          .font('Helvetica')
          .fillColor(COLORS.textLight)
          .text(answer, 60, doc.y + 5, { width: 450 })
          .moveDown(1);

        insightY = doc.y + 10;
      });

      // === PAGE 4: METRICS & FORECASTS ===
      doc.addPage();

      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(COLORS.dark)
        .text('3. KEY METRICS & FORECASTS', 40, 40)
        .moveDown(1);

      // Metrics Box
      doc.rect(50, doc.y, 480, 100)
        .strokeColor(COLORS.primary)
        .lineWidth(2)
        .stroke();

      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(COLORS.primary)
        .text('TARGET METRICS', 60, doc.y + 15);

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.text)
        .text(`Baseline: $${project.metrics.baseline.toLocaleString()}`, 60, doc.y + 5)
        .text(`Target: $${project.metrics.target.toLocaleString()}`, 60)
        .text(`Gap: $${project.metrics.gap.toLocaleString()}`, 60)
        .text(`Probability: ${(project.metrics.probability * 100).toFixed(0)}%`, 60, doc.y, { color: COLORS.success });

      doc.moveDown(4);

      // Forecast Box
      doc.rect(50, doc.y, 480, 80)
        .strokeColor(COLORS.secondary)
        .lineWidth(2)
        .stroke();

      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(COLORS.secondary)
        .text('FORECAST DATA', 60, doc.y + 15);

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.text)
        .text(`KPI: ${project.forecastData.kpi}`, 60, doc.y + 5)
        .text(`Trend: ${project.forecastData.trend}`, 60)
        .text(`Confidence: ${project.forecastData.confidence}`, 60);

      doc.moveDown(3);

      // === PAGE 5: DATASETS & ACTIONS ===
      doc.addPage();

      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(COLORS.dark)
        .text('4. UPLOADED DATASETS', 40, 40)
        .moveDown(1);

      // Datasets table
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('white')
        .rect(50, doc.y, 480, 25)
        .fill();

      doc.fillColor('white')
        .text('File Name', 60, doc.y + 5, { width: 250 })
        .text('Status', 310, doc.y + 5)
        .text('Columns', 420, doc.y + 5);

      doc.moveDown(1.5);

      project.uploadedDatasets.forEach(dataset => {
        const statusColor = dataset.status === 'READY' ? COLORS.success : COLORS.warning;

        doc.rect(50, doc.y, 480, 30).stroke();

        doc.fontSize(9)
          .font('Helvetica')
          .fillColor(COLORS.text)
          .text(dataset.fileName, 60, doc.y + 8)
          .fillColor(statusColor)
          .text(dataset.status, 310, doc.y)
          .fillColor(COLORS.text)
          .text(dataset.columns.toString(), 420, doc.y);

        doc.moveDown(2);
      });

      doc.moveDown(1);

      // Strategic Actions
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor(COLORS.dark)
        .text('5. STRATEGIC ACTIONS TIMELINE', 40, doc.y)
        .moveDown(1);

      let actionY = doc.y;
      project.actions.forEach((action, idx) => {
        if (actionY > doc.page.height - 100) {
          doc.addPage();
          actionY = 40;
        }

        doc.fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(COLORS.primary)
          .text(`${idx + 1}. ${action.title}`, 50, actionY);

        doc.fontSize(8)
          .font('Helvetica')
          .fillColor(COLORS.textLight)
          .text(action.impact, 60, doc.y + 3);

        actionY = doc.y + 12;
      });

      // Footer on all pages
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);

        doc.fontSize(8)
          .font('Helvetica')
          .fillColor(COLORS.textLight)
          .text(
            `VistaraBI Strategic Intelligence Platform | Page ${i + 1} of ${pageCount}`,
            40,
            doc.page.height - 30,
            { align: 'center' }
          );
      }

      doc.end();

      stream.on('finish', () => {
        console.log(`✅ PDF created: ${filename}`);
        resolve(filepath);
      });

      stream.on('error', reject);

    } catch (error) {
      reject(error);
    }
  });
}

async function main() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('PROFESSIONAL ARCHIVE REPORT PDF GENERATOR');
    console.log('='.repeat(80));

    for (const project of SAMPLE_PROJECTS) {
      try {
        await createArchiveReport(project);
      } catch (error) {
        console.error(`❌ Error generating PDF for ${project.archiveName}:`, error.message);
      }
    }

    // Create credentials file
    const credentialsPath = path.join(REPORTS_DIR, 'PROFESSIONAL_ARCHIVE_CREDENTIALS.txt');
    fs.writeFileSync(credentialsPath, `
╔════════════════════════════════════════════════════════════════╗
║     PROFESSIONAL ARCHIVE REPORTS - STRATEGIC DELIVERY           ║
╚════════════════════════════════════════════════════════════════╝

GENERATED REPORTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ retail-archive-archive-1-report.pdf
  - 5 pages
  - Project: batch-archive--1--896eba39
  - Archive: archive (1)
  - Domain: RETAIL

EACH PDF CONTAINS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Page 1: Cover & Metadata
  - Archive name and project ID
  - Domain classification
  - Report summary

✓ Page 2: Selected KPIs & Performance
  - 5 KPIs with values and trends
  - Sparkline charts for each KPI
  - Category badges (revenue, growth, product, profitability)
  - Professional card layout

✓ Page 3: AI Insights & Schema Analysis
  - 5 Q&A pairs on schema structure
  - ETL requirements and dependencies
  - Technical recommendations
  - Data type validations

✓ Page 4: Key Metrics & Forecasts
  - Target metrics (baseline, target, gap)
  - Success probability
  - Forecast data with trends
  - Confidence levels

✓ Page 5: Datasets & Strategic Actions
  - Uploaded datasets info
  - File status (READY, etc)
  - Column counts
  - Strategic action timeline
  - Day-by-day milestones

PROFESSIONAL FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Color-coded sections (Blue, Purple, Green)
✓ Professional typography (Helvetica)
✓ Category badges for KPI classification
✓ Sparkline charts for trend visualization
✓ Structured tables and layouts
✓ Multi-page reports with pagination
✓ Print-ready PDF quality
✓ Complete metadata and summaries

FILE LOCATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${REPORTS_DIR}

QUICK START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Navigate to the reports folder above
2. Open the PDF in your default viewer
3. Review all 5 pages of strategic intelligence
4. Share with stakeholders

Generated: ${new Date().toLocaleString()}
Status: ✅ COMPLETE & PROFESSIONAL
    `);

    console.log('\n' + '='.repeat(80));
    console.log('✅ PROFESSIONAL ARCHIVE REPORTS GENERATED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`\n📁 Reports saved to: ${REPORTS_DIR}`);
    console.log(`\n📄 See PROFESSIONAL_ARCHIVE_CREDENTIALS.txt for details\n`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
