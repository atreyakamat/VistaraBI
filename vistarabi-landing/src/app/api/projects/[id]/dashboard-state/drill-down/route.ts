// Module 5.5 — Drill-Down API Route
// POST /api/projects/:id/dashboard-state/drill-down
// Creates a child card by cloning source card and injecting a category filter.

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { orchestrateDrillDown } from '@/lib/dashboard-state/drill-down-orchestrator';
import type { DrillDownRequest } from '@/lib/dashboard-state/types';

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
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[DrillDown POST]', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
