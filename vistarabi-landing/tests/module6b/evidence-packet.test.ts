// evidence-packet.test.ts — Module 6B evidence packet construction tests
import { describe, it, expect } from 'vitest';
import { buildEvidencePacket, EvidencePacketError } from '../../src/lib/module-6b/evidence-packet';
import type { EnrichedKPIResult } from '../../src/lib/dashboard-state/types';

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeBaseResult(overrides: Partial<{
    kpiId: string;
    kpiName: string;
    unit: string;
    datasetLength: number;
    deltaPercent: number | null;
    deltaDirection: 'up' | 'down' | 'flat' | null;
    anomalyDetected: boolean;
    anomalyZScore: number;
    volatilityIndex: number;
}>): EnrichedKPIResult {
    const {
        kpiId = 'kpi-rev-001',
        kpiName = 'Total Revenue',
        unit = 'currency',
        datasetLength = 12,
        deltaPercent = 15,
        deltaDirection = 'up',
        anomalyDetected = false,
        anomalyZScore = 0,
        volatilityIndex = 0.15,
    } = overrides;

    const dataset = Array.from({ length: datasetLength }, (_, i) => ({
        label: `2024-${String(i + 1).padStart(2, '0')}-01`,
        value: 1000 + i * 100,
    }));

    return {
        kpiId,
        kpiName,
        category: 'revenue',
        primaryValue: 2100,
        previousValue: 1000,
        delta: deltaPercent !== null ? (deltaPercent / 100) * 1000 : null,
        deltaPercent,
        deltaDirection,
        dataset,
        datasetSize: datasetLength,
        profiling: {
            recordCount: datasetLength,
            uniqueCategoryCount: 1,
            numberOfSeries: 1,
            hasTimeDimension: true,
            numericDimensionCount: 1,
            hierarchicalDepth: 0,
            volatilityIndex,
            distributionSkew: 0,
            cardinalityLevel: 'low',
            isSequentialChange: true,
        },
        recommendedChartType: 'line',
        recommendedChartLibrary: 'chart-js',
        disableAnimation: false,
        aiExplanation: null,
        lineage: { tables: ['orders'], joins: [], formula: 'SUM(revenue)', aggregations: ['SUM'] },
        performance: { totalTimeMs: 50, dataLoadTimeMs: 10, computeTimeMs: 20, profilingTimeMs: 5, cacheHit: false, cacheKey: null },
        summary: { headline: 'Revenue up', detail: 'Revenue increased', trendLabel: 'notable_increase', thresholdBand: 'high', generatedAt: new Date().toISOString() },
        anomaly: anomalyDetected ? {
            detected: true,
            severity: 'high',
            worstPoint: { label: '2024-06-01', value: 5000, zScore: anomalyZScore, severity: 'high' },
            affectedPoints: [],
            reasoning: 'Z-score exceeded',
        } : {
            detected: false,
            severity: 'low',
            worstPoint: { label: '', value: 0, zScore: 0, severity: 'low' },
            affectedPoints: [],
            reasoning: '',
        },
        guardrail: null,
        unit,
    } as unknown as EnrichedKPIResult;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('evidence-packet.test — buildEvidencePacket()', () => {
    it('builds a frozen packet from a valid EnrichedKPIResult', () => {
        const result = makeBaseResult({});
        const packet = buildEvidencePacket(result, 'monthly');

        expect(packet.kpi_id).toBe('kpi-rev-001');
        expect(packet.kpi_name).toBe('Total Revenue');
        expect(packet.unit).toBe('currency');
        expect(packet.dataset_length).toBe(12);
        expect(packet.delta_percent).toBe(15);
        expect(packet.delta_direction).toBe('up');
        expect(packet.event_id).toBeTruthy();
        expect(typeof packet.event_id).toBe('string');
        expect(Object.isFrozen(packet)).toBe(true);
    });

    it('throws EvidencePacketError for missing kpiId', () => {
        const result = makeBaseResult({ kpiId: '' });
        (result as any).kpiId = '';
        expect(() => buildEvidencePacket(result)).toThrow(EvidencePacketError);
    });

    it('throws EvidencePacketError for missing kpiName', () => {
        const result = makeBaseResult({});
        (result as any).kpiName = '';
        expect(() => buildEvidencePacket(result)).toThrow(EvidencePacketError);
    });

    it('traceable_fields contains delta_percent when non-null', () => {
        const packet = buildEvidencePacket(makeBaseResult({ deltaPercent: 15 }));
        expect(packet.traceable_fields).toContain('delta_percent');
    });

    it('traceable_fields contains anomaly_zscore when anomaly detected', () => {
        const packet = buildEvidencePacket(makeBaseResult({ anomalyDetected: true, anomalyZScore: 3.2 }));
        expect(packet.traceable_fields).toContain('anomaly_zscore');
    });

    it('traceable_fields contains volatility_index when non-null', () => {
        const packet = buildEvidencePacket(makeBaseResult({ volatilityIndex: 0.4 }));
        expect(packet.traceable_fields).toContain('volatility_index');
    });

    it('traceable_fields always contains dataset_length', () => {
        const packet = buildEvidencePacket(makeBaseResult({ datasetLength: 6 }));
        expect(packet.traceable_fields).toContain('dataset_length');
    });

    it('period_start is earliest ISO date label', () => {
        const packet = buildEvidencePacket(makeBaseResult({ datasetLength: 3 }));
        expect(packet.period_start).toBe('2024-01-01');
        expect(packet.period_end).toBe('2024-03-01');
    });

    it('anomaly_period and anomaly_zscore present when anomaly detected', () => {
        const packet = buildEvidencePacket(makeBaseResult({ anomalyDetected: true, anomalyZScore: 2.8 }));
        expect(packet.anomaly_detected).toBe(true);
        expect(packet.anomaly_period).toBe('2024-06-01');
        expect(packet.anomaly_zscore).toBe(2.8);
    });

    it('anomaly_period and anomaly_zscore undefined when no anomaly', () => {
        const packet = buildEvidencePacket(makeBaseResult({ anomalyDetected: false }));
        expect(packet.anomaly_detected).toBe(false);
        expect(packet.anomaly_period).toBeUndefined();
        expect(packet.anomaly_zscore).toBeUndefined();
    });

    it('event_type is INSUFFICIENT_DATA for small dataset', () => {
        const packet = buildEvidencePacket(makeBaseResult({ datasetLength: 3. }));
        expect(packet.event_type).toBe('INSUFFICIENT_DATA');
        expect(packet.confidence_level).toBe('insufficient');
    });

    it('event_type is ANOMALY when anomaly detected', () => {
        const packet = buildEvidencePacket(makeBaseResult({ anomalyDetected: true, datasetLength: 14 }));
        expect(packet.event_type).toBe('ANOMALY');
    });

    it('packet is immutable — mutation attempt has no effect', () => {
        const packet = buildEvidencePacket(makeBaseResult({}));
        expect(() => {
            (packet as any).kpi_name = 'mutated';
        }).toThrow(); // strict mode throws on frozen object mutation
    });
});
