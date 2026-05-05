import { describe, it, expect } from 'vitest';
import { buildSynthesisPrompt } from '../../src/lib/module-6/synthesis/synthesis-prompt-builder';
import type { EventEvidencePacket, CorrelationEvidencePacket, ConflictDescriptor } from '../../src/lib/module-6/synthesis/types';

const EV: EventEvidencePacket = Object.freeze({
    event_id: 'ev-001', kpi_id: 'kpi-rev', kpi_name: 'Revenue', unit: 'currency',
    granularity: 'monthly', period_start: '2024-01', period_end: '2024-12',
    delta_percent: 12.5, delta_direction: 'up' as const, volatility_index: 0.2,
    anomaly_detected: false, dataset_length: 12,
    confidence_level: 'high' as const, event_type: 'TREND_CHANGE' as const,
    traceable_fields: ['delta_percent'],
} as EventEvidencePacket);

const CORR: CorrelationEvidencePacket = Object.freeze({
    insight_id: 'ins-001', kpi_a_id: 'kpi-rev', kpi_b_id: 'kpi-ord',
    kpi_a_name: 'Revenue', kpi_b_name: 'Orders', unit_a: 'currency', unit_b: 'count',
    grain: 'monthly', time_window_start: '2024-01', time_window_end: '2024-12',
    n_observations: 12, pearson_r: 0.78, p_value: 0.002,
    statistically_significant: true, lag_applied: 0, lags_tested: [0],
    bonferroni_alpha: 0.05, null_ratio_a: 0.0, null_ratio_b: 0.0,
    first_differencing_applied: false, trend_confounder_detected: false,
    confidence_level: 'high' as const, correlation_reportable: true,
    traceable_fields: ['pearson_r', 'p_value'],
} as CorrelationEvidencePacket);

const CONFLICT: ConflictDescriptor = {
    type: 'DIRECTIONAL_INCONSISTENCY',
    kpiIds: ['kpi-rev', 'kpi-ord'],
    description: 'Event up but correlation negative.',
    severity: 'high',
};

describe('synthesis-prompt-builder — buildSynthesisPrompt()', () => {
    it('returns systemPrompt, userMessage, sanitizedQuery', () => {
        const r = buildSynthesisPrompt('MULTI_PACKET_SYNTHESIS', [EV], [CORR], [], 'What patterns?');
        expect(r.systemPrompt).toBeTruthy();
        expect(r.userMessage).toBeTruthy();
        expect(r.sanitizedQuery).toBeTruthy();
    });

    it('systemPrompt differs by task type', () => {
        const a = buildSynthesisPrompt('SINGLE_PACKET_SUMMARY', [EV], [], [], 'Why?');
        const b = buildSynthesisPrompt('RISK_SIGNAL_SYNTHESIS', [EV], [], [], 'Why?');
        expect(a.systemPrompt).not.toBe(b.systemPrompt);
    });

    it('includes event serialization', () => {
        const r = buildSynthesisPrompt('MULTI_PACKET_SYNTHESIS', [EV], [], [], 'Why?');
        expect(r.userMessage).toContain('Revenue');
        expect(r.userMessage).toContain('12.5');
    });

    it('includes correlation serialization', () => {
        const r = buildSynthesisPrompt('CORRELATION_CLUSTER_ANALYSIS', [], [CORR], [], 'Why?');
        expect(r.userMessage).toContain('0.780');
        expect(r.userMessage).toContain('0.0020');
    });

    it('includes conflict block', () => {
        const r = buildSynthesisPrompt('MULTI_PACKET_SYNTHESIS', [EV], [CORR], [CONFLICT], 'Why?');
        expect(r.userMessage).toContain('DIRECTIONAL_INCONSISTENCY');
        expect(r.userMessage).toContain('high');
    });

    it('no conflicts → "No conflicts detected"', () => {
        const r = buildSynthesisPrompt('MULTI_PACKET_SYNTHESIS', [EV], [], [], 'Why?');
        expect(r.userMessage).toContain('No conflicts detected');
    });

    it('sanitizes user query (SQL stripped)', () => {
        const r = buildSynthesisPrompt('SINGLE_PACKET_SUMMARY', [EV], [], [],
            'SELECT * FROM data; what are the patterns?');
        expect(r.sanitizedQuery.toUpperCase()).not.toContain('SELECT');
    });

    it('anti-causation rule in correlation cluster prompt', () => {
        const r = buildSynthesisPrompt('CORRELATION_CLUSTER_ANALYSIS', [], [CORR], [], 'Why?');
        expect(r.systemPrompt.toLowerCase()).toContain('causation');
    });

    it('risk synthesis prompt mentions uncertainty', () => {
        const r = buildSynthesisPrompt('RISK_SIGNAL_SYNTHESIS', [EV], [], [], 'Risk?');
        expect(r.systemPrompt.toLowerCase()).toContain('predict');  // "Do not predict"
    });
});
