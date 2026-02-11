import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/sources/[id]/cleaned - Get cleaned dataset
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

        // Get cleaned dataset
        const cleanedDataset = await db.cleanedDataset.findUnique({ where: { sourceId: id } });

        if (!cleanedDataset) {
            return NextResponse.json({ error: 'No cleaned data available' }, { status: 404 });
        }

        // Return first 100 rows for preview
        const datasetData = cleanedDataset.cleanedData as any[];
        const previewData = datasetData?.slice(0, 100) || [];

        return NextResponse.json({
            dataset: {
                id: cleanedDataset.id,
                sourceId: cleanedDataset.sourceId,
                status: cleanedDataset.status,
                cleanedRowCount: cleanedDataset.cleanedRowCount,
                cleanedColCount: cleanedDataset.cleanedColCount,
                cleanedColumns: cleanedDataset.cleanedColumns,
                cleanedAt: cleanedDataset.cleanedAt,
                previewData,
            },
        });
    } catch (error) {
        console.error('Get cleaned data error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
