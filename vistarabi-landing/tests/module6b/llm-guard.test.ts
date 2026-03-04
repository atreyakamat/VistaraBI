// llm-guard.test.ts — Module 6B LLM output guard integration tests
// Tests the validateNumericClaims function with LLM-style outputs
// and full pipeline integration scenarios.
import { describe, it, expect } from 'vitest';
import { validateNumericClaims } from '../../src/lib/module-6b/numeric-guard';
import { buildEvidencePacket } from '../../src/lib/module-6b/evidence-packet';
import type { EventEvidencePacket } from '../../src/lib/module-6b/types';
import type { EnrichedKPIResult } from '../../src/lib/dashboard-state/types';

// ─── Packet Fixtures ──────────────────────────────────────────────────────────

function makePacket(deltaPercent: number | null, anomalyZScore?: number, datasetLen = 10): EventEvidencePacket {
    const traceableFields = ['dataset_length'];
    if (deltaPercent !== null) traceableFields.push('delta_percent');
    if (anomalyZScore !== undefined) traceableFields.push('anomaly_zscore', 'volatility_index');

    return Object.freeze({
        event_id: 'evt-llm-guard-001',
        kpi_id: 'kpi-001',
        kpi_name: 'Order Count',
        unit: 'count',
        granularity: 'monthly',
        period_start: '2024-01-01',
        period_end: '2024-10-01',
        delta_percent: deltaPercent,
        delta_direction: deltaPercent !== null ? (deltaPercent > 0 ? 'up' : 'down') : null,
        volatility_index: 0.25,
        anomaly_detected: anomalyZScore !== undefined,
        anomaly_period: anomalyZScore !== undefined ? '2024-05-01' : undefined,
        anomaly_zscore: anomalyZScore,
        dataset_length: datasetLen,
        confidence_level: datasetLen >= 12 ? 'high' : datasetLen >= 8 ? 'moderate' : 'low',
        event_type: anomalyZScore !== undefined ? 'ANOMALY' : 'TREND_CHANGE',
        traceable_fields: traceableFields,
    });
}

// ─── LLM Output Simulation Tests ─────────────────────────────────────────────

describe('llm-guard.test — LLM output guard scenarios', () => {
    it('LLM output with no numbers → valid (qualitative only)', () => {
        const packet = makePacket(18.5);
        const output = 'Order Count showed a significant upward trend during the analysis period. The data indicates consistent growth with moderate variability.';
        const result = validateNumericClaims(output, packet);
        expect(result.status).toBe('valid');
    });

    it('LLM references valid deltaPercent → valid', () => {
        const packet = makePacket(18.5);
        const output = 'Order Count increased by 18.5% compared to the previous period, based on the available evidence.';
        const result = validateNumericClaims(output, packet);
        expect(result.status).toBe('valid');
    });

    it('LLM invents percentage not in packet → suppressed', () => {
        const packet = makePacket(18.5);
        const output = 'Order Count surged by 42.7% due to a marketing campaign.';
        const result = validateNumericClaims(output, packet);
        expect(result.status).toBe('suppressed');
        expect(result.detectedHallucinations).toBeDefined();
        expect(result.detectedHallucinations!.length).toBeGreaterThan(0);
    });

    it('LLM mentions valid anomaly z-score → valid', () => {
        const packet = makePacket(-12.0, 2.9, 12);
        const output = 'An anomaly was detected with a z-score of 2.9, indicating a statistically unusual data point.';
        const result = validateNumericClaims(output, packet);
        expect(result.status).toBe('valid');
    });

    it('LLM invents a z-score → suppressed', () => {
        const packet = makePacket(-12.0, 2.9, 12);
        const output = 'The anomaly exhibited a z-score of 5.4, far above normal thresholds.';
        const result = validateNumericClaims(output, packet);
        expect(result.status).toBe('suppressed');
    });

    it('LLM mentions dataset length correctly → valid', () => {
        const packet = makePacket(5, undefined, 10);
        const output = 'Based on 10 months of data, Order Count shows a slight upward movement.';
        const result = validateNumericClaims(output, packet);
        expect(result.status).toBe('valid');
    });

    it('LLM mentions wrong dataset length → suppressed', () => {
        const packet = makePacket(5, undefined, 10);
        const output = 'Based on 24 months of data, Order Count shows growth.';
        const result = validateNumericClaims(output, packet);
        expect(result.status).toBe('suppressed');
    });

    it('suppression returns standard message, not raw error', () => {
        const packet = makePacket(10);
        const result = validateNumericClaims('Revenue jumped 99% this period.', packet);
        expect(result.status).toBe('suppressed');
        expect(result.message).toBe('This insight could not be validated against the available evidence.');
        // No internal details exposed
        expect(result.message).not.toContain('99');
    });

    it('LLM uses absolute value of negative delta → valid (abs match allowed)', () => {
        const packet = makePacket(-18.5);
        // LLM says "18.5% decline" — references magnitude without sign
        const output = 'Order Count declined by 18.5% compared to the previous period.';
        const result = validateNumericClaims(output, packet);
        expect(result.status).toBe('valid');
    });

    it('mixed: valid number + invented number → suppressed', () => {
        const packet = makePacket(18.5, undefined, 8);
        const output = 'Order Count grew 18.5% but revenue also grew 77% which is remarkable.';
        const result = validateNumericClaims(output, packet);
        expect(result.status).toBe('suppressed'); // 77 not in evidence
    });
});

// ─── buildEvidencePacket → validateNumericClaims integration ─────────────────

describe('llm-guard.test — full packet integration', () => {
    it('buildEvidencePacket feeds validateNumericClaims correctly', () => {
        const mockResult = {
            kpiId: 'kpi-rev-999',
            kpiName: 'Revenue',
            unit: 'currency',
            primaryValue: 1500,
            previousValue: 1200,
            delta: 300,
            deltaPercent: 25,
            deltaDirection: 'up',
            dataset: Array.from({ length: 10 }, (_, i) => ({ label: `2024-${String(i + 1).padStart(2, '0')}-01`, value: 1000 + i * 50 })),
            datasetSize: 10,
            profiling: { recordCount: 10, uniqueCategoryCount: 1, numberOfSeries: 1, hasTimeDimension: true, numericDimensionCount: 1, hierarchicalDepth: 0, volatilityIndex: 0.2, distributionSkew: 0, cardinalityLevel: 'low', isSequentialChange: true },
            anomaly: { detected: false, severity: 'low', worstPoint: { label: '', value: 0, zScore: 0, severity: 'low' }, affectedPoints: [], reasoning: '' },
            guardrail: null,
            summary: { headline: 'Revenue up 25%', detail: 'Current: 1.50K | Previous: 1.20K', trendLabel: 'notable_increase', thresholdBand: 'high', generatedAt: new Date().toISOString() },
        } as unknown as EnrichedKPIResult;

        const packet = buildEvidencePacket(mockResult as EnrichedKPIResult, 'monthly');

        // Valid reference to delta_percent
        const valid = validateNumericClaims('Revenue increased by 25% over the period.', packet);
        expect(valid.status).toBe('valid');

        // Hallucinated number
        const invalid = validateNumericClaims('Revenue is expected to grow 50% next month.', packet);
        expect(invalid.status).toBe('suppressed');
    });
});
