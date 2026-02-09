import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
    buildKPILineageRegistry,
    getKPILineageRegistry,
} from '@/lib/data-lineage/kpi-lineage-registry';

// GET /api/projects/[id]/kpi-lineage - Get KPI lineage registry
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get existing registry
        const registry = await getKPILineageRegistry(id);

        if (!registry) {
            return NextResponse.json({
                projectId: id,
                status: 'NOT_GENERATED',
                message: 'KPI lineage has not been generated. Call POST to generate.',
                entries: [],
                stats: { totalKPIs: 0 },
            });
        }

        // Format for API response
        return NextResponse.json({
            projectId: id,
            status: 'READY',
            version: registry.version,
            generatedAt: registry.generatedAt,
            stats: registry.stats,
            kpis: registry.entries.map(entry => ({
                id: entry.id,
                kpiId: entry.kpiId,
                kpiName: entry.kpiName,
                domain: entry.domain,
                category: entry.category,
                formula: entry.formula,
                sources: entry.sources.map(s => ({
                    name: s.sourceName.replace(/\.[^.]+$/, ''),
                    columns: s.columns,
                    role: s.role,
                })),
                joins: entry.joinPaths.map(j => ({
                    from: `${j.sourceTable}.${j.sourceColumn}`,
                    to: `${j.targetTable}.${j.targetColumn}`,
                    type: j.joinType,
                    confidence: Math.round(j.confidence * 100),
                })),
                aggregations: entry.aggregations.map(a => ({
                    function: a.function,
                    column: a.column,
                })),
                explanations: {
                    technical: entry.technicalExplanation,
                    business: entry.businessExplanation,
                    aiEnhanced: entry.aiEnhanced,
                },
                confidence: Math.round(entry.confidence * 100),
                tracedAt: entry.tracedAt,
            })),
        });
    } catch (error) {
        console.error('Get KPI lineage error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/kpi-lineage - Generate/regenerate lineage
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Parse options from request body
        let useAI = true;
        try {
            const body = await request.json();
            useAI = body.useAI !== false;
        } catch {
            // No body or invalid JSON, use defaults
        }

        // Check if project has KPI blueprint
        const blueprint = await db.kpiBlueprint.findUnique({ where: { projectId: id } });
        if (!blueprint || !blueprint.kpis || (blueprint.kpis as any[]).length === 0) {
            return NextResponse.json({
                error: 'No KPIs found in blueprint. Please finalize KPIs first.',
            }, { status: 400 });
        }

        // Generate registry
        console.log('[API] Building KPI lineage registry for project:', id);
        const registry = await buildKPILineageRegistry(id, useAI);

        return NextResponse.json({
            success: true,
            projectId: id,
            version: registry.version,
            stats: registry.stats,
            message: `Traced lineage for ${registry.stats.totalKPIs} KPIs`,
            generatedAt: registry.generatedAt,
        });
    } catch (error) {
        console.error('Generate KPI lineage error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
