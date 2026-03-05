import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getOrGenerateLineage, generateDataLineage, getDataLineage } from '@/lib/data-lineage';

// GET /api/projects/[id]/data-lineage - Get data lineage for a project
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

        // Get existing lineage
        const lineage = await getDataLineage(id);

        if (!lineage) {
            return NextResponse.json({
                projectId: id,
                status: 'NOT_GENERATED',
                message: 'Data lineage has not been generated yet. Call POST to generate.',
                entityGraph: null,
                kpiLineages: [],
            });
        }

        const entityGraph = lineage.entityGraph as Record<string, unknown>;
        return NextResponse.json({
            projectId: id,
            status: 'READY',
            entityGraph: {
                nodes: ((entityGraph?.nodes as any[]) || []).map((n: Record<string, unknown>) => ({
                    id: n.id,
                    name: n.name,
                    entityType: n.entityType,
                    columnCount: (n.columns as any[])?.length || 0,
                    primaryKey: n.primaryKeyCandidate,
                    foreignKeyCount: (n.foreignKeys as any[])?.length || 0,
                })),
                edges: ((entityGraph?.edges as any[]) || []).map((e: Record<string, unknown>) => ({
                    id: e.id,
                    from: e.fromNode,
                    to: e.toNode,
                    joinType: e.joinType,
                    joinCondition: e.joinCondition, // Pass full object or format here? Previous code formatted it.
                    condition: `${(e.joinCondition as any)?.fromColumn || '?'} = ${(e.joinCondition as any)?.toColumn || '?'}`,
                    confidence: e.confidence,
                })),
            },
            kpiLineages: ((lineage.kpiLineages as Record<string, unknown>[]) || []).map((l: Record<string, unknown>) => ({
                kpiId: l.kpiId,
                kpiName: l.kpiName,
                formula: l.formula,
                category: l.category,
                sourceCount: (l.sources as any[])?.length || 0,
                sources: ((l.sources as Record<string, unknown>[]) || []).map((s: Record<string, unknown>) => s.sourceName) || [],
                joinCount: (l.joins as any[])?.length || 0,
                aggregations: ((l.aggregations as Record<string, unknown>[]) || []).map((a: Record<string, unknown>) => `${a.function}(${a.column})`) || [],
                explanation: l.explanation,
            })),
            generatedAt: lineage.generatedAt,
        });
    } catch (error) {
        console.error('Get data lineage error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/data-lineage - Generate/regenerate data lineage
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

        // Check if project has sources and KPIs
        const sources = await db.source.findMany({ where: { projectId: id } });
        const blueprint = await db.kPIBlueprint.findUnique({ where: { projectId: id } });

        if (sources.length === 0) {
            return NextResponse.json({
                error: 'No data sources found. Upload data files first.',
            }, { status: 400 });
        }

        // Generate lineage
        console.log('[API] Generating data lineage for project:', id);
        const lineage = await generateDataLineage(id);

        const entityGraph = lineage.entityGraph as Record<string, unknown>;
        const kpiLineages = lineage.kpiLineages as Record<string, unknown>[];

        return NextResponse.json({
            success: true,
            projectId: id,
            summary: {
                entityNodes: (entityGraph?.nodes as any[])?.length || 0,
                entityEdges: (entityGraph?.edges as any[])?.length || 0,
                kpiLineagesTraced: kpiLineages?.length || 0,
            },
            message: `Generated lineage: ${(entityGraph?.nodes as any[])?.length || 0} entities, ${(entityGraph?.edges as any[])?.length || 0} relationships, ${kpiLineages?.length || 0} KPI traces`,
            generatedAt: lineage.generatedAt,
        });
    } catch (error) {
        console.error('Generate data lineage error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
