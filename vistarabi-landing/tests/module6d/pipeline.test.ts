// pipeline.test.ts — Module 6D full pipeline integration tests (mocked adapters)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (must be declared before imports that use them) ─────────────────────

vi.mock('@/lib/module-6d/local-adapter', () => ({
    callLocalModel: vi.fn(),
}));

vi.mock('@/lib/module-6d/cloud-adapter', () => ({
    callCloudModel: vi.fn(),
}));

vi.mock('@/lib/module-6d/audit-logger', () => ({
    writeReasoningAuditRecord: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/module-6/audit-log', () => ({
    writeAuditRecord: vi.fn().mockResolvedValue(undefined),
    readAuditRecord: vi.fn().mockResolvedValue(null),
}));

const { handleReasoningQuery } = await import('../../src/lib/module-6d/index');
const { callLocalModel } = await import('@/lib/module-6d/local-adapter');
const { callCloudModel } = await import('@/lib/module-6d/cloud-adapter');
const { writeReasoningAuditRecord } = await import('@/lib/module-6d/audit-logger');
const { ModelCallError } = await import('@/lib/module-6d/types');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EVIDENCE = Object.freeze({
    kpi_a_id: 'kpi-rev',
    kpi_b_id: 'kpi-ord',
    kpi_a_name: 'Revenue',
    kpi_b_name: 'Orders',
    grain: 'monthly',
    time_window_start: '2024-01-01',
    time_window_end: '2024-12-01',
    n_observations: 12,
    pearson_r: 0.73,
    p_value: 0.001,
    statistically_significant: true,
    lag_applied: 0,
    lags_tested: [0],
    bonferroni_alpha: 0.05,
    null_ratio_a: 0.0,
    null_ratio_b: 0.0,
    first_differencing_applied: false,
    trend_confounder_detected: false,
    confidence_level: 'high',
    correlation_reportable: true,
    traceable_fields: ['pearson_r', 'p_value', 'n_observations', 'bonferroni_alpha'],
} as any);

const VALID_NARRATION = 'Revenue and Orders show a Pearson correlation of 0.73 based on 12 observations, which is statistically significant (p = 0.001).';
const HALLUCINATED = 'Revenue and Orders are correlated at 0.99 over 36 months.';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pipeline — handleReasoningQuery() Tier-2 (LOCAL)', () => {
    beforeEach(() => {
        vi.mocked(callLocalModel).mockClear();
        vi.mocked(callCloudModel).mockClear();
        vi.mocked(writeReasoningAuditRecord).mockClear();
        delete process.env.ENABLE_CLOUD_ROUTING;
    });

    it('CORRELATION_EXPLANATION + valid narration → success', async () => {
        vi.mocked(callLocalModel).mockResolvedValueOnce({
            text: VALID_NARRATION, modelId: 'qwen3:8b', inputTokens: 80, outputTokens: 60, latencyMs: 220,
        });

        const result = await handleReasoningQuery('proj-001', 'CORRELATION_EXPLANATION', EVIDENCE, 'What does this mean?');
        expect(result.status).toBe('success');
        expect(result.explanation).toContain('0.73');
        expect(result.modelMetadata?.modelTier).toBe('LOCAL');
    });

    it('valid narration → modelMetadata present with correct model ID', async () => {
        vi.mocked(callLocalModel).mockResolvedValueOnce({
            text: VALID_NARRATION, modelId: 'qwen3:8b', latencyMs: 200,
        });

        const result = await handleReasoningQuery('proj-001', 'CORRELATION_EXPLANATION', EVIDENCE, 'Why?');
        expect(result.modelMetadata?.modelId).toBe('qwen3:8b');
    });

    it('hallucinated output → suppressed', async () => {
        vi.mocked(callLocalModel).mockResolvedValueOnce({
            text: HALLUCINATED, modelId: 'qwen3:8b', latencyMs: 200,
        });

        const result = await handleReasoningQuery('proj-001', 'CORRELATION_EXPLANATION', EVIDENCE, 'Why?');
        expect(result.status).toBe('suppressed');
        expect(result.message).toContain('could not be validated');
    });

    it('UNSUPPORTED task type → rejected immediately', async () => {
        const result = await handleReasoningQuery('proj-001', 'WHAT_DO_YOU_THINK', EVIDENCE, 'What?');
        expect(result.status).toBe('rejected');
        expect(callLocalModel).not.toHaveBeenCalled();
    });

    it('LOCAL_TIMEOUT → timeout status (recoverable)', async () => {
        vi.mocked(callLocalModel).mockRejectedValueOnce(
            new ModelCallError('LOCAL_TIMEOUT', 'Timed out', true)
        );

        const result = await handleReasoningQuery('proj-001', 'EVENT_NARRATION', EVIDENCE, 'Explain?');
        expect(result.status).toBe('timeout');
    });

    it('audit record written on success', async () => {
        vi.mocked(callLocalModel).mockResolvedValueOnce({
            text: VALID_NARRATION, modelId: 'qwen3:8b', latencyMs: 180,
        });

        await handleReasoningQuery('proj-001', 'CORRELATION_EXPLANATION', EVIDENCE, 'Why?');
        expect(writeReasoningAuditRecord).toHaveBeenCalledTimes(1);
    });

    it('audit record written even on failure (unconditional)', async () => {
        vi.mocked(callLocalModel).mockRejectedValueOnce(
            new ModelCallError('LOCAL_CALL_FAILED', 'Connection error', false)
        );

        await handleReasoningQuery('proj-001', 'CORRELATION_EXPLANATION', EVIDENCE, 'Why?');
        expect(writeReasoningAuditRecord).toHaveBeenCalledTimes(1);
    });
});

