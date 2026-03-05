// Module 5A — Dashboard Explanations API
// Returns cached AI explanations for KPI cards (instant, no live AI calls)

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getDashboardConfig } from '@/lib/dashboard';

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

        const config = await getDashboardConfig(id);

        if (!config) {
            return NextResponse.json(
                { error: 'Dashboard not yet generated' },
                { status: 404 }
            );
        }

        const explanations = config.metadata.kpiExplanations || {};

        return NextResponse.json({
            projectId: id,
            explanations,
            count: Object.keys(explanations).length,
        });
    } catch (error) {
        console.error('[API] Explanations error:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve explanations' },
            { status: 500 }
        );
    }
}
