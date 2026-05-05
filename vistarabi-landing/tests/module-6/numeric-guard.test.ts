// numeric-guard.test.ts — Module 6B numeric hallucination detection tests
import { describe, it, expect } from 'vitest';
import { validateNumericClaims, extractEvidenceNumbers, matchesEvidence } from '../../src/lib/module-6/events/numeric-guard';
import type { EventEvidencePacket } from '../../src/lib/module-6/events/types';

// ─── Fixture ──────────────────────────────────────────────────────────────────

const BASE_PACKET: EventEvidencePacket = Object.freeze({
    event_id: 'evt-test-001',
    kpi_id: 'kpi-001',
    kpi_name: 'Total Revenue',
    unit: 'currency',
    granularity: 'monthly',
    period_start: '2024-01-01',
    period_end: '2024-12-01',
    delta_percent: 24.5,
    delta_direction: 'up',
    volatility_index: 0.18,
    anomaly_detected: false,
    anomaly_period: undefined,
    anomaly_zscore: undefined,
    dataset_length: 12,
    confidence_level: 'moderate',
    event_type: 'TREND_CHANGE',
    traceable_fields: ['delta_percent', 'volatility_index', 'dataset_length'],
});

const ANOMALY_PACKET: EventEvidencePacket = Object.freeze({
    ...BASE_PACKET,
    event_id: 'evt-test-002',
    anomaly_detected: true,
    anomaly_period: '2024-06-01',
    anomaly_zscore: 3.2,
    event_type: 'ANOMALY',
    confidence_level: 'high',
    traceable_fields: ['delta_percent', 'anomaly_zscore', 'volatility_index', 'dataset_length'],
});

// ─── extractEvidenceNumbers tests ─────────────────────────────────────────────

describe('numeric-guard — extractEvidenceNumbers()', () => {
    it('includes delta_percent (both raw and absolute value)', () => {
        const nums = extractEvidenceNumbers(BASE_PACKET);
        // delta_percent is 24.5 (positive) → both 24.5 (raw) and 24.5 (abs) are stored
        expect(nums).toContain(24.5);
        // For a negative delta, the absolute value would differ from raw:
        const negPacket = { ...BASE_PACKET, delta_percent: -24.5, delta_direction: 'down' as const };
        const negNums = extractEvidenceNumbers(negPacket);
        expect(negNums).toContain(-24.5);   // raw negative value
        expect(negNums).toContain(24.5);    // absolute value
    });

    it('includes volatility_index', () => {
        const nums = extractEvidenceNumbers(BASE_PACKET);
        expect(nums).toContain(0.18);
    });

    it('includes dataset_length', () => {
        const nums = extractEvidenceNumbers(BASE_PACKET);
        expect(nums).toContain(12);
    });

    it('includes anomaly_zscore when present', () => {
        const nums = extractEvidenceNumbers(ANOMALY_PACKET);
        expect(nums).toContain(3.2);
    });
});

// ─── matchesEvidence tests ─────────────────────────────────────────────────────

describe('numeric-guard — matchesEvidence()', () => {
    const evidence = [24.5, 0.18, 12];

    it('exact match → true', () => {
        expect(matchesEvidence(24.5, evidence)).toBe(true);
    });

    it('near-match within tolerance → true', () => {
        expect(matchesEvidence(24.5001, evidence)).toBe(true); // within 0.0001
    });

    it('integer match → true', () => {
        expect(matchesEvidence(12, evidence)).toBe(true);
    });

    it('hallucinated number → false', () => {
        expect(matchesEvidence(99.9, evidence)).toBe(false);
    });

    it('number not in evidence → false', () => {
        expect(matchesEvidence(50, evidence)).toBe(false);
    });
});

// ─── validateNumericClaims tests ──────────────────────────────────────────────

describe('numeric-guard — validateNumericClaims()', () => {
    it('response with no numbers → valid', () => {
        const result = validateNumericClaims(
            'Revenue showed a moderate upward trend during the period.',
            BASE_PACKET
        );
        expect(result.status).toBe('valid');
        expect(result.explanation).toBeTruthy();
    });

    it('response citing valid delta_percent → valid', () => {
        const result = validateNumericClaims(
            'Revenue increased by 24.5% compared to the previous period.',
            BASE_PACKET
        );
        expect(result.status).toBe('valid');
    });

    it('response citing valid dataset_length → valid', () => {
        const result = validateNumericClaims(
            'Analysis based on 12 months of data shows a positive trend.',
            BASE_PACKET
        );
        expect(result.status).toBe('valid');
    });

    it('response citing hallucinated number → suppressed', () => {
        const result = validateNumericClaims(
            'Revenue increased by 87.3% due to seasonal factors.',
            BASE_PACKET
        );
        expect(result.status).toBe('suppressed');
        expect(result.message).toBe('This insight could not be validated against the available evidence.');
        expect(result.detectedHallucinations).toContain(87.3);
    });

    it('LLM mentions a number not in packet → suppressed', () => {
        const result = validateNumericClaims(
            'There were 1500 anomalous transactions flagged.',
            BASE_PACKET
        );
        expect(result.status).toBe('suppressed');
    });

    it('valid anomaly z-score reference → valid', () => {
        const result = validateNumericClaims(
            'The anomaly in June had a z-score of 3.2, indicating a high-severity deviation.',
            ANOMALY_PACKET
        );
        expect(result.status).toBe('valid');
    });

    it('LLM mentions valid delta AND hallucinated number → suppressed (any failure triggers)', () => {
        const result = validateNumericClaims(
            'Revenue increased by 24.5% and is projected to reach 45% next quarter.',
            BASE_PACKET
        );
        // 45 is not in evidence — suppressed
        expect(result.status).toBe('suppressed');
    });

    it('suppression message is always the standard message', () => {
        const result = validateNumericClaims('The value was 999.99 last year.', BASE_PACKET);
        expect(result.status).toBe('suppressed');
        expect(result.message).toBe('This insight could not be validated against the available evidence.');
    });
});
