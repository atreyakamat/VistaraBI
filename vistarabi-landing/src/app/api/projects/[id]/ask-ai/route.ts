// Module 6 — Unified Ask AI API Route
// POST /api/projects/[id]/ask-ai
//
// Single intelligence gateway routing to:
//   Module 6A: handleAskAI (dashboard commands)
//   Module 6B: handleEventQuery (KPI event narration)
//   Module 6C: handleCorrelationQuery (KPI correlation)
//   Module 6E: handleSynthesisQuery (multi-evidence synthesis)
//
// All routing is deterministic and server-side.
// No model metadata is forwarded to the frontend.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { sanitizeUserQuery } from '@/lib/module-6d/prompt-builder';

// ─── Intent Classification ────────────────────────────────────────────────────

type QueryRoute = '6A' | '6B' | '6C' | '6E' | 'UNSUPPORTED';

const COMMAND_PATTERNS = [
    /\b(show|add|create|remove|delete|update)\b.*\b(card|chart|kpi|metric)\b/i,
    /\b(display|plot|graph)\b.*\b(by|over|per)\b/i,
];

const CORRELATION_PATTERNS = [
    /\b(correlat|relat|compar|vs\.?|versus|against|between)\b/i,
    /\b(connection|link|association)\b.*\band\b/i,
];

const EVENT_PATTERNS = [
    /\b(why|explain|what happened|trend|spike|drop|anomaly|change)\b/i,
    /\b(went up|went down|increased|decreased|surge|fell)\b/i,
];

const SYNTHESIS_PATTERNS = [
    /\b(overview|summary|synthesis|overall|pattern|signal|insight)\b/i,
    /\b(risk|volatile|exposure)\b/i,
];

function classifyRoute(message: string): QueryRoute {
    if (COMMAND_PATTERNS.some(p => p.test(message))) return '6A';
    if (CORRELATION_PATTERNS.some(p => p.test(message))) return '6C';
    if (EVENT_PATTERNS.some(p => p.test(message))) return '6B';
    if (SYNTHESIS_PATTERNS.some(p => p.test(message))) return '6E';
    return 'UNSUPPORTED';
}

// ─── KPI ID Extraction for 6C ────────────────────────────────────────────────

/**
 * Attempt to extract two KPI IDs from the user message by matching
 * known KPI names in the project.
 * Falls back to first two KPIs found if no name match.
 */
async function extractKpiPair(message: string, projectId: string): Promise<{ kpiAId: string; kpiBId: string } | null> {
    try {
        const state = await (db as any).dashboardState.findFirst({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            select: { cards: true },
        });

        if (!state?.cards) return null;
        const cards = (state.cards as any[]) || [];
        const kpiIds = cards.map((c: any) => c.kpiId).filter(Boolean);
        if (kpiIds.length < 2) return null;

        const msgLower = message.toLowerCase();
        const matched: string[] = [];

        for (const card of cards) {
            if (!card.kpiId || !card.kpiName) continue;
            if (msgLower.includes(card.kpiName.toLowerCase().replace(/_/g, ' '))) {
                matched.push(card.kpiId);
            }
            if (matched.length >= 2) break;
        }

        if (matched.length >= 2) {
            return { kpiAId: matched[0], kpiBId: matched[1] };
        }

        // Fall back to first two KPIs
        return { kpiAId: kpiIds[0], kpiBId: kpiIds[1] };
    } catch {
        return null;
    }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Auth
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id: projectId } = await params;

        const project = await db.project.findUnique({ where: { id: projectId } });
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        if (project.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        // Parse body
        const body = await request.json() as { sessionId?: string; message?: string };

        if (!body.message || typeof body.message !== 'string') {
            return NextResponse.json({ error: 'message is required' }, { status: 400 });
        }
        const raw = body.message.trim();
        if (raw.length > 500) {
            return NextResponse.json({ status: 'rejected', message: 'Message exceeds 500 character limit.', route: 'VALIDATION' });
        }

        const sanitized = sanitizeUserQuery(raw);
        const route = classifyRoute(sanitized);

        if (route === 'UNSUPPORTED') {
            return NextResponse.json({
                status: 'rejected',
                route: 'UNSUPPORTED',
                message: "I can help with KPI events, correlations, dashboard commands, and overviews. Try asking about a specific metric.",
            });
        }

        let result: Record<string, unknown>;
        const sessionId = body.sessionId || projectId;

        try {
            switch (route) {
                case '6A': {
                    const { handleAskAI } = await import('@/lib/module-6');
                    result = (await handleAskAI(projectId, sessionId, sanitized, user.userId)) as any;
                    break;
                }
                case '6B': {
                    const { handleEventQuery } = await import('@/lib/module-6b');
                    result = (await handleEventQuery(projectId, sanitized)) as any;
                    break;
                }
                case '6C': {
                    const { handleCorrelationQuery } = await import('@/lib/module-6c');
                    const pair = await extractKpiPair(sanitized, projectId);
                    if (!pair) {
                        result = { status: 'rejected', message: 'Could not identify two KPIs to correlate. Please name the KPIs in your message.' };
                    } else {
                        result = (await handleCorrelationQuery(projectId, pair.kpiAId, pair.kpiBId, 'monthly', [0], sanitized)) as any;
                    }
                    break;
                }
                case '6E': {
                    const { handleSynthesisQuery } = await import('@/lib/module-6e');
                    const { getLatestEvidencePackets } = await import('@/lib/module-6e/packet-loader');
                    const { events, correlations } = await getLatestEvidencePackets(projectId);
                    result = (await handleSynthesisQuery(projectId, events, correlations, sanitized)) as any;
                    break;
                }
                default:
                    result = { status: 'rejected', message: 'Unrecognized route.' };
            }
        } catch (routeErr: any) {
            console.error(`[ask-ai] Route ${route} handler failed:`, routeErr.message);
            return NextResponse.json({ status: 'error', route, message: 'An error occurred. Please try again.' });
        }

        // Strip internal metadata before sending to frontend
        const {
            modelMetadata: _meta,
            structuredCommand: _cmd,
            evidence: _ev,
            ...safeResult
        } = result as any;

        return NextResponse.json({ route, ...safeResult });

    } catch (err: any) {
        console.error('[ask-ai] Unhandled error:', err.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
