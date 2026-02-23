// Module 5C — Insight Generator (Orchestrator)
// Combines anomaly detection + change attribution + explanation rendering + trend analysis
// Produces structured KPIInsight and InsightFeedItem for the dashboard

import db from '../prisma';
import type { KPIInsight, InsightFeedItem, SmartAlert, InsightsResponse, AnomalySeverity } from './types';
import { detectAnomaly } from './anomaly-detector';
import { computeChangeAttribution } from './change-attribution';
import { renderLineageExplanation, renderTrendSummary } from './explanation-renderer';
import { computeTrend, identifyTopContributors } from './trend-analyzer';

// ─── Single KPI Insight ───────────────────────────────────────────

/**
 * Generate a complete KPIInsight for one KPI.
 * Consumes execution result data from Module 5B.
 */
export function generateKPIInsight(params: {
    kpiId: string;
    kpiName: string;
    category: string;
    currentValue: number;
    previousValue?: number;
    delta?: number;
    deltaPercent?: number;
    trend?: 'up' | 'down' | 'flat';
    dataPoints: Array<{ label: string; value: number }>;
    profiling?: {
        volatilityIndex?: number;
        distributionSkew?: number;
        recordCount?: number;
    };
    lineage?: {
        tables: string[];
        joins: Array<{ from: string; to: string; on?: string }>;
        formula: string;
        aggregations: Array<{ function: string; column: string }>;
        filters?: string[];
    };
    aiExplanation?: string | null;
    previousDataPoints?: Array<{ label: string; value: number }>;
}): KPIInsight {
    const {
        kpiId, kpiName, category, currentValue, previousValue,
        delta, deltaPercent, trend, dataPoints, profiling,
        lineage, aiExplanation, previousDataPoints,
    } = params;

    // Step 1: Anomaly detection (deterministic)
    const anomaly = detectAnomaly({
        currentValue,
        previousValue,
        delta,
        deltaPercent,
        dataPoints,
        volatilityIndex: profiling?.volatilityIndex,
        distributionSkew: profiling?.distributionSkew,
        recordCount: profiling?.recordCount,
    });

    // Step 2: Change attribution (multi-dimensional only)
    const attribution = computeChangeAttribution(dataPoints, previousDataPoints, kpiName);

    // Step 3: Lineage explanation (deterministic)
    const lineageExplanation = renderLineageExplanation(kpiName, lineage ?? null);

    // Step 4: Trend summary
    const trendText = renderTrendSummary({
        kpiName,
        currentValue,
        previousValue,
        deltaPercent,
        trend,
    });

    // Step 5: Trend computation
    const trendData = computeTrend(dataPoints);

    return {
        kpiId,
        kpiName,
        category,
        anomaly,
        attribution,
        lineageExplanation,
        trendSummary: trendText,
        trend: trendData,
        aiSummary: aiExplanation ?? null,
        lastUpdated: new Date().toISOString(),
        dataFreshness: dataPoints.length > 0 ? 'fresh' : 'unknown',
    };
}

// ─── Dashboard Insights ───────────────────────────────────────────

/**
 * Generate insights for all KPIs in a dashboard.
 * Ranks top movers, detects anomalies, builds feed.
 */
export function generateDashboardInsights(
    projectId: string,
    kpiInsights: KPIInsight[],
): InsightsResponse {
    const feed: InsightFeedItem[] = [];
    const alerts: SmartAlert[] = [];
    let anomalyCount = 0;
    let trendingUp = 0;
    let trendingDown = 0;

    // Process each KPI insight
    for (const insight of kpiInsights) {
        // Count anomalies
        if (insight.anomaly.severity !== 'normal') {
            anomalyCount++;

            // Add to feed
            feed.push({
                id: `anomaly-${insight.kpiId}`,
                type: 'anomaly',
                kpiId: insight.kpiId,
                kpiName: insight.kpiName,
                title: `${insight.anomaly.severity === 'critical' ? '🔴' : '🟡'} ${insight.kpiName.replace(/_/g, ' ')}`,
                description: insight.anomaly.reason,
                severity: insight.anomaly.severity,
                timestamp: insight.anomaly.detectedAt,
            });

            // Create smart alert
            alerts.push({
                kpiId: insight.kpiId,
                kpiName: insight.kpiName,
                severity: insight.anomaly.severity,
                triggeredAt: insight.anomaly.detectedAt,
                reason: insight.anomaly.reason,
                delta: insight.trend?.currentPeriodValue
                    ? insight.trend.currentPeriodValue - insight.trend.previousPeriodValue
                    : 0,
                deltaPercent: insight.trend?.percentChange ?? 0,
                acknowledged: false,
            });
        }

        // Count trends
        if (insight.trend) {
            if (insight.trend.direction === 'up') trendingUp++;
            if (insight.trend.direction === 'down') trendingDown++;

            // Add movement to feed
            const absDelta = Math.abs(insight.trend.percentChange);
            if (absDelta > 5) { // Only notable movements
                feed.push({
                    id: `movement-${insight.kpiId}`,
                    type: 'movement',
                    kpiId: insight.kpiId,
                    kpiName: insight.kpiName,
                    title: `${insight.trend.direction === 'up' ? '📈' : '📉'} ${insight.kpiName.replace(/_/g, ' ')}`,
                    description: insight.trendSummary,
                    severity: absDelta > 20 ? 'warning' : 'normal',
                    delta: insight.trend.currentPeriodValue - insight.trend.previousPeriodValue,
                    deltaPercent: insight.trend.percentChange,
                    timestamp: insight.lastUpdated,
                });
            }
        }
    }

    // Sort feed by severity then timestamp
    feed.sort((a, b) => {
        const severityOrder: Record<AnomalySeverity, number> = { critical: 0, warning: 1, normal: 2 };
        const diff = severityOrder[a.severity] - severityOrder[b.severity];
        return diff !== 0 ? diff : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Top movers
    const movements = feed.filter(f => f.type === 'movement' && f.deltaPercent !== undefined);
    const strongestUp = movements.filter(m => (m.deltaPercent ?? 0) > 0)
        .sort((a, b) => (b.deltaPercent ?? 0) - (a.deltaPercent ?? 0))[0] ?? null;
    const strongestDown = movements.filter(m => (m.deltaPercent ?? 0) < 0)
        .sort((a, b) => (a.deltaPercent ?? 0) - (b.deltaPercent ?? 0))[0] ?? null;

    return {
        projectId,
        insights: kpiInsights,
        feed: feed.slice(0, 10), // Top 10 feed items
        alerts,
        topMovers: {
            strongest_up: strongestUp,
            strongest_down: strongestDown,
        },
        anomalyCount,
        trendingUp,
        trendingDown,
        computedAt: new Date().toISOString(),
    };
}
