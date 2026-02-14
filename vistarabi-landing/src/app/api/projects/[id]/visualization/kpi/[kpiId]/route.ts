// Module 5B — Single KPI Visualization Route
// GET: Compute data for a specific KPI with optional time-series and grouping

import { NextRequest, NextResponse } from 'next/server';
import { computeSingleKPI } from '@/lib/visualization';
import type { TimeGranularity, FilterState, Filter } from '@/lib/visualization/types';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; kpiId: string }> }
) {
    try {
        const { id, kpiId } = await params;
        const searchParams = request.nextUrl.searchParams;

        const granularity = searchParams.get('granularity') as TimeGranularity | null;
        const groupBy = searchParams.get('groupBy') || undefined;
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        // Build filters
        const filters: Filter[] = [];
        if (dateFrom || dateTo) {
            const dateColumn = searchParams.get('dateColumn') || 'date';
            filters.push({
                type: 'date_range',
                column: dateColumn,
                from: dateFrom || undefined,
                to: dateTo || undefined,
            });
        }

        const filterState: FilterState | undefined = filters.length > 0
            ? { filters, granularity: granularity || 'monthly' }
            : undefined;

        const result = await computeSingleKPI(id, kpiId, {
            granularity: granularity || undefined,
            groupBy,
            filters: filterState,
        });

        if (!result) {
            return NextResponse.json(
                { error: `KPI ${kpiId} not found in lineage registry` },
                { status: 404 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Single KPI GET error:', error);
        const message = error instanceof Error ? error.message : 'Failed to compute KPI data';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
