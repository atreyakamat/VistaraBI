// Module 5B — Dashboard Data API Route
// Returns computed KPI values for the dashboard

import { NextRequest, NextResponse } from 'next/server';
import { computeDashboardData } from '@/lib/visualization';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        console.log('[API] Computing dashboard data for project:', id);

        // Compute all KPI values using Module 5B
        const dashboardData = await computeDashboardData(id);

        return NextResponse.json(dashboardData);
    } catch (error: any) {
        console.error('[API] Dashboard data error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to compute dashboard data' },
            { status: 500 }
        );
    }
}
