import { describe, it, expect } from 'vitest';
import { governPackets } from '../../src/lib/module-6e/packet-governance';
import type { EventEvidencePacket, CorrelationEvidencePacket } from '../../src/lib/module-6e/types';

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
    n_observations: 12, pearson_r: 0.78, p_value: 0.002,
    statistically_significant: true, lag_applied: 0, lags_tested: [0],
    bonferroni_alpha: 0.05, null_ratio_a: 0.0, null_ratio_b: 0.0,
    first_differencing_applied: false, trend_confounder_detected: false,
    confidence_level: 'high' as const, correlation_reportable: true,
    traceable_fields: ['pearson_r', 'p_value', 'n_observations'],
    ...overrides,
} as CorrelationEvidencePacket);

describe('packet-governance — governPackets()', () => {
    it('passes valid frozen packets', () => {
        const r = governPackets([makeEvent()], [makeCorr()]);
        expect(r.events.length).toBe(1);
        expect(r.correlations.length).toBe(1);
        expect(r.removedCount).toBe(0);
    });

    it('removes insufficient confidence events', () => {
        const r = governPackets([makeEvent({ confidence_level: 'insufficient' })], []);
        expect(r.events.length).toBe(0);
        expect(r.removedCount).toBe(1);
    });

    it('removes non-reportable correlations', () => {
        const r = governPackets([], [makeCorr({ correlation_reportable: false })]);
        expect(r.correlations.length).toBe(0);
        expect(r.removedCount).toBe(1);
    });

    it('removes insufficient confidence correlations', () => {
        const r = governPackets([], [makeCorr({ confidence_level: 'insufficient' })]);
        expect(r.correlations.length).toBe(0);
        expect(r.removedCount).toBe(1);
    });

    it('removes unfrozen packets', () => {
        const unfrozen = { ...makeEvent() };  // Not frozen
        const r = governPackets([unfrozen as any], []);
        expect(r.events.length).toBe(0);
        expect(r.removedCount).toBe(1);
    });

    it('removes packets with empty traceable_fields', () => {
        const r = governPackets([makeEvent({ traceable_fields: [] })], []);
        expect(r.events.length).toBe(0);
    });

    it('returns reason when all packets removed', () => {
        const r = governPackets([makeEvent({ confidence_level: 'insufficient' })], []);
        expect(r.reason).toBeTruthy();
        expect(r.reason).toContain('removed');
    });

    it('mixed valid + invalid → keeps valid only', () => {
        const r = governPackets(
            [makeEvent(), makeEvent({ confidence_level: 'insufficient' })],
            [makeCorr()]
        );
        expect(r.events.length).toBe(1);
        expect(r.correlations.length).toBe(1);
        expect(r.removedCount).toBe(1);
    });
});
