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

        return NextResponse.json({
            projectId: id,
            status: 'READY',
            entityGraph: {
                nodes: lineage.entityGraph.nodes.map(n => ({
                    id: n.id,
                    name: n.name,
                    entityType: n.entityType,
                    columnCount: n.columns.length,
                    primaryKey: n.primaryKeyCandidate,
                    foreignKeyCount: n.foreignKeys.length,
                })),
                edges: lineage.entityGraph.edges.map(e => ({
                    id: e.id,
                    from: e.fromNode,
                    to: e.toNode,
                    joinType: e.joinType,
                    condition: `${e.joinCondition.fromColumn} = ${e.joinCondition.toColumn}`,
                    confidence: e.confidence,
                })),
            },
            kpiLineages: lineage.kpiLineages.map(l => ({
                kpiId: l.kpiId,
                kpiName: l.kpiName,
                formula: l.formula,
                category: l.category,
                sourceCount: l.sources.length,
                sources: l.sources.map(s => s.sourceName),
                joinCount: l.joins.length,
                aggregations: l.aggregations.map(a => `${a.function}(${a.column})`),
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
        const blueprint = await db.kpiBlueprint.findUnique({ where: { projectId: id } });

        if (sources.length === 0) {
            return NextResponse.json({
                error: 'No data sources found. Upload data files first.',
            }, { status: 400 });
        }

        // Generate lineage
        console.log('[API] Generating data lineage for project:', id);
        const lineage = await generateDataLineage(id);

        return NextResponse.json({
            success: true,
            projectId: id,
            summary: {
                entityNodes: lineage.entityGraph.nodes.length,
                entityEdges: lineage.entityGraph.edges.length,
                kpiLineagesTraced: lineage.kpiLineages.length,
            },
            message: `Generated lineage: ${lineage.entityGraph.nodes.length} entities, ${lineage.entityGraph.edges.length} relationships, ${lineage.kpiLineages.length} KPI traces`,
            generatedAt: lineage.generatedAt,
        });
    } catch (error) {
        console.error('Generate data lineage error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
