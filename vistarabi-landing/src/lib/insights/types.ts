// Module 5C — Cognitive Insight Layer Types
// Anomaly detection, change attribution, insight generation, smart alerts

import type { KPIDataPoint } from '../visualization/types';

// ─── Anomaly Detection ────────────────────────────────────────────

export type AnomalySeverity = 'normal' | 'warning' | 'critical';
export type AnomalyDirection = 'spike' | 'drop' | 'none';

export interface AnomalyFlag {
    rule: string;
    description: string;
    threshold: number;
    actual: number;
}

export interface AnomalyResult {
    severity: AnomalySeverity;
    score: number;               // 0-100
    flags: AnomalyFlag[];
    reason: string;              // Human-readable summary
    direction: AnomalyDirection;
    detectedAt: string;          // ISO timestamp
}

// ─── Change Attribution ───────────────────────────────────────────

export interface SegmentContribution {
    segment: string;
    currentValue: number;
    previousValue: number;
    delta: number;
    deltaPercent: number;
    contributionPercent: number; // % of total change this segment caused
}

export interface ChangeAttribution {
    segments: SegmentContribution[];
    topPositive: SegmentContribution | null;
    topNegative: SegmentContribution | null;
    sentence: string;            // "Electronics contributed 68% of the increase"
    totalDelta: number;
}

// ─── Trend Analysis ──────────────────────────────────────────────

export type TrendDirection = 'up' | 'down' | 'flat';

export interface TrendSummary {
    direction: TrendDirection;
    currentPeriodValue: number;
    previousPeriodValue: number;
    percentChange: number;
    currentPeriodLabel: string;
    previousPeriodLabel: string;
}

export interface TopContributor {
    label: string;
    value: number;
    percentOfTotal: number;
    rank: number;
}

// ─── KPI Insight ──────────────────────────────────────────────────

export interface KPIInsight {
    kpiId: string;
    kpiName: string;
    category: string;

    // Anomaly
    anomaly: AnomalyResult;

    // Attribution (null if single-dimension)
    attribution: ChangeAttribution | null;

    // Lineage explanation (deterministic)
    lineageExplanation: string;

    // Trend interpretation
    trendSummary: string;
    trend: TrendSummary | null;

    // AI insight (from cache)
    aiSummary: string | null;

    // Metadata
    lastUpdated: string;
    dataFreshness: 'fresh' | 'stale' | 'unknown';
}

// ─── Insight Feed Panel ───────────────────────────────────────────

export interface InsightFeedItem {
    id: string;
    type: 'movement' | 'anomaly' | 'trend' | 'freshness' | 'alert';
    kpiId: string;
    kpiName: string;
    title: string;
    description: string;
    severity: AnomalySeverity;
    value?: number;
    delta?: number;
    deltaPercent?: number;
    timestamp: string;
}

// ─── Smart Alerts ─────────────────────────────────────────────────

export interface SmartAlert {
    kpiId: string;
    kpiName: string;
    severity: AnomalySeverity;
    triggeredAt: string;
    reason: string;
    delta: number;
    deltaPercent: number;
    acknowledged: boolean;
}

// ─── Full Explanation Payload ─────────────────────────────────────

export interface KPIExplanationPayload {
    kpiId: string;
    kpiName: string;
    domain: string;
    formula: string;
    category: string;
    lineage: {
        sources: string[];
        joins: { from: string; to: string; via: string }[];
        aggregations: { function: string; column: string }[];
        technicalExplanation: string;
        businessExplanation: string;
    };
    currentValue: number;
    trend?: TrendSummary;
    anomalies: AnomalyResult[];
    insights: KPIInsight[];
    aiSummary?: string;
    aiEnhanced: boolean;
}

// ─── Insights API Response ────────────────────────────────────────

export interface InsightsResponse {
    projectId: string;
    insights: KPIInsight[];
    feed: InsightFeedItem[];
    alerts: SmartAlert[];
    topMovers: {
        strongest_up: InsightFeedItem | null;
        strongest_down: InsightFeedItem | null;
    };
    anomalyCount: number;
    trendingUp: number;
    trendingDown: number;
    computedAt: string;
}
