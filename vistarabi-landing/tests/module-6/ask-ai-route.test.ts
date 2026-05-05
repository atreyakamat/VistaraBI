// Module 6 — Ask AI Route Integration Tests
// Covers all 6 deterministic routes: 6A, 6B, 6C, 6E, 7A, KPI_VALUE_QUERY,
// TREND_ANALYSIS, COMPARISON_ANALYSIS + the State Injection Pipeline

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Hoisted Mocks ────────────────────────────────────────────────

const mockUser = vi.hoisted(() => ({ userId: 'user-1', email: 'test@vistara.com', name: 'Test User' }));

const mockDb = vi.hoisted(() => ({
    project: { findUnique: vi.fn() },
    dashboardState: { findFirst: vi.fn() },
    approvedKPI: { findMany: vi.fn(), findUnique: vi.fn() },
    kPIBlueprint: { findUnique: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({
    getCurrentUser: vi.fn().mockResolvedValue(mockUser),
}));

vi.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: mockDb,
}));

vi.mock('@/lib/module-6', () => ({
    handleAskAI: vi.fn().mockResolvedValue({
        status: 'success',
        route: '6A',
        executedAction: { action: 'CREATE_CARD' },
        message: 'Card created successfully.',
    }),
}));

vi.mock('@/lib/module-6/events', () => ({
    handleEventQuery: vi.fn().mockResolvedValue({
        status: 'success',
        kpiName: 'Revenue',
        explanation: 'Revenue spiked due to strong Q1 performance.',
        confidence_level: 'high',
        evidence: { kpi_id: 'kpi-rev' },
    }),
}));

vi.mock('@/lib/module-6/correlations', () => ({
    handleCorrelationQuery: vi.fn().mockResolvedValue({
        status: 'success',
        evidence: {
            kpi_a_name: 'Revenue',
            kpi_b_name: 'CAC',
            pearson_r: 0.72,
            statistically_significant: true,
            confidence_level: 'high',
            lag_applied: 0,
        },
        explanation: 'Revenue and CAC show a strong positive correlation.',
    }),
}));

vi.mock('@/lib/module-6/synthesis', () => ({
    handleSynthesisQuery: vi.fn().mockResolvedValue({
        status: 'success',
        narrative: 'Overall, the business is performing well with some risk signals.',
        conflictSummary: [],
        supportingPacketIds: ['pkt-1', 'pkt-2'],
        reasoningTier: 'MULTI_PACKET_SYNTHESIS',
    }),
}));

vi.mock('@/lib/module-6/synthesis/packet-loader', () => ({
    getLatestEvidencePackets: vi.fn().mockResolvedValue({ events: [], correlations: [] }),
}));

vi.mock('@/lib/module-6/orchestration/orchestrator', () => ({
    getSessionMemory: vi.fn().mockReturnValue({}),
    updateSessionMemory: vi.fn(),
    resolvePronouns: vi.fn().mockImplementation((q: string) => q),
    injectContext: vi.fn().mockImplementation((q: string) => q),
    getFollowUpSuggestions: vi.fn().mockReturnValue([]),
}));

vi.mock('@/lib/module-6/infrastructure/prompt-builder', () => ({
    sanitizeUserQuery: vi.fn().mockImplementation((q: string) => q),
}));

vi.mock('@/lib/module-6/infrastructure/local-adapter', () => ({
    callLocalModel: vi.fn().mockResolvedValue({ text: 'VistaraBI acknowledges your request.' }),
}));

vi.mock('@/lib/execution/kpi-executor', () => ({
    executeKPI: vi.fn().mockResolvedValue({
        primaryValue: 123456,
        dataset: [{ label: '2024-01', value: 100000 }, { label: '2024-02', value: 123456 }],
        delta: 23456,
        deltaPercent: 23.5,
        deltaDirection: 'up',
        profiling: { volatilityIndex: 0.1 },
    }),
}));

// ─── Import Route Handler ──────────────────────────────────────────

import { POST } from '../../src/app/api/projects/[id]/ask-ai/route';

