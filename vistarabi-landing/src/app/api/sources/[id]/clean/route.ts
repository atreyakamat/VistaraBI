import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { purifyDataset } from '@/lib/purification';

// POST /api/sources/[id]/clean - Trigger cleaning for a source
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
        const source = await db.source.findUnique({ where: { id } });

        if (!source) {
            return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }

        // Verify user has access
        const project = await db.project.findUnique({ where: { id: source.projectId } });
        if (!project || project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check if source is ready
        if (source.status !== 'READY') {
            return NextResponse.json(
                { error: 'Source must be in READY state to clean' },
                { status: 400 }
            );
        }

        // Delete existing cleaned data if re-cleaning
        await db.cleanedDataset.delete({ where: { sourceId: id } }).catch(() => { });
        await db.cleaningLog.delete({ where: { sourceId: id } }).catch(() => { });

        // Trigger purification
        await purifyDataset(id);

        return NextResponse.json({ message: 'Cleaning started' }, { status: 202 });
    } catch (error) {
        console.error('Clean source error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
