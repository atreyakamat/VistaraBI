// Module 5C — Explainable Dashboard & AI Insight Engine
// Type definitions for insights, anomalies, trends, and explanations

import type { KPIDataResult, KPIDataPoint } from '../visualization/types';

// ─── Anomaly Detection ────────────────────────────────────────────

export type AnomalySeverity = 'info' | 'warning' | 'critical';
export type AnomalyDirection = 'spike' | 'drop';

export interface AnomalyResult {
    dataPointIndex: number;       // Index in the time-series
    label: string;                // The period label (e.g., "2024-03")
    value: number;                // Actual value
    expectedValue: number;        // Mean value
    deviation: number;            // How many σ away
    direction: AnomalyDirection;  // Spike or drop
    severity: AnomalySeverity;    // info (1-2σ), warning (2-3σ), critical (>3σ)
    percentFromMean: number;      // % deviation from mean
}

// ─── Trend Analysis ───────────────────────────────────────────────

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
    label: string;                // Category/group name
    value: number;                // Aggregated value
    percentOfTotal: number;       // Share of total
    rank: number;                 // 1-based rank
}

// ─── KPI Insight ──────────────────────────────────────────────────

export type InsightType = 'anomaly' | 'trend' | 'top_contributor' | 'comparison';

export interface KPIInsight {
    type: InsightType;
    severity: AnomalySeverity;
    title: string;                // Short title, e.g., "Revenue Spike in March"
    description: string;          // 1-2 sentence description
    kpiId: string;
    kpiName: string;
    data?: {
        anomaly?: AnomalyResult;
        trend?: TrendSummary;
        topContributors?: TopContributor[];
    };
}

// ─── Full Explanation Payload ─────────────────────────────────────

export interface KPIExplanationPayload {
    kpiId: string;
    kpiName: string;
    domain: string;
    formula: string;
    category: string;

    // Lineage (from Module 4D-B)
    lineage: {
        sources: string[];
        joins: { from: string; to: string; via: string }[];
        aggregations: { function: string; column: string }[];
        technicalExplanation: string;
        businessExplanation: string;
    };

    // Live data (from Module 5B)
    currentValue: number;
    trend?: TrendSummary;

    // Insights (from 5C)
    anomalies: AnomalyResult[];
    insights: KPIInsight[];

    // AI summary (Ollama-enhanced, grounded)
    aiSummary?: string;
    aiEnhanced: boolean;
}

// ─── Dashboard Insights Payload ───────────────────────────────────

export interface DashboardInsightsPayload {
    projectId: string;
    insights: KPIInsight[];       // Top insights across all KPIs
    anomalyCount: number;
    trendingUp: number;
    trendingDown: number;
    globalSummary?: string;       // AI-generated dashboard overview
    aiEnhanced: boolean;
    computedAt: string;
}
