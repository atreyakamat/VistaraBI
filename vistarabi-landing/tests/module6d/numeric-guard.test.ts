// numeric-guard.test.ts — Module 6D model-agnostic numeric validation tests
import { describe, it, expect } from 'vitest';
import { validateNumericClaims, extractEvidenceNumbers, matchesEvidence } from '../../src/lib/module-6d/numeric-guard';
import type { EvidenceInput } from '../../src/lib/module-6d/types';

// ─── Fixture ──────────────────────────────────────────────────────────────────

const BASE_EVIDENCE: EvidenceInput = Object.freeze({
    kpi_a_name: 'Revenue',
    kpi_b_name: 'Orders',
    n_observations: 18,
    pearson_r: 0.73,
    p_value: 0.001,
    bonferroni_alpha: 0.05,
    null_ratio_a: 0.0,
    null_ratio_b: 0.0,
    traceable_fields: ['pearson_r', 'p_value', 'n_observations', 'bonferroni_alpha'],
    correlation_reportable: true,
    confidence_level: 'moderate',
} as any);

// ─── extractEvidenceNumbers ────────────────────────────────────────────────────

describe('numeric-guard — extractEvidenceNumbers()', () => {
    it('extracts pearson_r', () => {
        const nums = extractEvidenceNumbers(BASE_EVIDENCE);
        expect(nums).toContain(0.73);
    });

    it('extracts p_value', () => {
        const nums = extractEvidenceNumbers(BASE_EVIDENCE);
        expect(nums).toContain(0.001);
    });

    it('extracts n_observations', () => {
        const nums = extractEvidenceNumbers(BASE_EVIDENCE);
        expect(nums).toContain(18);
    });

    it('negative r → includes both signed and absolute value', () => {
        const negEvidence = { ...BASE_EVIDENCE, pearson_r: -0.61, traceable_fields: ['pearson_r'] } as any;
        const nums = extractEvidenceNumbers(negEvidence);
        expect(nums).toContain(-0.61);
        expect(nums).toContain(0.61);
    });
});

// ─── matchesEvidence ──────────────────────────────────────────────────────────

describe('numeric-guard — matchesEvidence()', () => {
    const evidence = [0.73, 0.001, 18, 0.05];

    it('exact match → true', () => {
        expect(matchesEvidence(0.73, evidence)).toBe(true);
    });

    it('within float tolerance → true', () => {
        expect(matchesEvidence(0.730001, evidence)).toBe(true);
    });

    it('invented value → false', () => {
        expect(matchesEvidence(0.99, evidence)).toBe(false);
    });

    it('invented integer → false', () => {
        expect(matchesEvidence(42, evidence)).toBe(false);
    });
});

// ─── validateNumericClaims ────────────────────────────────────────────────────

describe('numeric-guard — validateNumericClaims()', () => {
    it('no numbers in text → valid', () => {
        const result = validateNumericClaims(
            'Revenue and Orders show a positive correlation.',
            BASE_EVIDENCE
        );
        expect(result.status).toBe('valid');
    });

    it('valid r citation → valid', () => {
        const result = validateNumericClaims(
            'The Pearson correlation of 0.73 is statistically significant.',
            BASE_EVIDENCE
        );
        expect(result.status).toBe('valid');
    });

    it('valid n_observations citation → valid', () => {
        const result = validateNumericClaims(
            'Based on 18 observations, the result is significant.',
            BASE_EVIDENCE
        );
        expect(result.status).toBe('valid');
    });

    it('invented r → suppressed', () => {
        const result = validateNumericClaims(
            'The correlation is 0.95, which is very high.',
            BASE_EVIDENCE
        );
        expect(result.status).toBe('suppressed');
        expect(result.detectedHallucinations).toContain(0.95);
    });

    it('invented n → suppressed', () => {
        const result = validateNumericClaims(
            'Based on 36 months of data, revenue drives orders.',
            BASE_EVIDENCE
        );
        expect(result.status).toBe('suppressed');
    });

    it('mix of valid + invented → suppressed (zero tolerance)', () => {
        const result = validateNumericClaims(
            'r = 0.73 over 18 periods shows 95% confidence.',
            BASE_EVIDENCE
        );
        expect(result.status).toBe('suppressed');
    });

    it('suppression message is standardized', () => {
        const result = validateNumericClaims('r = 0.999 is fantastic.', BASE_EVIDENCE);
        expect(result.message).toBe('This insight could not be validated against the available evidence.');
    });

    it('same policy for evidence from CorrelationEvidencePacket or EventEvidencePacket shape', () => {
        // EventEvidencePacket-shaped evidence
        const eventEvidence: EvidenceInput = {
            kpi_id: 'kpi-rev',
            kpi_name: 'Revenue',
            delta_percent: 12.5,
            primary_value: 50000,
            traceable_fields: ['delta_percent', 'primary_value'],
        } as any;
        const result = validateNumericClaims(
            'Revenue changed by 12.5%, reaching 50000.',
            eventEvidence
        );
        expect(result.status).toBe('valid');
    });
});
