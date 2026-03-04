import { describe, it, expect } from 'vitest';
import { validateCrossPacketNumerics, extractAllEvidenceNumbers } from '../../src/lib/module-6e/cross-packet-numeric-guard';
import type { EventEvidencePacket, CorrelationEvidencePacket } from '../../src/lib/module-6e/types';

const EV: EventEvidencePacket = Object.freeze({
    event_id: 'ev-001', kpi_id: 'kpi-rev', kpi_name: 'Revenue', unit: 'currency',
    granularity: 'monthly', period_start: '2024-01', period_end: '2024-12',
    delta_percent: 12.5, delta_direction: 'up' as const, volatility_index: 0.2,
    anomaly_detected: false, dataset_length: 12,
    confidence_level: 'high' as const, event_type: 'TREND_CHANGE' as const,
    traceable_fields: ['delta_percent', 'volatility_index'],
} as EventEvidencePacket);

const CORR: CorrelationEvidencePacket = Object.freeze({
    insight_id: 'ins-001', kpi_a_id: 'kpi-rev', kpi_b_id: 'kpi-ord',
    kpi_a_name: 'Revenue', kpi_b_name: 'Orders', unit_a: 'currency', unit_b: 'count',
    grain: 'monthly', time_window_start: '2024-01', time_window_end: '2024-12',
    n_observations: 18, pearson_r: 0.78, p_value: 0.001,
    statistically_significant: true, lag_applied: 0, lags_tested: [0],
    bonferroni_alpha: 0.05, null_ratio_a: 0.0, null_ratio_b: 0.0,
    first_differencing_applied: false, trend_confounder_detected: false,
    confidence_level: 'high' as const, correlation_reportable: true,
    traceable_fields: ['pearson_r', 'p_value', 'n_observations'],
} as CorrelationEvidencePacket);

describe('cross-packet-numeric-guard — extractAllEvidenceNumbers()', () => {
    it('extracts from events', () => {
        const nums = extractAllEvidenceNumbers([EV], []);
        expect(nums).toContain(12.5);
        expect(nums).toContain(0.2);
    });

    it('extracts from correlations', () => {
        const nums = extractAllEvidenceNumbers([], [CORR]);
        expect(nums).toContain(0.78);
        expect(nums).toContain(18);
    });

    it('union across both', () => {
        const nums = extractAllEvidenceNumbers([EV], [CORR]);
        expect(nums).toContain(12.5);
        expect(nums).toContain(0.78);
    });
});

describe('cross-packet-numeric-guard — validateCrossPacketNumerics()', () => {
    it('no numbers in text → valid', () => {
        const r = validateCrossPacketNumerics('Revenue is trending upward.', [EV], [CORR]);
        expect(r.status).toBe('valid');
    });

    it('valid numbers from event → valid', () => {
        const r = validateCrossPacketNumerics('Revenue changed by 12.5%.', [EV], [CORR]);
        expect(r.status).toBe('valid');
    });

    it('valid numbers from correlation → valid', () => {
        const r = validateCrossPacketNumerics('r = 0.78 across 18 observations.', [EV], [CORR]);
        expect(r.status).toBe('valid');
    });

    it('cross-packet valid: event + correlation numbers together', () => {
        const r = validateCrossPacketNumerics(
            'Revenue changed 12.5% and correlates at 0.78 with Orders.',
            [EV], [CORR]
        );
        expect(r.status).toBe('valid');
    });

    it('invented number → suppressed', () => {
        const r = validateCrossPacketNumerics('Revenue grew by 25.3%.', [EV], [CORR]);
        expect(r.status).toBe('suppressed');
        expect(r.detectedHallucinations).toContain(25.3);
    });

    it('suppression message is synthesis-specific', () => {
        const r = validateCrossPacketNumerics('r = 0.95 is impressive.', [EV], [CORR]);
        expect(r.message).toContain('synthesized insight');
    });

    it('mix valid + invented → suppressed', () => {
        const r = validateCrossPacketNumerics(
            'Revenue changed 12.5% and correlates at 0.95.',
            [EV], [CORR]
        );
        expect(r.status).toBe('suppressed');
    });
});
