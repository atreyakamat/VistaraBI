import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/sources/[id]/audit-log - Get transformation audit log
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

        // Get transformation audit log (sorted by timestamp desc)
        const auditLog = await db.transformationAudit.findMany({ where: { sourceId: id } });

        return NextResponse.json({
            auditLog,
            totalTransformations: auditLog.length,
        });
    } catch (error) {
        console.error('Get audit log error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
