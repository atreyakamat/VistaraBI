// Module 5B — Cache Invalidation API Route
// POST /api/projects/:id/dashboard/invalidate
// Clears all execution caches for a project

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { invalidateProject, invalidateExplanations, getCacheStats } from '@/lib/execution';

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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[API] Cache invalidation error:', error);
        return NextResponse.json(
            { status: 'error', message: 'Failed to invalidate cache', recoverable: true },
            { status: 500 }
        );
    }
}
