import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function run() {
    console.log("--- 🏛 STARTING FULL UI STATE POPULATION ---");
    const userEmail = 'testbatch@examples.com';
    const user = await prisma.user.findUnique({ where: { email: userEmail } });

    if (!user) {
        console.error("❌ User not found!");
        process.exit(1);
    }

    const projects = await prisma.project.findMany({
        where: { userId: user.id },
        include: { sources: true }
    });

    console.log(`Found ${projects.length} projects to populate.`);

    for (const project of projects) {
        console.log(`\nPopulating Project: ${project.name} (${project.id})`);
        
        let activeDomain = 'RETAIL';
        if (project.name.includes('MANUFACTURING')) activeDomain = 'MANUFACTURING';
        if (project.name.includes('ECOMMERCE')) activeDomain = 'ECOMMERCE';

        // 1. Populate Source-level details (M2: Cleaning & Quality)
        for (const source of project.sources) {
            // CleanedDataset
            await prisma.cleanedDataset.upsert({
                where: { sourceId: source.id },
                update: {},
                create: {
                    sourceId: source.id,
                    cleanedData: source.data || [],
                    cleanedRowCount: source.rowCount,
                    cleanedColCount: source.colCount,
                    cleanedColumns: source.columns,
                    status: 'CLEANED'
                }
            });

            // CleaningLog
            await prisma.cleaningLog.upsert({
                where: { sourceId: source.id },
                update: {},
                create: {
                    sourceId: source.id,
                    nullsFilled: Math.floor(Math.random() * 50),
                    duplicatesRemoved: Math.floor(Math.random() * 10),
                    datesNormalized: 0,
                    currenciesNormalized: 0,
                    textsStandardized: 0,
                    emptyColumnsRemoved: 0,
                    originalRowCount: source.rowCount + 10,
                    cleanedRowCount: source.rowCount
                }
            });

            // QualityIntelligence
            await prisma.qualityIntelligence.upsert({
                where: { sourceId: source.id },
                update: {},
                create: {
                    sourceId: source.id,
                    overallGrade: 'A',
                    completenessScore: 98.5,
                    consistencyScore: 99.0,
                    accuracyScore: 97.5,
                    riskLevel: 'LOW',
                    totalRecords: source.rowCount,
                    healthyRecords: source.rowCount,
                    riskyRecords: 0
                }
            });
            
            // ColumnHealth
            for (const col of source.columns) {
                const healthId = randomUUID();
                await prisma.columnHealth.create({
                    data: {
                        id: healthId,
                        sourceId: source.id,
                        columnName: col,
                        healthStatus: 'GOOD',
                        completeness: 100,
                        consistency: 100,
                        outlierCount: 0,
                        uniqueness: 50,
                        issues: []
                    }
                });
            }
        }
        
        // 2. Domain Detection (M3)
        await prisma.domainDetection.upsert({
            where: { projectId: project.id },
            update: {},
            create: {
                projectId: project.id,
                detectedDomain: activeDomain,
                confidence: 0.95,
                status: 'AUTO_ASSIGNED',
                scoringBreakdown: { RETAIL: 0.95, ECOMMERCE: 0.05 },
                matchedColumns: project.sources[0]?.columns || [],
                explanation: `High confidence match for ${activeDomain} based on schema structure.`
            }
        });

        await prisma.aIDomainReasoning.upsert({
            where: { projectId: project.id },
            update: {},
            create: {
                projectId: project.id,
                ruleBasedDomain: activeDomain,
                ruleBasedConfidence: 0.9,
                matchedColumns: project.sources[0]?.columns || [],
                unmatchedColumns: [],
                aiRecommendedDomain: activeDomain,
                aiSemanticConfidence: 0.98,
                aiAlternativeDomain: 'SAAS',
                aiAlternativeConfidence: 0.1,
                aiReasoning: `Semantic analysis strongly supports ${activeDomain}.`,
                aiSemanticSignals: ["sales", "customer", "transaction"],
                aiColumnInsights: "Columns align with domain blueprint.",
                combinedConfidence: 0.95,
                finalDomain: activeDomain,
                wasAutoAssigned: true,
                ollamaModel: "qwen3:0.6b",
                processingTimeMs: 1200
            }
        });

        // 3. KPI Discovery (M4)
        const mockKpis = [
            { kpiId: 'kpi-1', kpiName: 'Primary Metric', category: 'revenue', defaultVisualizationHint: 'line_chart' },
            { kpiId: 'kpi-2', kpiName: 'Secondary Metric', category: 'efficiency', defaultVisualizationHint: 'bar_chart' }
        ];

        await prisma.kPIDiscovery.upsert({
            where: { projectId: project.id },
            update: {},
            create: {
                projectId: project.id,
                domain: activeDomain,
                totalKPIsAnalyzed: 5,
                computableKPIs: mockKpis,
                partialKPIs: [],
                availableColumns: project.sources[0]?.columns || []
            }
        });

        // KPI Blueprint
        const blueprint = await prisma.kPIBlueprint.upsert({
            where: { projectId: project.id },
            update: {},
            create: {
                projectId: project.id,
                domain: activeDomain,
                version: 1,
                isLocked: true
            }
        });

        // Clear existing KPIs to prevent duplicates
        await prisma.approvedKPI.deleteMany({
            where: { blueprintId: blueprint.id }
        });

        // Approved KPIs
        for (const kpi of mockKpis) {
            const createdKpi = await prisma.approvedKPI.create({
                data: {
                    blueprintId: blueprint.id,
                    name: kpi.kpiName,
                    sourceTable: project.sources[0]?.fileName || 'table',
                    category: kpi.category
                }
            });

            await prisma.aggregationRule.create({
                data: {
                    kpiId: createdKpi.id,
                    function: 'SUM',
                    column: 'amount'
                }
            });
        }

        // 4. Dashboard State (M5)
        const dState = await prisma.dashboardState.upsert({
            where: { projectId: project.id },
            update: {},
            create: {
                projectId: project.id,
                domain: activeDomain,
                version: 1,
                globalFilters: {},
                granularity: 'monthly'
            }
        });

        // Dashboard Cards
        for (let i = 0; i < mockKpis.length; i++) {
            await prisma.dashboardCard.create({
                data: {
                    stateId: dState.id,
                    kpiId: mockKpis[i].kpiId,
                    kpiName: mockKpis[i].kpiName,
                    chartType: mockKpis[i].defaultVisualizationHint,
                    position: i,
                    filterOverrides: {}
                }
            });
        }

        // 5. Chat History & Audit Log (M6)
        await prisma.auditLog.create({
            data: {
                sessionId: randomUUID(),
                intentId: randomUUID(),
                userId: user.id,
                rawUserQuery: `Analyze ${activeDomain} performance.`,
                normalizedUserQuery: "analyze performance",
                llmRawOutput: "Performance is optimal. Q1: What drives this? A1: Key metrics.",
                executionStatus: "COMPLETED",
                structuredCommand: { type: "ANALYSIS" }
            }
        });

        // 6. Strategy & Forecasting (M7/8)
        await prisma.projectGoal.create({
            data: {
                projectId: project.id,
                rawQuery: "Increase primary metric by 15%",
                targetKpiId: "kpi-1",
                targetValue: "15%",
                timeframe: "Q3 2024",
                generatedPlan: {
                    probabilityOfSuccess: 0.85,
                    reliabilityScore: 90,
                    milestones: [
                        { day: 15, label: "Phase 1 Rollout", date: "2024-07-15" },
                        { day: 30, label: "Optimization", date: "2024-07-30" }
                    ]
                },
                status: "ACTIVE"
            }
        });

        console.log(`✅ Fully seeded ${project.name}`);
    }

    console.log("\n✅ ALL UI STATES SUCCESSFULLY POPULATED.");
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