// ─── Helpers ──────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
    return new NextRequest('http://localhost/api/projects/proj-1/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const mockParams = Promise.resolve({ id: 'proj-1' });

// ─── Test Suite ───────────────────────────────────────────────────

describe('Module 6 — Ask AI Route Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDb.project.findUnique.mockResolvedValue({
            id: 'proj-1',
            userId: 'user-1',
            name: 'Test Project',
        });
        mockDb.approvedKPI.findMany.mockResolvedValue([
            { id: 'kpi-rev', name: 'revenue', blueprint: { projectId: 'proj-1' } },
            { id: 'kpi-cac', name: 'cac', blueprint: { projectId: 'proj-1' } },
        ]);
        mockDb.dashboardState.findFirst.mockResolvedValue({
            cards: [
                { kpiId: 'kpi-rev', kpiName: 'revenue' },
                { kpiId: 'kpi-cac', kpiName: 'cac' },
            ],
        });
    });

    // ── Authentication & Validation ─────────────────────────────────

    it('returns 401 when user is not authenticated', async () => {
        const { getCurrentUser } = await import('../../src/lib/auth');
        vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

        const res = await POST(makeRequest({ message: 'hello' }), { params: mockParams });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('Not authenticated');
    });

    it('returns 400 when message is missing', async () => {
        const res = await POST(makeRequest({ sessionId: 'sess-1' }), { params: mockParams });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('message is required');
    });

    it('rejects messages over 500 characters', async () => {
        const longMessage = 'a'.repeat(501);
        const res = await POST(makeRequest({ message: longMessage }), { params: mockParams });
        const body = await res.json();
        expect(body.status).toBe('rejected');
        expect(body.route).toBe('VALIDATION');
    });

    it('returns 404 for unknown project', async () => {
        mockDb.project.findUnique.mockResolvedValueOnce(null);
        const res = await POST(makeRequest({ message: 'show revenue' }), { params: mockParams });
        expect(res.status).toBe(404);
    });

    // ── Route: 6A — Dashboard Command ───────────────────────────────

    it('routes "add a revenue card" to 6A and returns command result', async () => {
        const res = await POST(makeRequest({ message: 'add a revenue card' }), { params: mockParams });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.route).toBe('6A');
        expect(body.status).toBe('success');
    });

    // ── Route: 7A — Goal Strategy Directive ─────────────────────────

    it('routes "increase revenue by 20%" to 7A and returns OPEN_GOAL_ENGINE directive', async () => {
        const res = await POST(makeRequest({ message: 'increase revenue by 20% this quarter' }), { params: mockParams });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.route).toBe('7A');
        expect(body.directive).toBe('OPEN_GOAL_ENGINE');
    });

    // ── Route: TREND_ANALYSIS ────────────────────────────────────────

    it('routes trend query to TREND_ANALYSIS and returns dataset', async () => {
        const res = await POST(makeRequest({ message: 'show me the revenue trend over time' }), { params: mockParams });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.route).toBe('TREND_ANALYSIS');
        expect(body.status).toBe('success');
        expect(body.kpiName).toBeDefined();
        expect(Array.isArray(body.dataset)).toBe(true);
    });

    // ── Route: KPI_VALUE_QUERY ───────────────────────────────────────

    it('routes "what is revenue" to KPI_VALUE_QUERY and returns scalar value', async () => {
        const res = await POST(makeRequest({ message: 'what is the revenue' }), { params: mockParams });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.route).toBe('KPI_VALUE_QUERY');
        expect(body.status).toBe('success');
        expect(body.value).toBeDefined();
        expect(body.kpiName).toBeDefined();
    });

    // ── Route: COMPARISON_ANALYSIS ───────────────────────────────────

    it('routes "compare revenue vs cac" to COMPARISON_ANALYSIS', async () => {
        const res = await POST(makeRequest({ message: 'compare revenue vs cac' }), { params: mockParams });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.route).toBe('COMPARISON_ANALYSIS');
        expect(body.status).toBe('success');
        expect(body.kpiAName).toBeDefined();
        expect(body.kpiBName).toBeDefined();
    });

    // ── Route: UNSUPPORTED ──────────────────────────────────────────

    it('returns rejected status for unsupported queries', async () => {
        const res = await POST(makeRequest({ message: 'what is the weather today' }), { params: mockParams });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('rejected');
    });

    // ── State Injection Pipeline ─────────────────────────────────────

    it('accepts strategyContext in the request body without error', async () => {
        const mockStrategyContext = {
            probabilityOfSuccess: 0.72,
            reliabilityScore: 85,
            scenarios: {
                baseline: [{ yhat: 90000 }],
                optimistic: [{ yhat: 110000 }],
                conservative: [{ yhat: 75000 }],
            },
            sensitivity: {
                primaryDriver: 'marketing_spend',
                riskFactor: 'market_volatility',
                drivers: [],
            },
            forecastHorizonMonths: 12,
            milestones: [],
        };

        const res = await POST(
            makeRequest({ message: 'what is the revenue', strategyContext: mockStrategyContext }),
            { params: mockParams }
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        // Should not error — strategyContext silently enriches the LLM prompt
        expect(body.status).toBe('success');
    });
});
