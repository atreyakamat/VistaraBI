// Module 5B — Cache Invalidation API Route
// POST /api/projects/:id/dashboard/invalidate
// Clears all execution caches for a project

import { NextRequest, NextResponse } from 'next/server';
import { invalidateProject, invalidateExplanations, getCacheStats } from '@/lib/execution';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const body = await request.json().catch(() => ({}));
        const includeExplanations = body.includeExplanations ?? false;

        // Invalidate query + profiling caches
        const invalidated = invalidateProject(id);

        // Optionally invalidate AI explanations
        let explanationsInvalidated = 0;
        if (includeExplanations) {
            explanationsInvalidated = invalidateExplanations(id);
        }

        const stats = getCacheStats();

        return NextResponse.json({
            message: `Cache invalidated for project ${id}`,
            invalidatedEntries: invalidated + explanationsInvalidated,
            includeExplanations,
            cacheStats: stats,
        });
    } catch (error: any) {
        console.error('[API] Cache invalidation error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to invalidate cache', recoverable: true },
            { status: 500 }
        );
    }
}
