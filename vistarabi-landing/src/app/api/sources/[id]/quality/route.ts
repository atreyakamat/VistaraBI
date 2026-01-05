import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/sources/[id]/quality - Get quality dashboard data
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
        const source = await db.source.findUnique({ where: { id } });

        if (!source) {
            return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }

        // Verify user has access
        const project = await db.project.findUnique({ where: { id: source.projectId } });
        if (!project || project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get quality intelligence
        const qualityIntelligence = await db.qualityIntelligence.findUnique({ where: { sourceId: id } });

        if (!qualityIntelligence) {
            return NextResponse.json({ error: 'No quality intelligence available' }, { status: 404 });
        }

        return NextResponse.json({
            quality: qualityIntelligence,
        });
    } catch (error) {
        console.error('Get quality error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
