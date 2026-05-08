import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEntityGraph, buildEntityGraph } from '@/lib/data-lineage';

// GET /api/projects/[id]/entity-graph - Get entity relationship graph (visualization-ready)
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

        // Get or build entity graph
        let graph = await getEntityGraph(id);

        if (!graph) {
            // Build fresh if not cached
            graph = await buildEntityGraph(id);
        }

        // Format for visualization (compatible with graph libraries)
        return NextResponse.json({
            projectId: id,
            graph: {
                // Nodes formatted for visualization
                nodes: graph.nodes.map((node: any) => ({
                    id: node.id,
                    label: node.name.replace(/\.[^.]+$/, ''), // Remove file extension
                    type: node.entityType,
                    metadata: {
                        columns: node.columns,
                        primaryKey: node.primaryKeyCandidate,
                        foreignKeys: node.foreignKeys.map((fk: any) => ({
                            column: fk.column,
                            references: fk.referencedColumn,
                            confidence: fk.confidence,
                        })),
                    },
                })),
                // Edges formatted for visualization
                edges: graph.edges.map((edge: any) => ({
                    id: edge.id,
                    source: edge.fromNode,
                    target: edge.toNode,
                    label: `${edge.joinCondition.fromColumn} → ${edge.joinCondition.toColumn}`,
                    type: edge.joinType,
                    confidence: edge.confidence,
                })),
            },
            stats: {
                totalNodes: graph.nodes.length,
                totalEdges: graph.edges.length,
                entityTypes: [...new Set(graph.nodes.map((n: any) => n.entityType))],
            },
            createdAt: graph.createdAt,
        });
    } catch (error) {
        console.error('Get entity graph error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
