import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateKPIInsight } from '@/lib/insights';

// GET /api/projects/[id]/insights/[kpiId] — Single KPI insight with full explanation
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; kpiId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id, kpiId } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const insight = await generateKPIInsight(id, kpiId);

        if (!insight) {
            return NextResponse.json({
                error: 'KPI not found or lineage not generated',
                hint: 'Call POST /api/projects/{id}/kpi-lineage to generate lineage first',
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            ...insight,
        });
    } catch (error) {
        console.error('KPI insight error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
