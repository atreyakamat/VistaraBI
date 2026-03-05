// numeric-guard.test.ts — Module 6C numeric hallucination detection tests
import { describe, it, expect } from 'vitest';
import { validateNumericClaims, extractEvidenceNumbers, matchesEvidence } from '../../src/lib/module-6/correlations/numeric-guard';
import type { CorrelationEvidencePacket } from '../../src/lib/module-6/correlations/types';

// ─── Fixture ──────────────────────────────────────────────────────────────────

const BASE_PACKET: CorrelationEvidencePacket = Object.freeze({
    insight_id: 'ins-test-001',
    kpi_a_id: 'kpi-revenue',
    kpi_b_id: 'kpi-orders',
    kpi_a_name: 'Total Revenue',
    kpi_b_name: 'Order Count',
    unit_a: 'currency',
    unit_b: 'count',
    grain: 'monthly',
    time_window_start: '2024-01-01',
    time_window_end: '2024-12-01',
    n_observations: 18,
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
    confidence_level: 'moderate',
    correlation_reportable: true,
    traceable_fields: ['pearson_r', 'p_value', 'n_observations', 'bonferroni_alpha'],
});

// ─── extractEvidenceNumbers tests ─────────────────────────────────────────────

describe('numeric-guard — extractEvidenceNumbers()', () => {
    it('extracts pearson_r (both raw and absolute)', () => {
        const nums = extractEvidenceNumbers(BASE_PACKET);
        expect(nums).toContain(0.73);
    });

    it('extracts p_value', () => {
        const nums = extractEvidenceNumbers(BASE_PACKET);
        expect(nums).toContain(0.001);
    });

    it('extracts n_observations', () => {
        const nums = extractEvidenceNumbers(BASE_PACKET);
        expect(nums).toContain(18);
    });

    it('extracts bonferroni_alpha', () => {
        const nums = extractEvidenceNumbers(BASE_PACKET);
        expect(nums).toContain(0.05);
    });

    it('extracts negative r and its absolute value', () => {
        const negPacket = { ...BASE_PACKET, pearson_r: -0.65 };
        const nums = extractEvidenceNumbers(negPacket);
        expect(nums).toContain(-0.65);
        expect(nums).toContain(0.65);
    });
});

// ─── matchesEvidence tests ─────────────────────────────────────────────────────

describe('numeric-guard — matchesEvidence()', () => {
    const evidence = [0.73, 0.001, 18, 0.05];

    it('exact match → true', () => {
        expect(matchesEvidence(0.73, evidence)).toBe(true);
    });

    it('float within tolerance → true', () => {
        expect(matchesEvidence(0.730001, evidence)).toBe(true);
    });

    it('integer match → true', () => {
        expect(matchesEvidence(18, evidence)).toBe(true);
    });

    it('invented value → false', () => {
        expect(matchesEvidence(0.45, evidence)).toBe(false);
    });
});

// ─── validateNumericClaims tests ──────────────────────────────────────────────

describe('numeric-guard — validateNumericClaims()', () => {
    it('no numbers in response → valid', () => {
        const result = validateNumericClaims(
            'Total Revenue and Order Count show a statistically significant positive correlation.',
            BASE_PACKET
        );
        expect(result.status).toBe('valid');
    });

    it('valid r citation → valid', () => {
        const result = validateNumericClaims(
            'The correlation between Total Revenue and Order Count has a Pearson r of 0.73.',
            BASE_PACKET
        );
        expect(result.status).toBe('valid');
    });

    it('valid n_observations citation → valid', () => {
        const result = validateNumericClaims(
            'Based on 18 months of data, the correlation is statistically significant.',
            BASE_PACKET
        );
        expect(result.status).toBe('valid');
    });

    it('invented r value → suppressed', () => {
        const result = validateNumericClaims(
            'The Pearson correlation coefficient is 0.95, indicating a very strong relationship.',
            BASE_PACKET
        );
        expect(result.status).toBe('suppressed');
        expect(result.detectedHallucinations).toContain(0.95);
    });

    it('invented n → suppressed', () => {
        const result = validateNumericClaims(
            'Based on 36 months of data, the correlation is strong.',
            BASE_PACKET
        );
        expect(result.status).toBe('suppressed');
    });

    it('valid r + invented percentage → suppressed (any failure triggers)', () => {
        const result = validateNumericClaims(
            'With r = 0.73 across 18 periods, revenue was 45% of orders.',
            BASE_PACKET
        );
        expect(result.status).toBe('suppressed');
    });

    it('correct standard suppression message', () => {
        const result = validateNumericClaims('Revenue correlated at 0.99 with orders.', BASE_PACKET);
        expect(result.status).toBe('suppressed');
        expect(result.message).toBe('This insight could not be validated against the available evidence.');
    });

    it('negative r cited by abs value → valid', () => {
        const negPacket = { ...BASE_PACKET, pearson_r: -0.73 };
        const result = validateNumericClaims(
            'The correlation coefficient is -0.73, indicating a negative relationship.',
            negPacket
        );
        expect(result.status).toBe('valid');
    });
});
