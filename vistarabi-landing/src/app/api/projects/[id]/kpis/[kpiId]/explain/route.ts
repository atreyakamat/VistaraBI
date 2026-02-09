import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { explainKPI, getKPILineage } from '@/lib/data-lineage/kpi-lineage-registry';

// GET /api/projects/[id]/kpis/[kpiId]/explain - Get KPI explanation
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

        // Get explanation
        const explanation = await explainKPI(id, kpiId);

        if (!explanation) {
            return NextResponse.json({
                error: 'KPI not found or lineage not generated',
                hint: 'Call POST /api/projects/{id}/kpi-lineage to generate lineage first',
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            projectId: id,
            kpi: {
                id: explanation.kpiId,
                name: explanation.kpiName,
                domain: explanation.domain,
                formula: explanation.formula,
            },
            howCalculated: {
                summary: explanation.businessExplanation,
                technical: explanation.technicalExplanation,
            },
            dataSources: explanation.sources,
            dataJoins: explanation.joins,
            aggregations: explanation.aggregations,
        });
    } catch (error) {
        console.error('Explain KPI error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
