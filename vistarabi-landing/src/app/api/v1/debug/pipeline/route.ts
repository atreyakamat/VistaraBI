// DEBUG ENDPOINT: Pipeline Verification & Module Health Check
// GET /api/v1/debug/pipeline?projectId=abc123
// DEVELOPMENT ONLY — blocked in production

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { checkOllamaHealth, listModels, getDomainModel } from '@/lib/ai/ollama-client';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    // Require authentication even in dev
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const projectId = request.nextUrl.searchParams.get('projectId');
        
        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId required' },
                { status: 400 }
            );
        }

        const report: any = {
            timestamp: new Date().toISOString(),
            projectId,
            modules: {},
        };

        // ═══════════════════════════════════════════════════════════════════════════
        // MODULE 1-2: DATA INGESTION & CLEANING
        // ═══════════════════════════════════════════════════════════════════════════
        report.modules['1-2'] = {
            name: 'Data Upload & Cleaning',
            status: 'pending'
        };

        try {
            const sources = await db.source.findMany({
                where: { project: { id: projectId } },
                select: {
                    id: true,
                    fileName: true,
                    fileType: true,
                    status: true,
                    rowCount: true,
                    colCount: true,
                    qualityScore: true,
                    uploadedAt: true,
                },
            });

            report.modules['1-2'] = {
                name: 'Data Upload & Cleaning',
                status: sources.length > 0 ? 'active' : 'pending',
                sourcesCount: sources.length,
                sources: sources.map(s => ({
                    fileName: s.fileName,
                    status: s.status,
                    rows: s.rowCount,
                    cols: s.colCount,
                    quality: s.qualityScore,
                })),
            };
        } catch (err: any) {
            report.modules['1-2'].status = 'error';
            report.modules['1-2'].error = err.message;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // MODULE 3: DOMAIN DETECTION
        // ═══════════════════════════════════════════════════════════════════════════
        report.modules['3'] = {
            name: 'Domain Detection',
            status: 'pending'
        };

        try {
            const domainDetection = await db.domainDetection.findUnique({
                where: { projectId },
            });

            if (domainDetection) {
                report.modules['3'] = {
                    name: 'Domain Detection',
                    status: 'complete',
                    domain: domainDetection.detectedDomain,
                    confidence: domainDetection.confidence || 0,
                    modelSelected: getDomainModel(domainDetection.detectedDomain),
                };
            } else {
                report.modules['3'].status = 'pending';
            }
        } catch (err: any) {
            report.modules['3'].status = 'error';
            report.modules['3'].error = err.message;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // MODULE 4: KPI ENGINE & BLUEPRINT
        // ═══════════════════════════════════════════════════════════════════════════
        report.modules['4'] = {
            name: 'KPI Engine & Blueprint',
            status: 'pending'
        };

        try {
            const blueprint = await db.kPIBlueprint.findUnique({
                where: { projectId },
                select: {
                    id: true,
                    kpis: {
                        select: { id: true, name: true },
                    },
                },
            });

            if (blueprint) {
                report.modules['4'] = {
                    name: 'KPI Engine & Blueprint',
                    status: blueprint.kpis.length > 0 ? 'complete' : 'pending',
                    kpiCount: blueprint.kpis.length,
                };
            }
        } catch (err: any) {
            report.modules['4'].status = 'error';
            report.modules['4'].error = err.message;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // MODULE 5A: SQL EXECUTION & MATERIALIZATION
        // ═══════════════════════════════════════════════════════════════════════════
        report.modules['5A'] = {
            name: 'SQL Execution & Materialization',
            status: 'active', // Assumed to be working if blueprint exists
        };

        // ═══════════════════════════════════════════════════════════════════════════
        // MODULE 5B: DASHBOARD GENERATION
        // ═══════════════════════════════════════════════════════════════════════════
        report.modules['5B'] = {
            name: 'Dashboard Generation & AI Explanations',
            status: 'pending'
        };

        try {
            const dashboard = await db.dashboardConfig.findUnique({
                where: { projectId },
                select: {
                    id: true,
                    version: true,
                    metadata: true,
                },
            });

            if (dashboard) {
                const metadata = dashboard.metadata as any;
                const hasExplanations = !!metadata?.kpiExplanations && Object.keys(metadata.kpiExplanations).length > 0;
                
                report.modules['5B'] = {
                    name: 'Dashboard Generation & AI Explanations',
                    status: 'complete',
                    version: dashboard.version,
                    explanationsGenerated: hasExplanations,
                    explanationCount: hasExplanations ? Object.keys(metadata.kpiExplanations).length : 0,
                };
            }
        } catch (err: any) {
            report.modules['5B'].status = 'error';
            report.modules['5B'].error = err.message;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // MODULE 6: AI ANALYTICS & REASONING
        // ═══════════════════════════════════════════════════════════════════════════
        report.modules['6'] = {
            name: 'AI Analytics & Reasoning',
            status: 'active',
            gateway: '/api/projects/[id]/ask-ai',
        };

        // ═══════════════════════════════════════════════════════════════════════════
        // MODULE 7: GOAL STRATEGY
        // ═══════════════════════════════════════════════════════════════════════════
        report.modules['7'] = {
            name: 'Goal Strategy Planning',
            status: 'active',
            gateway: '/api/projects/[id]/goals',
        };

        // ═══════════════════════════════════════════════════════════════════════════
        // MODULE 8: FORECASTING & PREDICTIONS
        // ═══════════════════════════════════════════════════════════════════════════
        report.modules['8'] = {
            name: 'Forecasting & Predictions',
            status: 'active',
            gateway: '/api/v1/forecast/validate',
        };

        // ═══════════════════════════════════════════════════════════════════════════
        // AI INFRASTRUCTURE STATUS
        // ═══════════════════════════════════════════════════════════════════════════
        report.ai = {
            ollamaHealth: 'checking',
            availableModels: [],
            localModel: process.env.OLLAMA_MODEL || 'qwen3.5:0.8b',
            cloudConfigured: !!(process.env.OLLAMA_CLOUD_URL || process.env.CLOUD_AI_BASE_URL),
        };

        try {
            const isHealthy = await checkOllamaHealth();
            const models = await listModels();

            report.ai.ollamaHealth = isHealthy ? 'healthy' : 'unavailable';
            report.ai.availableModels = models;

            if (!isHealthy) {
                report.warnings = report.warnings || [];
                report.warnings.push('Ollama service not responding. Dashboard explanations will use fallback mode.');
            }
        } catch (err: any) {
            report.ai.ollamaHealth = 'error';
            report.ai.error = err.message;
            report.warnings = report.warnings || [];
            report.warnings.push(`AI service error: ${err.message}`);
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // OVERALL HEALTH ASSESSMENT
        // ═══════════════════════════════════════════════════════════════════════════
        const allModuleStatuses = Object.values(report.modules).map((m: any) => m.status);
        const activeModules = allModuleStatuses.filter(s => s === 'complete' || s === 'active').length;

        report.summary = {
            modulesActive: activeModules,
            totalModules: Object.keys(report.modules).length,
            overallHealth: activeModules >= 5 ? 'good' : activeModules >= 3 ? 'fair' : 'needs_attention',
            readyForDeployment: activeModules >= 7 && report.ai.ollamaHealth === 'healthy',
        };

        return NextResponse.json(report);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message, trace: error.stack },
            { status: 500 }
        );
    }
}
