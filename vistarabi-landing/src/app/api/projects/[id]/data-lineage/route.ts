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

        const entityGraph = lineage.entityGraph as any;
        return NextResponse.json({
            projectId: id,
            status: 'READY',
            entityGraph: {
                nodes: (entityGraph?.nodes || []).map((n: any) => ({
                    id: n.id,
                    name: n.name,
                    entityType: n.entityType,
                    columnCount: n.columns.length,
                    primaryKey: n.primaryKeyCandidate,
                    foreignKeyCount: n.foreignKeys.length,
                })),
                edges: (entityGraph?.edges || []).map((e: any) => ({
                    id: e.id,
                    from: e.fromNode,
                    to: e.toNode,
                    joinType: e.joinType,
                    joinCondition: e.joinCondition, // Pass full object or format here? Previous code formatted it.
                    condition: `${e.joinCondition?.fromColumn || '?'} = ${e.joinCondition?.toColumn || '?'}`,
                    confidence: e.confidence,
                })),
            },
            kpiLineages: (lineage.kpiLineages as any[] || []).map((l: any) => ({
                kpiId: l.kpiId,
                kpiName: l.kpiName,
                formula: l.formula,
                category: l.category,
                sourceCount: l.sources?.length || 0,
                sources: (l.sources as any[])?.map((s: any) => s.sourceName) || [],
                joinCount: l.joins?.length || 0,
                aggregations: (l.aggregations as any[])?.map((a: any) => `${a.function}(${a.column})`) || [],
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

        const entityGraph = lineage.entityGraph as any;
        const kpiLineages = lineage.kpiLineages as any[];

        return NextResponse.json({
            success: true,
            projectId: id,
            summary: {
                entityNodes: entityGraph?.nodes?.length || 0,
                entityEdges: entityGraph?.edges?.length || 0,
                kpiLineagesTraced: kpiLineages?.length || 0,
            },
            message: `Generated lineage: ${entityGraph?.nodes?.length || 0} entities, ${entityGraph?.edges?.length || 0} relationships, ${kpiLineages?.length || 0} KPI traces`,
            generatedAt: lineage.generatedAt,
        });
    } catch (error) {
        console.error('Generate data lineage error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
