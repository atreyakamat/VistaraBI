// Module 5B — Per-KPI Execution API Route
// GET /api/projects/:id/dashboard/kpi/:kpiId
// Returns a single KPIExecutionResult with drill-down support

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { executeKPI, executeDrill } from '@/lib/execution';
import type { TimeGranularity } from '@/lib/visualization/types';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; kpiId: string }> }
) {
    try {
        const { id, kpiId } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const _authProject = await db.project.findUnique({ where: { id: id } });
        if (!_authProject || _authProject.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        const searchParams = request.nextUrl.searchParams;

        // Check for drill-down
        const groupBy = searchParams.get('groupBy');
        if (groupBy) {
            const result = await executeDrill(id, kpiId, groupBy, {
                granularity: (searchParams.get('granularity') as TimeGranularity) || undefined,
            });
            return NextResponse.json(result);
        }

        // Standard single-KPI execution
        const result = await executeKPI(id, kpiId, {
            granularity: (searchParams.get('granularity') as TimeGranularity) || undefined,
            skipCache: searchParams.get('skipCache') === 'true',
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[API] KPI execution error:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: message || 'Data temporarily unavailable',
                recoverable: true,
            },
            { status: 500 }
        );
    }
}
