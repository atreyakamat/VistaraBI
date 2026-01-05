import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/sources/[id]/cleaning-summary - Get purification summary
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

        // Get cleaning log
        const cleaningLog = await db.cleaningLog.findUnique({ where: { sourceId: id } });

        if (!cleaningLog) {
            return NextResponse.json({ error: 'No cleaning summary available' }, { status: 404 });
        }

        // Get cleaned dataset status
        const cleanedDataset = await db.cleanedDataset.findUnique({ where: { sourceId: id } });

        return NextResponse.json({
            summary: {
                sourceId: id,
                fileName: source.fileName,
                status: cleanedDataset?.status || 'UNKNOWN',
                cleanedAt: cleanedDataset?.cleanedAt,
                stats: {
                    nullsFilled: cleaningLog.nullsFilled,
                    duplicatesRemoved: cleaningLog.duplicatesRemoved,
                    datesNormalized: cleaningLog.datesNormalized,
                    currenciesNormalized: cleaningLog.currenciesNormalized,
                    textsStandardized: cleaningLog.textsStandardized,
                    emptyColumnsRemoved: cleaningLog.emptyColumnsRemoved,
                    originalRowCount: cleaningLog.originalRowCount,
                    cleanedRowCount: cleaningLog.cleanedRowCount,
                },
            },
        });
    } catch (error) {
        console.error('Get cleaning summary error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
