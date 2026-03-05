import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../../src/lib/module-6/synthesis/conflict-detector';
import type { EventEvidencePacket, CorrelationEvidencePacket } from '../../src/lib/module-6/synthesis/types';

const makeEvent = (overrides: Partial<EventEvidencePacket> = {}): EventEvidencePacket => Object.freeze({
    event_id: 'ev-001', kpi_id: 'kpi-rev', kpi_name: 'Revenue', unit: 'currency',
    granularity: 'monthly', period_start: '2024-01', period_end: '2024-12',
    delta_percent: 12.5, delta_direction: 'up' as const, volatility_index: 0.2,
    anomaly_detected: false, dataset_length: 12,
    confidence_level: 'high' as const, event_type: 'TREND_CHANGE' as const,
    traceable_fields: ['delta_percent'], ...overrides,
} as EventEvidencePacket);

const makeCorr = (overrides: Partial<CorrelationEvidencePacket> = {}): CorrelationEvidencePacket => Object.freeze({
    insight_id: 'ins-001', kpi_a_id: 'kpi-rev', kpi_b_id: 'kpi-ord',
    kpi_a_name: 'Revenue', kpi_b_name: 'Orders', unit_a: 'currency', unit_b: 'count',
    grain: 'monthly', time_window_start: '2024-01', time_window_end: '2024-12',
    n_observations: 12, pearson_r: 0.78, p_value: 0.002,
    statistically_significant: true, lag_applied: 0, lags_tested: [0],
    bonferroni_alpha: 0.05, null_ratio_a: 0.0, null_ratio_b: 0.0,
    first_differencing_applied: false, trend_confounder_detected: false,
    confidence_level: 'high' as const, correlation_reportable: true,
    traceable_fields: ['pearson_r'], ...overrides,
} as CorrelationEvidencePacket);

describe('conflict-detector — detectConflicts()', () => {
    it('no conflicts when direction and r agree', () => {
        const c = detectConflicts([makeEvent()], [makeCorr()]); // up + r>0
        expect(c.filter(x => x.type === 'DIRECTIONAL_INCONSISTENCY').length).toBe(0);
    });

    it('directional: event up but r negative', () => {
        const c = detectConflicts(
            [makeEvent({ delta_direction: 'up' })],
            [makeCorr({ pearson_r: -0.45 })]
        );
        expect(c.some(x => x.type === 'DIRECTIONAL_INCONSISTENCY')).toBe(true);
    });

    it('directional: event down but r positive', () => {
        const c = detectConflicts(
            [makeEvent({ delta_direction: 'down' })],
            [makeCorr({ pearson_r: 0.78 })]
        );
        expect(c.some(x => x.type === 'DIRECTIONAL_INCONSISTENCY')).toBe(true);
    });

    it('confidence mismatch: high vs low', () => {
        const events = [
            makeEvent({ kpi_id: 'kpi-rev', confidence_level: 'high' }),
            makeEvent({ event_id: 'ev-002', kpi_id: 'kpi-ord', kpi_name: 'Orders', confidence_level: 'low' }),
        ];
        const c = detectConflicts(events, [makeCorr()]);
        expect(c.some(x => x.type === 'CONFIDENCE_MISMATCH')).toBe(true);
    });

    it('no confidence mismatch when both high', () => {
        const events = [
            makeEvent({ kpi_id: 'kpi-rev', confidence_level: 'high' }),
            makeEvent({ event_id: 'ev-002', kpi_id: 'kpi-ord', kpi_name: 'Orders', confidence_level: 'high' }),
        ];
        const c = detectConflicts(events, [makeCorr()]);
        expect(c.filter(x => x.type === 'CONFIDENCE_MISMATCH').length).toBe(0);
    });

    it('lag misalignment across pairs', () => {
        const corrs = [
            makeCorr({ kpi_a_id: 'kpi-rev', kpi_b_id: 'kpi-ord', lag_applied: 0 }),
            makeCorr({ insight_id: 'ins-002', kpi_a_id: 'kpi-rev', kpi_b_id: 'kpi-mkt', lag_applied: 2 }),
        ];
        const c = detectConflicts([], corrs);
        expect(c.some(x => x.type === 'LAG_MISALIGNMENT')).toBe(true);
    });

    it('volatility mismatch: high volatility but insignificant correlation', () => {
        const c = detectConflicts(
            [makeEvent({ volatility_index: 0.45 })],
            [makeCorr({ statistically_significant: false })]
        );
        expect(c.some(x => x.type === 'VOLATILITY_MISMATCH')).toBe(true);
    });

    it('no volatility mismatch when correlation is significant', () => {
        const c = detectConflicts(
            [makeEvent({ volatility_index: 0.45 })],
            [makeCorr({ statistically_significant: true })]
        );
        expect(c.filter(x => x.type === 'VOLATILITY_MISMATCH').length).toBe(0);
    });

    it('empty packets → no conflicts', () => {
        expect(detectConflicts([], []).length).toBe(0);
    });
});
