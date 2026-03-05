// Module 5B — Dashboard Data API Route (Upgraded)
// Returns structured KPIExecutionResult payloads with profiling, caching, and AI explanations

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { executeDashboard } from '@/lib/execution';
import type { ExecutionOptions } from '@/lib/execution';
import type { Filter, TimeGranularity } from '@/lib/visualization/types';

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

        // Parse execution options from query params
        const options: ExecutionOptions = {};

        // Granularity
        const granularity = searchParams.get('granularity') as TimeGranularity | null;
        if (granularity) options.granularity = granularity;

        // Date range
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        if (dateFrom) options.dateFrom = dateFrom;
        if (dateTo) options.dateTo = dateTo;

        // Category filter
        const category = searchParams.get('category');
        if (category) {
            options.filters = options.filters || [];
            options.filters.push({
                type: 'category',
                column: searchParams.get('categoryColumn') || 'category',
                values: category.split(','),
            });
        }

        // Skip cache
        if (searchParams.get('skipCache') === 'true') {
            options.skipCache = true;
        }

        // Skip AI explanations for faster response
        if (searchParams.get('skipAI') === 'true') {
            options.skipAIExplanation = true;
        }

        console.log('[API] Executing dashboard data for project:', id);

        const result = await executeDashboard(id, options);

        return NextResponse.json(result);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[API] Dashboard data execution error:', error);

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
