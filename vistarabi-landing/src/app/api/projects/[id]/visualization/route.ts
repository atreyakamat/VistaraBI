// Module 5B — Visualization API Route
// GET: Compute and return dashboard data with all KPI values
// Query params: ?granularity=monthly&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { computeDashboardData } from '@/lib/visualization';
import type { FilterState, Filter } from '@/lib/visualization/types';

export async function GET(
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
        const searchParams = request.nextUrl.searchParams;

        // Parse query params into filter state
        const granularity = (searchParams.get('granularity') || 'monthly') as FilterState['granularity'];
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        const filters: Filter[] = [];

        // Add date range filter if provided
        if (dateFrom || dateTo) {
            const dateColumn = searchParams.get('dateColumn') || 'date';
            filters.push({
                type: 'date_range',
                column: dateColumn,
                from: dateFrom || undefined,
                to: dateTo || undefined,
            });
        }

        // Add category filters (comma-separated: ?category=region:US,EU)
        const categoryParam = searchParams.get('category');
        if (categoryParam) {
            const [column, ...values] = categoryParam.split(':');
            if (column && values.length > 0) {
                filters.push({
                    type: 'category',
                    column,
                    values: values.join(':').split(','),
                });
            }
        }

        const filterState: FilterState = { filters, granularity };
        const result = await computeDashboardData(id, filterState);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Visualization GET error:', error);
        const message = error instanceof Error ? error.message : 'Failed to compute dashboard data';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
