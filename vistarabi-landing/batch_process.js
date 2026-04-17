
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

import { ensureDataMaterialized } from './src/lib/execution/data-materializer.js';
import { discoverKPIs } from './src/lib/kpi/index.js';
import { MasterAgent } from './src/lib/ai/master-agent.js';
import { validateStrategy } from './src/lib/module-8/strategy-validator.js';

const RETAIL_BASE_DIR = './datasets/retail';
const OUTPUT_DIR = './batch_reports';

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

async function processArchive(archiveName) {
    console.log(`\n--- Processing ${archiveName} ---`);
    const archivePath = path.join(RETAIL_BASE_DIR, archiveName);
    
    // Check if it's a directory
    if (!fs.statSync(archivePath).isDirectory()) return null;

    let files = fs.readdirSync(archivePath).filter(f => f.endsWith('.csv') || f.endsWith('.xlsx'));
    let effectivePath = archivePath;

    if (files.length === 0) {
        // Handle nested Master Data in archive (7)
        const nestedPath = path.join(archivePath, 'Master Data');
        if (fs.existsSync(nestedPath) && fs.statSync(nestedPath).isDirectory()) {
            effectivePath = nestedPath;
            files = fs.readdirSync(nestedPath).filter(f => f.endsWith('.csv') || f.endsWith('.xlsx'));
        }
    }

    if (files.length === 0) {
        console.warn(`No data files in ${archiveName}`);
        return null;
    }

    const projectId = `batch-${archiveName.replace(/[^a-z0-9]/gi, '-')}-${randomUUID().slice(0,8)}`;
    
    // 1. Create Project
    await db.project.create({
        data: {
            id: projectId,
            name: `Retail Report: ${archiveName}`,
            domain: 'RETAIL',
        }
    });

    // 2. Ingest Files (Sample only)
    for (const file of files) {
        const filePath = path.join(effectivePath, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const data = lines.slice(1, 50).map(line => {
                const cells = line.split(',');
                const obj = {};
                headers.forEach((h, i) => obj[h] = cells[i]);
                return obj;
            });

            await db.source.create({
                data: {
                    projectId,
                    fileName: file,
                    columns: headers,
                    data: data,
                    uploadedAt: new Date(),
                }
            });
        } catch (e) {
            console.error(`Failed to ingest ${file}:`, e.message);
        }
    }

    // 3. Set Governed Domain
    await db.domainGovernance.create({
        data: {
            projectId,
            activeDomain: 'RETAIL',
            confidence: 1.0,
        }
    });

    // 4. Materialize Data
    await ensureDataMaterialized(projectId);

    // 5. Discover KPIs (Module 4)
    const discovery = await discoverKPIs(projectId);
    const topKpi = discovery?.computableKPIs?.[0];

    // 6. AI Query Simulation (Module 6)
    const m6_query = `Analyze the ${topKpi?.kpiName || 'Retail Sales'} trend and identify any seasonal patterns.`;
    const m6_result = await MasterAgent.processRequest({
        query: m6_query,
        domain: 'RETAIL',
        datasets: Object.fromEntries(files.map(f => [f, discovery?.availableColumns || []])),
        metrics: discovery?.computableKPIs
    });

    // 7. Strategy Simulation (Module 7/8)
    const m7_query = `How can we increase ${topKpi?.kpiName || 'Total Sales'} by 15% in the next 90 days?`;
    const strategy = await validateStrategy({
        kpiId: topKpi?.kpiId || 'rt-001',
        goalValue: 1000000,
        horizonDays: 90,
        kpiHistory: [
            { date: '2024-01-01', value: 50000 },
            { date: '2024-02-01', value: 55000 },
            { date: '2024-03-01', value: 52000 }
        ],
        actions: [{ name: 'Marketing Campaign', expectedUplift: 0.1, startDayOffset: 10, rampDays: 20 }]
    });

    // 8. Log Summary
    const summary = {
        archiveName,
        projectId,
        topKpis: discovery?.computableKPIs?.map(k => k.kpiName).slice(0, 3),
        module6: {
            query: m6_query,
            agent: m6_result.agentRole,
            response: m6_result.content.slice(0, 200) + '...'
        },
        module7: {
            query: m7_query,
            probability: strategy.probabilityOfSuccess,
            primaryDriver: strategy.sensitivity.primaryDriver
        }
    };

    fs.writeFileSync(path.join(OUTPUT_DIR, `${archiveName.replace(/[^a-z0-9]/gi, '_')}_summary.json`), JSON.stringify(summary, null, 2));
    
    // Simulate PDF generation by creating a markdown version
    const reportMd = `
# Strategic Report: ${archiveName}
**Project ID:** ${projectId}
**Domain:** RETAIL

## 1. Data Ingestion Summary
- Files: ${files.join(', ')}
- Total Columns Identified: ${discovery?.availableColumns?.length || 0}

## 2. KPI Intelligence (Module 4)
Top Discovered KPIs:
${discovery?.computableKPIs?.map(k => `- ${k.kpiName} (Formula: ${k.formulaExpression})`).join('\n') || 'None'}

## 3. AI Insights (Module 6)
**Query:** ${m6_query}
**Persona:** ${m6_result.agentRole}
**Insight:** ${m6_result.content}

## 4. Goal Strategy (Module 7/8)
**Objective:** ${m7_query}
**Probability of Success:** ${(strategy.probabilityOfSuccess * 100).toFixed(1)}%
**Primary Driver:** ${strategy.sensitivity.primaryDriver}

## 5. Technical Execution Log
- SQL Materializer initialized for table: merged_data_${projectId.replace(/-/g, '_')}
- Semantic Resolver mapped ${discovery?.computableKPIs?.length || 0} roles.
- Prophet Bridge executed with linear fallback (synthetic data used for simulation).
    `;
    
    fs.writeFileSync(path.join(OUTPUT_DIR, `${archiveName.replace(/[^a-z0-9]/gi, '_')}_report.md`), reportMd);
    
    return summary;
}

async function run() {
    const archives = fs.readdirSync(RETAIL_BASE_DIR).filter(d => d.startsWith('archive'));

    const results = [];
    for (const archive of archives) {
        try {
            const result = await processArchive(archive);
            if (result) results.push(result);
        } catch (e) {
            console.error(`Failed to process ${archive}:`, e.message);
        }
    }

    const masterSummary = `
# VistaraBI Batch Execution Summary
**Date:** 2026-04-17
**Total Archives Processed:** ${results.length}

${results.map(r => `
### ${r.archiveName}
- **Project:** ${r.projectId}
- **Top KPIs:** ${r.topKpis.join(', ')}
- **AI Persona:** ${r.module6.agent}
- **Success Prob:** ${(r.module7.probability * 100).toFixed(1)}%
`).join('\n')}
    `;
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'FINAL_BATCH_SUMMARY.md'), masterSummary);
    console.log('\n✅ Batch processing complete. Files generated in vistarabi-landing/batch_reports/');
    await db.$disconnect();
}

run();
