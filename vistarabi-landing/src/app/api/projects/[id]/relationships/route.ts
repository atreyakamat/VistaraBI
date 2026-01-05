import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/projects/[id]/relationships - Get detected relationships for a project
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

        // Get relationships
        const relationships = await db.relationship.findMany({
            where: { projectId: id },
        });

        return NextResponse.json({
            projectId: id,
            relationships: relationships.map(r => ({
                id: r.id,
                sourceA: {
                    id: r.sourceAId,
                    name: r.sourceAName,
                    column: r.columnA,
                },
                sourceB: {
                    id: r.sourceBId,
                    name: r.sourceBName,
                    column: r.columnB,
                },
                confidence: r.confidence,
                matchType: r.matchType,
            })),
        });
    } catch (error) {
        console.error('Get relationships error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
