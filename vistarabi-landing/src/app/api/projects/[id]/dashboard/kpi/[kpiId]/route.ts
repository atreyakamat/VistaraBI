// Module 5B — Per-KPI Execution API Route
// GET /api/projects/:id/dashboard/kpi/:kpiId
// Returns a single KPIExecutionResult with drill-down support

import { NextRequest, NextResponse } from 'next/server';
import { executeKPI, executeDrill } from '@/lib/execution';
import db from '@/lib/prisma';
import type { KPILineageEntry } from '@/lib/prisma';
import { loadProjectData } from '@/lib/visualization/data-loader';
import type { TimeGranularity } from '@/lib/visualization/types';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; kpiId: string }> }
) {
    try {
        const { id, kpiId } = await params;
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
        const registry = await db.kPILineageRegistry.findUnique({
            where: { projectId: id },
        });

        if (!registry?.entries) {
            return NextResponse.json(
                { status: 'error', message: 'No lineage registry found', recoverable: false },
                { status: 404 }
            );
        }

        const lineageEntries = registry.entries as unknown as KPILineageEntry[];
        const lineage = lineageEntries.find(e => e.kpiId === kpiId);

        if (!lineage) {
            return NextResponse.json(
                { status: 'error', message: `No lineage found for KPI: ${kpiId}`, recoverable: false },
                { status: 404 }
            );
        }

        const dataMap = await loadProjectData(id);
        const result = await executeKPI(id, kpiId, lineage, dataMap, {
            granularity: (searchParams.get('granularity') as TimeGranularity) || undefined,
            skipCache: searchParams.get('skipCache') === 'true',
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API] KPI execution error:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: error.message || 'Data temporarily unavailable',
                recoverable: true,
            },
            { status: 500 }
        );
    }
}
