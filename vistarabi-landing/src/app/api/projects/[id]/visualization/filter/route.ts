// Module 5B — Filter & Drill-Down API Route
// POST: Apply cross-filter or drill-down and return updated chart data

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { computeDashboardData, applyCrossFilterAndRecompute } from '@/lib/visualization';
import type { FilterState, DrillDownPath, CrossFilterEvent } from '@/lib/visualization/types';

interface FilterRequestBody {
    filters?: FilterState;
    drillDown?: DrillDownPath[];
    crossFilter?: CrossFilterEvent;
}

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
        const body: FilterRequestBody = await request.json();

        // Cross-filter takes priority (returns only affected charts)
        if (body.crossFilter) {
            const result = await applyCrossFilterAndRecompute(
                id,
                body.crossFilter,
                body.filters?.granularity || 'monthly'
            );
            return NextResponse.json({
                type: 'cross_filter',
                affectedCharts: result,
                computedAt: new Date().toISOString(),
            });
        }

        // Standard filter + drill-down recomputation
        const result = await computeDashboardData(
            id,
            body.filters || { filters: [], granularity: 'monthly' },
            body.drillDown
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Visualization filter POST error:', error);
        const message = error instanceof Error ? error.message : 'Failed to apply filters';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
