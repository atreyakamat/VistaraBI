import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import db from './src/lib/prisma';
import { randomUUID } from 'crypto';
import { discoverKPIs } from './src/lib/kpi';
import { ensureDataMaterialized, executeDashboard } from './src/lib/execution';
import { validateStrategy } from './src/lib/module-8/strategy-validator';
import { MasterAgent } from './src/lib/ai/master-agent';
import { generateDashboardConfig } from './src/lib/dashboard';
import { renderToFile } from '@react-pdf/renderer';
import { ExecutiveReport } from './src/lib/module-9/ReportTemplate';
import { generateWithFallback } from './src/lib/ai/unified-ai-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function simpleParseCsv(content: string): Record<string, string>[] {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const records: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values: string[] = [];
        let inQuote = false;
        let currVal = '';
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') {
                inQuote = !inQuote;
            } else if (line[j] === ',' && !inQuote) {
                values.push(currVal.trim());
                currVal = '';
            } else {
                currVal += line[j];
            }
        }
        values.push(currVal.trim());

        const record: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
            record[headers[j]] = values[j] || '';
        }
        records.push(record);
    }
    
    return records;
}

async function runBlinkitE2E() {
    console.log("=========================================");
    console.log("🚀 VistaraBI Blinkit Retail E2E Automated Test");
    console.log("=========================================\n");

    const projectId = randomUUID();

    try {
        console.log(`1️⃣ Creating Test Project: ${projectId}`);
        const user = await db.user.findFirst();
        if (!user) throw new Error("No user found in DB. Please seed DB.");

        await db.project.create({
            data: {
                id: projectId,
                userId: user.id,
                name: "Blinkit Retail Presentation",
            }
        });

        console.log(`2️⃣ Ingesting Retail Dataset from datasets/retail...`);
        const dataDir = path.resolve(__dirname, 'datasets/retail');
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));

        const allColumns: string[] = [];
        const uploadedDatasetsMeta: any[] = [];
        
        for (const file of files) {
            const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
            const records = simpleParseCsv(content);
            
            if (records.length === 0) continue;
            
            const cols = Object.keys(records[0]);
            allColumns.push(...cols);
            uploadedDatasetsMeta.push({
                fileName: file,
                status: 'CLEANED',
                columns: cols.length
            });

            await db.source.create({
                data: {
                    id: randomUUID(),
                    projectId,
                    fileName: file,
                    fileType: 'text/csv',
                    columns: cols,
                    data: records, // Store raw
                    uploadedAt: new Date(),
                    status: 'READY' as any,
                    cleanedDataset: {
                        create: {
                            id: randomUUID(),
                            cleanedColumns: cols,
                            cleanedData: records,
                            cleanedRowCount: records.length,
                            cleanedColCount: cols.length,
                            status: 'CLEANED' as any,
                            cleanedAt: new Date()
                        }
                    }
                }
            });
        }
        
        console.log(`3️⃣ Setting Domain to RETAIL...`);
        await db.domainDetection.create({
            data: {
                id: randomUUID(),
                projectId,
                detectedDomain: 'RETAIL',
                confidence: 95,
                status: 'AUTO_ASSIGNED',
                scoringBreakdown: {},
                matchedColumns: [],
                explanation: 'Test'
            }
        });
        await db.domainGovernance.create({
            data: {
                id: randomUUID(),
                projectId,
                activeDomain: 'RETAIL',
                governanceStatus: 'AUTO',
                isLocked: false,
                version: 1,
                changedBy: 'system',
                changeReason: 'Test'
            }
        });

        console.log(`4️⃣ Running KPI Discovery...`);
        const discovery = await discoverKPIs(projectId);
        console.log(`   Discovered ${discovery?.computableKPIs.length || 0} computable KPIs`);
        
        if (!discovery || discovery.computableKPIs.length === 0) {
            throw new Error("No computable KPIs found. Semantic mapping might be failing.");
        }

        console.log(`5️⃣ Generating KPI Blueprint...`);
        
        // Take top 5 computable KPIs
        const selectedKPIs = discovery.computableKPIs.slice(0, 5);
        
        const bp = await db.kPIBlueprint.create({
            data: {
                id: randomUUID(),
                projectId,
                kpis: {
                    create: selectedKPIs.map(kpi => ({
                        id: randomUUID(),
                        kpiLibraryId: kpi.kpiId,
                        name: kpi.kpiName,
                        category: kpi.category,
                        sourceTable: 'merged_data',
                        lineage: {
                            create: {
                                formula: kpi.formulaExpression,
                                tables: ['merged_data'],
                                joins: []
                            }
                        },
                        aggregations: {
                            create: (kpi.aggregations || []).map(a => ({
                                function: a.function,
                                column: a.column
                            }))
                        }
                    }))
                }
            }
        });

        console.log(`6️⃣ Materializing Data (Module 5)...`);
        await ensureDataMaterialized(projectId);
        console.log(`   Materialization complete.`);

        console.log(`7️⃣ Executing Dashboard (Module 5)...`);
        
        await generateDashboardConfig(projectId);
        
        const dashResult = await executeDashboard(projectId);
        console.log(`   Dashboard Execution Complete. KPIs computed: ${dashResult.kpis.length}`);

        if (dashResult.kpis.length === 0) {
            throw new Error("Dashboard execution returned 0 KPIs.");
        }
        
        // Output some sample values to ensure they aren't zero
        dashResult.kpis.forEach(k => {
            console.log(`   -> ${k.kpiName}: ${k.primaryValue}`);
            if (k.primaryValue === 0) {
                console.warn(`   ⚠️ Warning: KPI ${k.kpiName} returned 0 value. Check aggregations/mapping.`);
            }
        });

        console.log(`8️⃣ Testing AI Inference & Master Agent (Module 6)...`);
        const aiResponse = await MasterAgent.processRequest({
            query: "Analyze this Blinkit Retail data. Our goal is 15% revenue growth. What are the key bottlenecks?",
            domain: "RETAIL",
            datasets: { "retail_data.csv": allColumns },
            metrics: { totalSales: dashResult.kpis.find(k => k.kpiId === 'rt-001')?.primaryValue }
        });
        console.log(`\n   🧠 AI INFERENCE INSIGHTS [${aiResponse.model}]:`);
        console.log(`   ${aiResponse.content}\n`);

        console.log(`9️⃣ Testing Forecasting (Module 8)...`);
        // Find a KPI with history
        const kpiWithHistory = dashResult.kpis.find(k => k.dataset && k.dataset.some(d => d.date && typeof d.date === 'string' && d.date.match(/^\d{4}-\d{2}-\d{2}/)));
        let strategyResult: any;
        let selectedForecastKpi = '';
        if (kpiWithHistory) {
            selectedForecastKpi = kpiWithHistory.kpiName;
            const history = kpiWithHistory.dataset?.filter(d => d.date && typeof d.date === 'string' && d.date.match(/^\d{4}-\d{2}-\d{2}/)).map((d: any) => ({
                date: d.date.slice(0, 10),
                value: Number(d.value) || 0
            })) || [];
            
            const forecastReq = {
                domain: 'RETAIL' as any,
                goalValue: history[history.length - 1].value * 1.15, // 15% growth
                horizonDays: 30,
                kpiHistory: history,
                confidenceLevel: 0.8,
                actions: [
                    { id: 'a1', name: 'Decrease Delivery Time', expectedUplift: 0.08, rampDays: 5, startDayOffset: 0 }
                ]
            };

            strategyResult = await validateStrategy(forecastReq);
            console.log(`   📈 FORECAST SUCCESS: Probability of Success is ${(strategyResult.probabilityOfSuccess * 100).toFixed(1)}%`);
            console.log(`   Baseline points: ${strategyResult.scenarios.baseline.length}`);
        } else {
            console.log(`   ⚠️ No time-series KPI found to test forecasting. Generating mock...`);
            selectedForecastKpi = 'Mock Revenue';
            const mockHistory = Array.from({length: 90}, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (90 - i));
                return { date: d.toISOString().slice(0,10), value: 1000 + i * 10 + Math.random() * 50 };
            });
            const forecastReq = {
                domain: 'RETAIL' as any,
                goalValue: 2500,
                horizonDays: 30,
                kpiHistory: mockHistory,
                confidenceLevel: 0.8,
                actions: []
            };
            strategyResult = await validateStrategy(forecastReq);
            console.log(`   📈 Mock FORECAST SUCCESS: Probability of Success is ${(strategyResult.probabilityOfSuccess * 100).toFixed(1)}%`);
        }

        console.log(`🔟 Generating Executive PDF Report (Module 9)...`);
        
        const summaryPrompt = `
            Context:
            - Domain: RETAIL
            - Probability of Strategy Success: ${(strategyResult.probabilityOfSuccess * 100).toFixed(1)}%
            - Target Goal Growth: 15%
            - Chat Inference Context: ${aiResponse.content}

            Write a 2-paragraph board-ready summary analyzing this retail performance.
            Output strictly the professional text.
        `;
        const summaryRes = await generateWithFallback({
            messages: [{ role: 'user', content: summaryPrompt }],
            temperature: 0.2,
            agentRole: 'narrative-writer',
            model: 'qwen3.5:0.8b' // Force fast local model to prevent 120s cloud timeouts during automated testing
        });

        const outputPath = path.join(process.cwd(), 'Blinkit_Retail_Report.pdf');
        
        // Use a 10x10 gray box base64 as placeholder for chart images in Node test so they are actually visible
        const mockImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNjZCASMDKgAnv37v3/n0SMRmEAwzAMw4gKA2I1AA1mEAw20F8rAAAAAElFTkSuQmCC";

        await renderToFile(
            <ExecutiveReport
                summaryText={summaryRes.content}
                domain={'RETAIL'}
                selectedKPIs={selectedKPIs.map(k => ({ name: k.kpiName, category: k.category }))}
                aiInsights={aiResponse.content}
                actions={[{ title: "Decrease Delivery Time", impact: "High" }]}
                businessSuggestions={["Optimize delivery routes", "Reduce stock-outs for high-velocity SKUs"]}
                forecastData={{
                    kpi: selectedForecastKpi,
                    trend: strategyResult.probabilityOfSuccess > 0.5 ? 'Significant Upward Trend' : 'Stagnant',
                    confidence: strategyResult.reliabilityScore > 70 ? 'High (Statistical)' : 'Medium'
                }}
                metrics={{ 
                    probability: strategyResult.probabilityOfSuccess, 
                    gap: 5000, 
                    target: strategyResult.scenarios.baseline[strategyResult.scenarios.baseline.length-1]?.yhat * 1.15 || 50000 
                }}
                chartImage={mockImg}
                dashboardImage={mockImg}
                globalChatSummary={aiResponse.content}
                uploadedDatasets={uploadedDatasetsMeta}
                cleaningSummary={`Dataset normalization complete. Managed ${uploadedDatasetsMeta.length} files. Semantic roles assigned to ${allColumns.length} columns.`}
            />,
            outputPath
        );

        console.log(`   📄 PDF REPORT GENERATED at: ${outputPath}`);
        console.log("\n✅ E2E Retail Test Passed Successfully!");

    } catch (e: any) {
        console.error("\n❌ E2E Test Failed:", e);
    }
}

runBlinkitE2E().catch(console.error);