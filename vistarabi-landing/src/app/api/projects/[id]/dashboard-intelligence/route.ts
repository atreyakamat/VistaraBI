// Module 5.5 — Dashboard Intelligence API Route
// POST /api/projects/:id/dashboard-intelligence
// The main execution route for the full Module 5.5 enrichment pipeline.

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { runDashboardIntelligence, previewDashboardIntelligence } from '@/lib/dashboard-state/module-5-5';
import type { DashboardIntelligenceOptions } from '@/lib/dashboard-state/types';
import type { TimeGranularity } from '@/lib/visualization/types';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const _authProject = await db.project.findUnique({ where: { id: id } });
        if (!_authProject || _authProject.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        const body = await request.json() as {
            businessFilters?: string[];
            normalizedFilters?: DashboardIntelligenceOptions['normalizedFilters'];
            granularity?: TimeGranularity;
            skipCache?: boolean;
            skipAnomalyDetection?: boolean;
            skipSummaryGeneration?: boolean;
            fiscalYearConvention?: 'april_march' | 'january_december';
            cardIds?: string[];
            preview?: boolean; // Dry-run: just normalize filters + show state
        } & Record<string, unknown>;

        const options: DashboardIntelligenceOptions = {
            businessFilters: body.businessFilters,
            normalizedFilters: body.normalizedFilters,
            granularity: body.granularity,
            skipCache: body.skipCache,
            skipAnomalyDetection: body.skipAnomalyDetection,
            skipSummaryGeneration: body.skipSummaryGeneration,
            fiscalYearConvention: body.fiscalYearConvention || 'april_march',
            cardIds: body.cardIds,
        };

        if (body.preview) {
            const { state, normalizedFilters } = await previewDashboardIntelligence(id, options);
            return NextResponse.json({
                preview: true,
                state,
                normalizedFilters,
            });
        }

        const result = await runDashboardIntelligence(id, options);
        return NextResponse.json(result);

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[DashboardIntelligence POST]', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
