import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/sources/[id]/intelligence - Get column metadata for a source
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

        // Verify user has access to this source's project
        const project = await db.project.findUnique({
            where: { id: source.projectId },
        });

        if (!project || project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get column metadata
        const columns = await db.columnMeta.findMany({
            where: { sourceId: id },
        });

        return NextResponse.json({
            sourceId: id,
            fileName: source.fileName,
            qualityScore: source.qualityScore,
            columns: columns.map(c => ({
                id: c.id,
                originalName: c.originalName,
                normalizedName: c.normalizedName,
                dataType: c.dataType,
                nullPercent: c.nullPercent,
                uniquePercent: c.uniquePercent,
                sampleValues: c.sampleValues,
            })),
        });
    } catch (error) {
        console.error('Get intelligence error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
