import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateKPIInsight, generateDashboardInsights } from '@/lib/insights';

// GET /api/projects/[id]/insights — Global dashboard insights panel
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
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Fetch dashboard data
        const baseUrl = request.url.split('/api/')[0];
        const dataRes = await fetch(`${baseUrl}/api/projects/${id}/dashboard/data`, {
            headers: { cookie: request.headers.get('cookie') || '' },
        });

        if (!dataRes.ok) {
            return NextResponse.json({
                error: 'Failed to load dashboard data for insight generation',
            }, { status: 502 });
        }

        const dashData = await dataRes.json();
        const execResults: Record<string, unknown>[] = dashData.kpis || [];

        // Generate insight for each KPI from execution results
        const kpiInsights = execResults.map((exec: Record<string, unknown>) => {
            return generateKPIInsight({
                kpiId: exec.kpiId as string,
                kpiName: (exec.kpiName || exec.kpiId) as string,
                category: (exec.category || 'general') as string,
                currentValue: (exec.primaryValue ?? 0) as number,
                previousValue: exec.previousValue as number | undefined,
                delta: exec.delta as number | undefined,
                deltaPercent: exec.deltaPercent as number | undefined,
                trend: exec.deltaDirection as 'up' | 'down' | 'flat' | undefined,
                dataPoints: (exec.dataset || []) as any[],
                aiExplanation: (exec.aiExplanation as any)?.summary || null,
            });
        });

        const insights = generateDashboardInsights(id, kpiInsights);

        return NextResponse.json({
            success: true,
            ...insights,
        });
    } catch (error) {
        console.error('Dashboard insights error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
