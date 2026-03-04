// correlation-packet.test.ts — Module 6C evidence packet construction tests
import { describe, it, expect } from 'vitest';
import { buildCorrelationPacket, CorrelationPacketError } from '../../src/lib/module-6c/correlation-packet';
import type { CorrelationPacketArgs } from '../../src/lib/module-6c/correlation-packet';

// ─── Fixture ──────────────────────────────────────────────────────────────────

const BASE_ARGS: CorrelationPacketArgs = {
    kpiAId: 'kpi-revenue',
    kpiBId: 'kpi-orders',
    kpiAName: 'Total Revenue',
    kpiBName: 'Order Count',
    unitA: 'currency',
    unitB: 'count',
    grain: 'monthly',
    timeWindowStart: '2024-01-01',
    timeWindowEnd: '2024-12-01',
    nObservations: 20,
    pearsonR: 0.82,
    pValue: 0.003,
    statSig: true,
    lagApplied: 0,
    lagsTested: [0],
    bonferroniAlphaVal: 0.05,
    nullRatioA: 0.0,
    nullRatioB: 0.0,
    firstDifferencingApplied: false,
    trendConfounderDetected: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('correlation-packet — buildCorrelationPacket()', () => {
    it('builds a frozen packet from valid args', () => {
        const packet = buildCorrelationPacket(BASE_ARGS);
        expect(packet.kpi_a_id).toBe('kpi-revenue');
        expect(packet.kpi_b_id).toBe('kpi-orders');
        expect(packet.pearson_r).toBe(0.82);
        expect(packet.n_observations).toBe(20);
        expect(Object.isFrozen(packet)).toBe(true);
    });

    it('insight_id is a UUID string', () => {
        const packet = buildCorrelationPacket(BASE_ARGS);
        expect(typeof packet.insight_id).toBe('string');
        expect(packet.insight_id.length).toBeGreaterThan(10);
    });

    it('correlation_reportable = true when significant, non-null r, non-insufficient', () => {
        const packet = buildCorrelationPacket(BASE_ARGS); // n=20, r=0.82, sig=true
        expect(packet.correlation_reportable).toBe(true);
    });

    it('correlation_reportable = false when not significant', () => {
        const packet = buildCorrelationPacket({ ...BASE_ARGS, statSig: false, pearsonR: 0.2, pValue: 0.5 });
        expect(packet.correlation_reportable).toBe(false);
    });

    it('correlation_reportable = false when pearsonR is null', () => {
        const packet = buildCorrelationPacket({ ...BASE_ARGS, pearsonR: null, statSig: false });
        expect(packet.correlation_reportable).toBe(false);
    });

    it('confidence = high when n >= 20 and |r| >= 0.7', () => {
        const packet = buildCorrelationPacket({ ...BASE_ARGS, nObservations: 24, pearsonR: 0.85 });
        expect(packet.confidence_level).toBe('high');
    });

    it('confidence = moderate when n >= 10 and |r| >= 0.5', () => {
        const packet = buildCorrelationPacket({ ...BASE_ARGS, nObservations: 12, pearsonR: 0.6 });
        expect(packet.confidence_level).toBe('moderate');
    });

    it('confidence = low when significant but small n or weak r', () => {
        const packet = buildCorrelationPacket({ ...BASE_ARGS, nObservations: 7, pearsonR: 0.72 });
        expect(packet.confidence_level).toBe('low');
    });

    it('confidence = insufficient when not significant', () => {
        const packet = buildCorrelationPacket({ ...BASE_ARGS, statSig: false, pearsonR: null });
        expect(packet.confidence_level).toBe('insufficient');
    });

    it('traceable_fields contains pearson_r when non-null', () => {
        const packet = buildCorrelationPacket(BASE_ARGS);
        expect(packet.traceable_fields).toContain('pearson_r');
    });

    it('traceable_fields contains p_value when non-null', () => {
        const packet = buildCorrelationPacket(BASE_ARGS);
        expect(packet.traceable_fields).toContain('p_value');
    });

    it('traceable_fields contains n_observations', () => {
        const packet = buildCorrelationPacket(BASE_ARGS);
        expect(packet.traceable_fields).toContain('n_observations');
    });

    it('first_differencing_applied and trend_confounder_detected are propagated', () => {
        const packet = buildCorrelationPacket({
            ...BASE_ARGS,
            firstDifferencingApplied: true,
            trendConfounderDetected: true,
        });
        expect(packet.first_differencing_applied).toBe(true);
        expect(packet.trend_confounder_detected).toBe(true);
    });

    it('lags_tested is a copy (not reference to original array)', () => {
        const lags = [-2, -1, 0, 1, 2];
        const packet = buildCorrelationPacket({ ...BASE_ARGS, lagsTested: lags });
        expect(packet.lags_tested).toEqual([-2, -1, 0, 1, 2]);
        // Mutating original should not affect packet (it's frozen)
        lags.push(99);
        expect(packet.lags_tested).not.toContain(99);
    });

    it('throws CorrelationPacketError on missing kpiAId', () => {
        expect(() => buildCorrelationPacket({ ...BASE_ARGS, kpiAId: '' }))
            .toThrow(CorrelationPacketError);
    });

    it('throws CorrelationPacketError on missing kpiAName', () => {
        expect(() => buildCorrelationPacket({ ...BASE_ARGS, kpiAName: '' }))
            .toThrow(CorrelationPacketError);
    });

    it('frozen packet — mutation attempt throws', () => {
        const packet = buildCorrelationPacket(BASE_ARGS);
        expect(() => { (packet as any).pearson_r = 0; }).toThrow();
    });
});
