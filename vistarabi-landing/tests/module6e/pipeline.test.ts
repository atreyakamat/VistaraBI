import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/lib/module-6d/local-adapter', () => ({
    callLocalModel: vi.fn(),
}));

vi.mock('../../src/lib/module-6d/cloud-adapter', () => ({
    callCloudModel: vi.fn(),
}));

vi.mock('../../src/lib/module-6e/synthesis-audit-logger', () => ({
    writeSynthesisAuditRecord: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/module-6/audit-log', () => ({
    writeAuditRecord: vi.fn().mockResolvedValue(undefined),
    readAuditRecord: vi.fn().mockResolvedValue(null),
}));

const { handleSynthesisQuery } = await import('../../src/lib/module-6e/index');
const { callLocalModel } = await import('../../src/lib/module-6d/local-adapter');
const { callCloudModel } = await import('../../src/lib/module-6d/cloud-adapter');
const { writeSynthesisAuditRecord } = await import('../../src/lib/module-6e/synthesis-audit-logger');

import type { EventEvidencePacket, CorrelationEvidencePacket } from '../../src/lib/module-6e/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeEvent = (overrides: Partial<EventEvidencePacket> = {}): EventEvidencePacket => Object.freeze({
    event_id: 'ev-001', kpi_id: 'kpi-rev', kpi_name: 'Revenue', unit: 'currency',
    granularity: 'monthly', period_start: '2024-01', period_end: '2024-12',
    delta_percent: 12.5, delta_direction: 'up' as const, volatility_index: 0.2,
    anomaly_detected: false, dataset_length: 12,
    confidence_level: 'high' as const, event_type: 'TREND_CHANGE' as const,
    traceable_fields: ['delta_percent', 'volatility_index'],
    ...overrides,
} as EventEvidencePacket);

const makeCorr = (overrides: Partial<CorrelationEvidencePacket> = {}): CorrelationEvidencePacket => Object.freeze({
    insight_id: 'ins-001', kpi_a_id: 'kpi-rev', kpi_b_id: 'kpi-ord',
    kpi_a_name: 'Revenue', kpi_b_name: 'Orders', unit_a: 'currency', unit_b: 'count',
    grain: 'monthly', time_window_start: '2024-01', time_window_end: '2024-12',
    n_observations: 18, pearson_r: 0.78, p_value: 0.001,
    statistically_significant: true, lag_applied: 0, lags_tested: [0],
    bonferroni_alpha: 0.05, null_ratio_a: 0.0, null_ratio_b: 0.0,
    first_differencing_applied: false, trend_confounder_detected: false,
    confidence_level: 'high' as const, correlation_reportable: true,
    traceable_fields: ['pearson_r', 'p_value', 'n_observations'],
    ...overrides,
} as CorrelationEvidencePacket);

function makeModelError(code: string, message: string) {
    const err = new Error(message) as any;
    err.name = 'ModelCallError';
    err.code = code;
    return err;
}

