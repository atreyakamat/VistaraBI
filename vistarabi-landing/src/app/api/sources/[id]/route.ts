import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/sources/[id] - Get source with preview data
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

        // Return source with preview data (first 100 rows)
        const sourceData = source.data as any[];
        const previewData = sourceData?.slice(0, 100) || [];

        return NextResponse.json({
            source: {
                id: source.id,
                projectId: source.projectId,
                fileName: source.fileName,
                fileType: source.fileType,
                status: source.status,
                rowCount: source.rowCount,
                colCount: source.colCount,
                columns: source.columns,
                error: source.error,
                uploadedAt: source.uploadedAt,
                previewData,
            },
        });
    } catch (error) {
        console.error('Get source error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/sources/[id] - Delete a source and all associated data
export async function DELETE(
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
        const project = await db.project.findUnique({
            where: { id: source.projectId },
        });

        if (!project || project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        console.log('[API] Deleting source:', source.fileName);

        // Delete all associated data
        // 1. Column metadata
        await db.columnMeta.deleteMany({ where: { sourceId: id } });

        // 2. Cleaned dataset
        await db.cleanedDataset.delete({ where: { sourceId: id } }).catch(() => { });

        // 3. Cleaning log
        await db.cleaningLog.delete({ where: { sourceId: id } }).catch(() => { });

        // 4. Quality intelligence
        await db.qualityIntelligence.delete({ where: { sourceId: id } }).catch(() => { });

        // 5. Column health
        await db.columnHealth.deleteMany({ where: { sourceId: id } });

        // 6. Outlier records
        await db.outlierRecord.deleteMany({ where: { sourceId: id } });

        // 7. Transformation audits
        await db.transformationAudit.deleteMany({ where: { sourceId: id } });

        // 8. Delete all relationships for this project (will be recreated on next scan)
        await db.relationship.deleteMany({ where: { projectId: source.projectId } });

        // 9. Delete the source itself
        await db.source.delete({ where: { id } });

        console.log('[API] Source and all associated data deleted');

        return NextResponse.json({
            success: true,
            message: 'Source deleted successfully'
        });
    } catch (error) {
        console.error('Delete source error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
