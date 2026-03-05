// Module 5.5 — Dashboard State API Route
// GET  /api/projects/:id/dashboard-state  → hydrate state
// POST /api/projects/:id/dashboard-state  → persist state (filters, granularity, domain)
// PATCH /api/projects/:id/dashboard-state → update single card or global filters

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
    hydrateDashboard,
    persistDashboardState,
    upsertCard,
    pinCard,
    removeCard,
} from '@/lib/dashboard-state/state-engine';
import type { NormalizedFilter, DashboardCardState } from '@/lib/dashboard-state/types';
import type { TimeGranularity } from '@/lib/visualization/types';

// ─── GET — Hydrate ────────────────────────────────────────────────────────────

export async function GET(
    _request: NextRequest,
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
        const state = await hydrateDashboard(id);

        if (!state) {
            return NextResponse.json(
                { error: 'No dashboard state found. Run Module 5A or POST to create state.' },
                { status: 404 }
            );
        }

        return NextResponse.json(state);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[DashboardState GET]', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ─── POST — Persist state (global filters / granularity / domain) ─────────────

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
        const body = await request.json() as {
            domain?: string;
            globalFilters?: NormalizedFilter[];
            granularity?: TimeGranularity;
        };

        const state = await persistDashboardState(id, {
            domain: body.domain,
            globalFilters: body.globalFilters,
            granularity: body.granularity,
        });

        return NextResponse.json(state, { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[DashboardState POST]', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ─── PATCH — Update card or filters ──────────────────────────────────────────

export async function PATCH(
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
        const body = await request.json() as {
            action: 'pin' | 'unpin' | 'upsert_card' | 'remove_card' | 'update_filters';
            cardId?: string;
            kpiId?: string;
            card?: Partial<DashboardCardState>;
            globalFilters?: NormalizedFilter[];
            granularity?: TimeGranularity;
        };

        switch (body.action) {
            case 'pin':
            case 'unpin': {
                if (!body.cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 });
                const updated = await pinCard(body.cardId, body.action === 'pin');
                return NextResponse.json(updated);
            }

            case 'update_filters': {
                const state = await persistDashboardState(id, {
                    globalFilters: body.globalFilters,
                    granularity: body.granularity,
                });
                return NextResponse.json(state);
            }

            case 'remove_card': {
                const state = await hydrateDashboard(id);
                if (!state) return NextResponse.json({ error: 'State not found' }, { status: 404 });
                if (!body.kpiId) return NextResponse.json({ error: 'kpiId required' }, { status: 400 });
                await removeCard(state.id, body.kpiId);
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 });
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[DashboardState PATCH]', err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
