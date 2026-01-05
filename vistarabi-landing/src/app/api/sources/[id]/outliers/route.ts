import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/sources/[id]/outliers - Get detected outliers
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

        // Get outlier records (sorted by severity)
        const outliers = await db.outlierRecord.findMany({ where: { sourceId: id } });

        // Group by column for easier display
        const outliersByColumn = outliers.reduce((acc, outlier) => {
            if (!acc[outlier.columnName]) {
                acc[outlier.columnName] = [];
            }
            acc[outlier.columnName].push(outlier);
            return acc;
        }, {} as Record<string, typeof outliers>);

        return NextResponse.json({
            outliers,
            outliersByColumn,
            totalOutliers: outliers.length,
        });
    } catch (error) {
        console.error('Get outliers error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
