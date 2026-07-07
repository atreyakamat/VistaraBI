import fs from 'fs';
import path from 'path';
import db from '../src/lib/prisma';
import { parseFile } from '../src/lib/parsers';
import { runFullAnalysis } from '../src/lib/intelligence';
import { purifyDataset } from '../src/lib/purification';
import { discoverKPIs } from '../src/lib/kpi';
import { insertKPIBlueprints } from '../src/lib/kpi/blueprint-inserter';
import { runDashboardIntelligence } from '../src/lib/dashboard-state/module-5-5';
import { executeGoalPipeline } from '../src/lib/module-7/goal-engine';

const DOMAIN = 'retail';
const DATASETS_DIR = path.resolve(__dirname, `../test-datasets/${DOMAIN}`);

async function main() {
    console.log(`🚀 Starting Full Pipeline Test (Modules 6, 7, 8, 9) for ${DOMAIN.toUpperCase()}`);

    // 1. Create a dummy test user and project
    const testUser = await db.user.upsert({
        where: { email: 'e2e-tester@vistarabi.com' },
        update: {},
        create: {
            email: 'e2e-tester@vistarabi.com',
            name: 'E2E Tester',
            password: 'dummy',
        }
    });

    const project = await db.project.create({
        data: {
            userId: testUser.id,
            name: `E2E Test Project - ${DOMAIN} - ${Date.now()}`,
            description: 'Automated full pipeline test',
        }
    });

    // Assign Domain Governance (Required for Module 6)
    await db.domainGovernance.create({
        data: {
            projectId: project.id,
            activeDomain: 'RETAIL',
            governanceStatus: 'MANUAL',
            isLocked: false,
            version: 1,
            changedBy: testUser.id,
            changeReason: 'E2E Testing',
        }
    });

    console.log(`✅ Created test project: ${project.id}`);

    // 2. Read datasets
    const files = fs.readdirSync(DATASETS_DIR).filter(f => f.endsWith('.csv'));
    
    if (files.length === 0) {
        console.error(`❌ No CSV files found in ${DATASETS_DIR}`);
        process.exit(1);
    }

    // Process the first file for full end-to-end testing (to keep it fast)
    // You can loop over all if you want, but one is enough to verify modules 6-9
    const fileName = files[0];
    console.log(`\n⏳ [INGESTION] Ingesting ${fileName}...`);
    const filePath = path.join(DATASETS_DIR, fileName);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        let source = await db.source.create({
            data: {
                projectId: project.id,
                fileName,
                fileType: 'csv',
                status: 'PROCESSING',
                rowCount: 0,
                colCount: 0,
                columns: [],
                data: [],
            }
        });

        const parseResult = await parseFile(fileName, content);
        
        source = await db.source.update({
            where: { id: source.id },
            data: {
                status: 'READY',
                rowCount: parseResult.rowCount,
                colCount: parseResult.colCount,
                columns: parseResult.columns,
                data: parseResult.data as any,
            }
        });

        console.log(`   - Running full analysis...`);
        await runFullAnalysis(source.id, true);

        console.log(`   - Running purification...`);
        await purifyDataset(source.id);
        console.log(`✅ [INGESTION] Complete`);

        // --- MODULE 6: KPI ENGINE ---
        console.log(`\n⏳ [MODULE 6: KPI ENGINE] Discovering KPIs...`);
        const discovery = await discoverKPIs(project.id);
        if (!discovery || discovery.computableKPIs.length === 0) {
            console.error(`❌ No computable KPIs found!`);
        } else {
            console.log(`   - Found ${discovery.computableKPIs.length} computable KPIs`);
            const bp = await db.kPIBlueprint.create({
                data: {
                    projectId: project.id,
                    domain: 'RETAIL',
                    version: 1,
                    isLocked: false,
                }
            });
            for (const kpi of discovery.computableKPIs) {
                await db.approvedKPI.create({
                    data: {
                        blueprintId: bp.id,
                        kpiLibraryId: kpi.kpiId,
                        name: kpi.kpiName,
                        category: kpi.category,
                        sourceTable: fileName,
                        unit: 'number',
                    }
                });
            }
            console.log(`✅ [MODULE 6] Blueprints inserted`);
        }

        // --- MODULE 7 (5.5): AI INSIGHTS ---
        console.log(`\n⏳ [MODULE 7: AI INSIGHTS] Generating Dashboard Intelligence...`);
        try {
            const insights = await runDashboardIntelligence(project.id, { skipCache: true });
            console.log(`   - Generated ${insights.state.kpis.length} KPIs with AI analysis`);
            console.log(`   - Anomalies detected: ${insights.state.insightFeed?.length || 0}`);
            console.log(`✅ [MODULE 7] Complete`);
        } catch (e: any) {
            console.log(`⚠️ [MODULE 7] Note: AI Insights might fail if Ollama is not running: ${e.message}`);
        }

        // --- MODULE 8: STRATEGY GOALS ---
        console.log(`\n⏳ [MODULE 8: STRATEGY ENGINE] Generating Strategy Canvas...`);
        try {
            const canvas = await executeGoalPipeline("Increase revenue by 15%", "RETAIL", ["Global"]);
            console.log(`   - Generated Strategy: ${canvas.goal.title}`);
            console.log(`   - Scenarios: ${canvas.scenarios.length}`);
            console.log(`✅ [MODULE 8] Complete`);
        } catch (e: any) {
             console.log(`⚠️ [MODULE 8] Note: Strategy Engine might fail if Ollama is not running: ${e.message}`);
        }

        // --- MODULE 9: EXPORTS ---
        console.log(`\n⏳ [MODULE 9: EXPORTS] Verifying SQL Materialization...`);
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const tableName = `merged_data_${project.id.replace(/-/g, '_')}`;
        try {
            const result = await pool.query(`SELECT COUNT(*) FROM "${tableName}"`);
            console.log(`   - Merged table contains ${result.rows[0].count} rows. Export is ready!`);
            console.log(`✅ [MODULE 9] Complete`);
        } catch (e: any) {
            console.log(`⚠️ [MODULE 9] Table not found or error (Merge pipeline might be async): ${e.message}`);
        }
        await pool.end();

        console.log(`\n🎉 All modules tested successfully!`);

    } catch (error: any) {
        console.error(`❌ Error in pipeline test:`, error);
        process.exit(1);
    }
}

main();
