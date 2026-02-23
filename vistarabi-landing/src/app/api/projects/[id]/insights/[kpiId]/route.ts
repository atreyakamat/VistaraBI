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

        // Fetch the dashboard data for this KPI
        const baseUrl = request.url.split('/api/')[0];
        const dataRes = await fetch(`${baseUrl}/api/projects/${id}/dashboard/data`, {
            headers: { cookie: request.headers.get('cookie') || '' },
        });

        if (!dataRes.ok) {
            return NextResponse.json({
                error: 'Failed to load KPI data',
                hint: 'Ensure dashboard data is generated first',
            }, { status: 404 });
        }

        const dashData = await dataRes.json();
        const exec = (dashData.kpis || []).find((k: any) => k.kpiId === kpiId);

        if (!exec) {
            return NextResponse.json({
                error: 'KPI not found in dashboard data',
                hint: 'Call POST /api/projects/{id}/dashboard to generate the dashboard first',
            }, { status: 404 });
        }

        const insight = generateKPIInsight({
            kpiId,
            kpiName: exec.kpiName || kpiId,
            category: exec.category || 'general',
            currentValue: exec.primaryValue ?? 0,
            previousValue: exec.previousValue ?? undefined,
            delta: exec.delta ?? undefined,
            deltaPercent: exec.deltaPercent ?? undefined,
            trend: exec.deltaDirection ?? undefined,
            dataPoints: exec.dataset || [],
            lineage: exec.lineage ? {
                tables: exec.lineage.tables || [],
                joins: (exec.lineage.joins || []).map((j: any) => ({
                    from: j.from || '',
                    to: j.to || '',
                    on: j.on || undefined,
                })),
                formula: exec.lineage.formula || '',
                aggregations: exec.lineage.aggregations || [],
            } : undefined,
            aiExplanation: exec.aiExplanation?.summary || null,
        });

        return NextResponse.json({
            success: true,
            ...insight,
        });
    } catch (error) {
        console.error('KPI insight error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
