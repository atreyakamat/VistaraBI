// Module 5C — Dashboard Insights API
// GET /api/projects/:id/dashboard/insights
// Returns KPIInsight[], InsightFeedItem[], SmartAlert[] for the entire dashboard

import { NextResponse } from 'next/server';
import { generateKPIInsight, generateDashboardInsights } from '@/lib/insights';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;

        // Fetch execution results from internal dashboard/data endpoint
        const baseUrl = request.url.split('/api/')[0];
        const dataRes = await fetch(`${baseUrl}/api/projects/${projectId}/dashboard/data`, {
            headers: { cookie: request.headers.get('cookie') || '' },
        });

        if (!dataRes.ok) {
            return NextResponse.json(
                { error: 'Failed to load dashboard data for insight generation' },
                { status: 502 }
            );
        }

        const dashData = await dataRes.json();
        const execResults: any[] = dashData.kpis || [];

        // Generate insight for each KPI from execution results
        const kpiInsights = execResults.map((exec: any) => {
            return generateKPIInsight({
                kpiId: exec.kpiId,
                kpiName: exec.kpiName || exec.kpiId,
                category: exec.category || 'general',
                currentValue: exec.primaryValue ?? 0,
                previousValue: exec.previousValue ?? undefined,
                delta: exec.delta ?? undefined,
                deltaPercent: exec.deltaPercent ?? undefined,
                trend: exec.deltaDirection ?? undefined,
                dataPoints: exec.dataset || [],
                profiling: exec.profiling ? {
                    volatilityIndex: exec.profiling.volatilityIndex,
                    distributionSkew: exec.profiling.distributionSkew,
                    recordCount: exec.profiling.recordCount,
                } : undefined,
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
        });

        // Aggregate into dashboard-wide insights
        const response = generateDashboardInsights(projectId, kpiInsights);

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('[Insights API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate insights' },
            { status: 500 }
        );
    }
}