const VALID_TEXT = 'Revenue changed by 12.5% and shows a Pearson correlation of 0.78 with Orders across 18 observations (p = 0.001).';
const HALLUCINATED = 'Revenue surged 35% and correlates at 0.99 with demand.';
const CAUSAL_TEXT = 'Revenue growth caused increased orders due to higher demand.';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pipeline — handleSynthesisQuery() LOCAL', () => {
    beforeEach(() => {
        vi.mocked(callLocalModel).mockClear();
        vi.mocked(callCloudModel).mockClear();
        vi.mocked(writeSynthesisAuditRecord).mockClear();
        delete process.env.ENABLE_CLOUD_ROUTING;
    });

    it('multi-packet + valid narration → success', async () => {
        vi.mocked(callLocalModel).mockResolvedValueOnce({
            text: VALID_TEXT, modelId: 'qwen3:8b', latencyMs: 240,
        });
        const r = await handleSynthesisQuery('proj-001', [makeEvent()], [makeCorr()], 'What patterns?');
        expect(r.status).toBe('success');
        expect(r.narrative).toContain('12.5');
        expect(r.supportingPacketIds).toContain('ev-001');
        expect(r.supportingPacketIds).toContain('ins-001');
    });

    it('hallucinated output → suppressed', async () => {
        vi.mocked(callLocalModel).mockResolvedValueOnce({ text: HALLUCINATED, modelId: 'qwen3:8b', latencyMs: 200 });
        const r = await handleSynthesisQuery('proj-001', [makeEvent()], [makeCorr()], 'Why?');
        expect(r.status).toBe('suppressed');
        expect(r.message).toContain('synthesized insight');
    });

    it('causal language → causation_violation', async () => {
        vi.mocked(callLocalModel).mockResolvedValueOnce({ text: CAUSAL_TEXT, modelId: 'qwen3:8b', latencyMs: 200 });
        const r = await handleSynthesisQuery('proj-001', [makeEvent()], [makeCorr()], 'Why?');
        expect(r.status).toBe('causation_violation');
        expect(r.message).toContain('causal language');
    });

    it('all insufficient packets → rejected', async () => {
        const r = await handleSynthesisQuery(
            'proj-001',
            [makeEvent({ confidence_level: 'insufficient' })],
            [],
            'Why?'
        );
        expect(r.status).toBe('rejected');
        expect(callLocalModel).not.toHaveBeenCalled();
    });

    it('speculation → rejected before model call', async () => {
        const r = await handleSynthesisQuery('proj-001', [makeEvent()], [], 'predict revenue next quarter');
        expect(r.status).toBe('rejected');
        expect(callLocalModel).not.toHaveBeenCalled();
    });

    it('conflictSummary included in result', async () => {
        vi.mocked(callLocalModel).mockResolvedValueOnce({ text: VALID_TEXT, modelId: 'qwen3:8b', latencyMs: 200 });
        const events = [makeEvent({ delta_direction: 'up' })];
        const corrs = [makeCorr({ pearson_r: -0.45, traceable_fields: ['pearson_r', 'n_observations'] })];
        const r = await handleSynthesisQuery('proj-001', events, corrs, 'What patterns?');
        // Should detect directional inconsistency
        expect(r.conflictSummary.length).toBeGreaterThan(0);
    });

    it('audit written on success', async () => {
        vi.mocked(callLocalModel).mockResolvedValueOnce({ text: VALID_TEXT, modelId: 'qwen3:8b', latencyMs: 200 });
        await handleSynthesisQuery('proj-001', [makeEvent()], [makeCorr()], 'Why?');
        expect(writeSynthesisAuditRecord).toHaveBeenCalledTimes(1);
    });

    it('audit written on adapter failure (unconditional)', async () => {
        vi.mocked(callLocalModel).mockRejectedValueOnce(makeModelError('LOCAL_TIMEOUT', 'Timed out'));
        await handleSynthesisQuery('proj-001', [makeEvent()], [], 'Why?');
        expect(writeSynthesisAuditRecord).toHaveBeenCalledTimes(1);
    });

    it('timeout → timeout status', async () => {
        vi.mocked(callLocalModel).mockRejectedValueOnce(makeModelError('LOCAL_TIMEOUT', 'Timed out'));
        const r = await handleSynthesisQuery('proj-001', [makeEvent()], [], 'Why?');
        expect(r.status).toBe('timeout');
    });
});

describe('pipeline — handleSynthesisQuery() CLOUD', () => {
    beforeEach(() => {
        vi.mocked(callLocalModel).mockClear();
        vi.mocked(callCloudModel).mockClear();
        vi.mocked(writeSynthesisAuditRecord).mockClear();
        delete process.env.ENABLE_CLOUD_ROUTING;
    });
    afterEach(() => { delete process.env.ENABLE_CLOUD_ROUTING; });

    it('strategic overview + cloud enabled → uses cloud', async () => {
        process.env.ENABLE_CLOUD_ROUTING = 'true';
        vi.mocked(callCloudModel).mockResolvedValueOnce({
            text: VALID_TEXT, modelId: 'qwen-max', latencyMs: 800,
        });
        const r = await handleSynthesisQuery(
            'proj-001', [makeEvent(), makeEvent({ event_id: 'ev-002' })], [makeCorr()], 'What patterns?'
        );
        expect(callCloudModel).toHaveBeenCalled();
        expect(callLocalModel).not.toHaveBeenCalled();
        expect(r.modelMetadata?.routing).toBe('cloud');
    });

    it('cloud disabled → rejected (no silent fallback)', async () => {
        const r = await handleSynthesisQuery(
            'proj-001', [makeEvent(), makeEvent({ event_id: 'ev-002' })], [makeCorr()], 'Summary?'
        );
        expect(r.status).toBe('rejected');
        expect(r.message).toContain('Cloud reasoning is not enabled');
        expect(callCloudModel).not.toHaveBeenCalled();
        expect(callLocalModel).not.toHaveBeenCalled();
    });

    it('risk keyword + cloud enabled → RISK_SIGNAL_SYNTHESIS via cloud', async () => {
        process.env.ENABLE_CLOUD_ROUTING = 'true';
        vi.mocked(callCloudModel).mockResolvedValueOnce({
            text: 'Revenue shows a 12.5% change with volatility of 0.2.', modelId: 'qwen-max', latencyMs: 900,
        });
        const r = await handleSynthesisQuery('proj-001', [makeEvent()], [], 'what is the risk exposure?');
        expect(callCloudModel).toHaveBeenCalled();
        expect(r.reasoningTier).toBe('RISK_SIGNAL_SYNTHESIS');
    });
});
