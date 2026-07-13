// Module 5C — Dashboard Insights API
// GET /api/projects/:id/dashboard/insights
// Returns KPIInsight[], InsightFeedItem[], SmartAlert[] for the entire dashboard

import { NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateKPIInsight, generateDashboardInsights } from '@/lib/insights';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const _authProject = await db.project.findUnique({ where: { id: projectId } });
        if (!_authProject || _authProject.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

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
                profiling: exec.profiling ? {
                    volatilityIndex: (exec.profiling as any).volatilityIndex,
                    distributionSkew: (exec.profiling as any).distributionSkew,
                    recordCount: (exec.profiling as any).recordCount,
                } : undefined,
                lineage: exec.lineage ? {
                    tables: (exec.lineage as any).tables || [],
                    joins: ((exec.lineage as any).joins || []).map((j: Record<string, unknown>) => ({
                        from: j.from || '',
                        to: j.to || '',
                        on: j.on || undefined,
                    })),
                    formula: (exec.lineage as any).formula || '',
                    aggregations: (exec.lineage as any).aggregations || [],
                } : undefined,
                aiExplanation: (exec.aiExplanation as any)?.summary || null,
            });
        });

        // Fetch domain to check if we should suppress anomalies
        const domainGov = await db.domainGovernance.findUnique({ where: { projectId } });
        const isFinance = (domainGov?.activeDomain as string | null | undefined) === 'finance';


        if (isFinance) {
            kpiInsights.forEach(kpi => {
                kpi.anomaly = {
                    severity: 'normal',
                    score: 0,
                    flags: [],
                    reason: 'Anomalies suppressed for finance domain',
                    direction: 'none',
                    detectedAt: new Date().toISOString()
                };
            });
        }

        // Aggregate into dashboard-wide insights
        const response = generateDashboardInsights(projectId, kpiInsights);

        // Asynchronous background alert dispatch
        if (response.alerts && response.alerts.length > 0) {
            const { dispatchAlerts } = await import('@/lib/alerts/dispatcher');
            for (const alert of response.alerts) {
                dispatchAlerts(projectId, alert.kpiName, {
                    reason: alert.reason,
                    deltaPercent: alert.deltaPercent,
                    severity: alert.severity,
                }).catch(err => console.error('[Insights Route] Alert dispatch failed:', err));
            }
        }

        return NextResponse.json(response);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Insights API] Error:', error);
        return NextResponse.json(
            { error: message || 'Failed to generate insights' },
            { status: 500 }
        );
    }
}
