// Module 5.5 — Drill-Down API Route
// POST /api/projects/:id/dashboard-state/drill-down
// Creates a child card by cloning source card and injecting a category filter.

import { NextRequest, NextResponse } from 'next/server';
import { orchestrateDrillDown } from '@/lib/dashboard-state/drill-down-orchestrator';
import type { DrillDownRequest } from '@/lib/dashboard-state/types';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json() as DrillDownRequest;

        if (!body.sourceCardId) {
            return NextResponse.json({ error: 'sourceCardId is required' }, { status: 400 });
        }
        if (!body.selectedColumn) {
            return NextResponse.json({ error: 'selectedColumn is required' }, { status: 400 });
        }
        if (body.selectedValue === undefined || body.selectedValue === null) {
            return NextResponse.json({ error: 'selectedValue is required' }, { status: 400 });
        }

        const newCard = await orchestrateDrillDown(id, body);

        return NextResponse.json(newCard, { status: 201 });
    } catch (err: any) {
        console.error('[DrillDown POST]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