describe('pipeline — handleReasoningQuery() Tier-3 (CLOUD)', () => {
    afterEach(() => { delete process.env.ENABLE_CLOUD_ROUTING; });

    it('ADVANCED_SYNTHESIS + cloud enabled → callCloudModel', async () => {
        process.env.ENABLE_CLOUD_ROUTING = 'true';
        vi.mocked(callCloudModel).mockResolvedValueOnce({
            text: 'Revenue and Orders co-move with r = 0.73 across 12 observations.',
            modelId: 'qwen-max', inputTokens: 200, outputTokens: 100, latencyMs: 800,
        });

        const result = await handleReasoningQuery(
            'proj-001', 'ADVANCED_SYNTHESIS', EVIDENCE, 'What patterns exist?',
            { hasMultipleKPIs: true }
        );
        expect(callCloudModel).toHaveBeenCalled();
        expect(callLocalModel).not.toHaveBeenCalled();
        expect(result.modelMetadata?.modelTier).toBe('CLOUD');
    });

    it('ADVANCED_SYNTHESIS + cloud disabled → rejected (MODEL_UNAVAILABLE), never calls cloud', async () => {
        delete process.env.ENABLE_CLOUD_ROUTING;

        const result = await handleReasoningQuery(
            'proj-001', 'ADVANCED_SYNTHESIS', EVIDENCE, 'What patterns exist?',
            { hasMultipleKPIs: true }
        );
        expect(result.status).toBe('rejected');
        expect(callCloudModel).not.toHaveBeenCalled();
        expect(callLocalModel).not.toHaveBeenCalled();
        expect(result.message).toContain('Cloud reasoning is not enabled');
    });

    it('CLOUD_TIMEOUT → timeout status', async () => {
        process.env.ENABLE_CLOUD_ROUTING = 'true';
        vi.mocked(callCloudModel).mockRejectedValueOnce(
            new ModelCallError('CLOUD_TIMEOUT', 'Qwen timed out', true)
        );

        const result = await handleReasoningQuery(
            'proj-001', 'STRATEGIC_SUMMARY', EVIDENCE, 'Summarize?'
        );
        expect(result.status).toBe('timeout');
        expect(callLocalModel).not.toHaveBeenCalled();  // No silent fallback
    });
});
