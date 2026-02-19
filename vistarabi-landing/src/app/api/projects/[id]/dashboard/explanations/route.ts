// Module 5A — Dashboard Explanations API
// Returns cached AI explanations for KPI cards (instant, no live AI calls)

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardConfig } from '@/lib/dashboard';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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
