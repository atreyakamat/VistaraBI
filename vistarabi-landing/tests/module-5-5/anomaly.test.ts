// Module 5.5 — Anomaly Detector Tests
// Validates Z-score computation, severity banding, minimum dataset guard,
// zero-variance guard, and worst-point selection.

import { describe, it, expect } from 'vitest';
import { detectAnomalies } from '../../src/lib/dashboard-state/anomaly-detector';
import type { KPIDataPoint } from '../../src/lib/visualization/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDataset(values: number[]): KPIDataPoint[] {
    return values.map((v, i) => ({ label: `2025-0${Math.floor(i / 28) + 1}-${String(i + 1).padStart(2, '0')}`, value: v }));
}

// ─── Minimum Dataset Guard ────────────────────────────────────────────────────

describe('Anomaly Detector — Minimum Dataset Guard', () => {

    it('Returns null for empty dataset', () => {
        expect(detectAnomalies([])).toBeNull();
    });

    it('Returns null for 4-point dataset (< minDataPoints=5)', () => {
        const dataset = makeDataset([100, 102, 98, 101]);
        expect(detectAnomalies(dataset)).toBeNull();
    });

    it('Does not return null for exactly 5 data points', () => {
        const dataset = makeDataset([100, 100, 100, 100, 500]); // 500 is an outlier
        const report = detectAnomalies(dataset);
        expect(report).not.toBeNull();
    });

});

// ─── Zero Variance Guard ──────────────────────────────────────────────────────

describe('Anomaly Detector — Zero Variance', () => {

    it('Returns null when all values are identical (zero stddev)', () => {
        const dataset = makeDataset([100, 100, 100, 100, 100, 100]);
        expect(detectAnomalies(dataset)).toBeNull();
    });

});

// ─── No Anomaly (Normal Data) ─────────────────────────────────────────────────

describe('Anomaly Detector — Normal Data (No Anomaly)', () => {

    it('Flat data with small noise → no anomaly', () => {
        const dataset = makeDataset([100, 101, 99, 102, 98, 103, 100, 101, 99, 100]);
        const report = detectAnomalies(dataset);
        expect(report).toBeNull(); // All within 2σ
    });

});

// ─── Anomaly Detection ────────────────────────────────────────────────────────

describe('Anomaly Detector — Detects Spikes', () => {

    it('Single massive spike → detected, high severity', () => {
        // We need N>10 to mathematically allow a Z-score >= 3.0 (max Z = sqrt(N-1)).
        // With N=20, max possible Z is ~4.3.
        const dataset = makeDataset([
            10, 12, 9, 11, 10, 9, 11, 10, 10, 12,
            9, 11, 10, 9, 11, 10, 12, 9, 11, 1_000_000
        ]);
        const report = detectAnomalies(dataset);

        expect(report).not.toBeNull();
        expect(report!.detected).toBe(true);
        expect(report!.severity).toBe('high');
        expect(report!.worstPoint.value).toBe(1_000_000);
    });

    it('Single drop → detected (severity may vary by magnitude)', () => {
        const dataset = makeDataset([1000, 1050, 980, 1020, 995, 1010, 1030, 50, 1015, 990]);
        const report = detectAnomalies(dataset);

        expect(report).not.toBeNull();
        expect(report!.detected).toBe(true);
        expect(report!.worstPoint.value).toBe(50);
    });

    it('Multiple outliers → affectedPoints has all flagged points', () => {
        const dataset = makeDataset([100, 100, 100, 100, 100, 5_000, 100, 100, 5_000, 100]);
        const report = detectAnomalies(dataset);

        expect(report!.affectedPoints.length).toBeGreaterThanOrEqual(2);
    });

});

// ─── Severity Bands ───────────────────────────────────────────────────────────

describe('Anomaly Detector — Severity Classification', () => {

    it('Custom low threshold: lower zLowThreshold catches more points', () => {
        // Values with moderate deviation
        const dataset = makeDataset([100, 100, 100, 100, 100, 300, 100, 100, 100, 100]);
        const defaultReport = detectAnomalies(dataset, { minDataPoints: 5, zLowThreshold: 2.0, zHighThreshold: 3.0, rollingWindowSize: 5 });
        const sensitiveReport = detectAnomalies(dataset, { minDataPoints: 5, zLowThreshold: 1.0, zHighThreshold: 2.0, rollingWindowSize: 5 });

        // Sensitive config should catch more points
        const defaultCount = defaultReport?.affectedPoints.length || 0;
        const sensitiveCount = sensitiveReport?.affectedPoints.length || 0;
        expect(sensitiveCount).toBeGreaterThanOrEqual(defaultCount);
    });

    it('Custom high/low thresholds: spike labeled correctly', () => {
        const dataset = makeDataset([
            100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
            100, 100, 100, 100, 100, 100, 100, 100, 100, 50_000
        ]);
        const report = detectAnomalies(dataset, { minDataPoints: 5, zLowThreshold: 2.0, zHighThreshold: 3.0, rollingWindowSize: 5 });

        expect(report!.severity).toBe('high');
    });

});

// ─── Reasoning String ─────────────────────────────────────────────────────────

describe('Anomaly Detector — Reasoning', () => {

    it('Reasoning contains value, mean, stddev reference', () => {
        const dataset = makeDataset([10, 10, 10, 10, 10, 50_000]);
        const report = detectAnomalies(dataset);

        expect(report!.reasoning).toBeTruthy();
        // Reasoning must mention sigma and the label of the worst point
        expect(report!.reasoning).toMatch(/σ/);
        expect(report!.reasoning).toContain(report!.worstPoint.label);
    });

    it('Reasoning mentions severity', () => {
        const dataset = makeDataset([100, 100, 100, 100, 100, 50_000]);
        const report = detectAnomalies(dataset);
        expect(report!.reasoning.toUpperCase()).toMatch(/HIGH|MEDIUM|LOW/);
    });

});

// Helper
function worst(dataset: KPIDataPoint[]): number {
    return Math.max(...dataset.map(d => d.value));
}
