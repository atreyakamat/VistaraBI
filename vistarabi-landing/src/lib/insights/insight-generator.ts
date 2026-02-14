// Module 5C — Insight Generator
// Orchestrates anomaly detection + trend analysis + AI summary generation
// Produces structured, grounded insights for individual KPIs and the global dashboard

import db from '../prisma';
import type { KPILineageEntry } from '../prisma';
import { generateCompletion, checkOllamaHealth } from '../ai/ollama-client';
import { computeTimeSeries, computeGroupedKPI } from '../visualization/kpi-computer';
import { loadProjectData } from '../visualization/data-loader';
import { explainKPI } from '../data-lineage/kpi-lineage-registry';
import { detectAnomalies, detectLatestAnomaly } from './anomaly-detector';
import { computeTrend, computeOverallTrend, identifyTopContributors } from './trend-analyzer';
import type {
    KPIInsight,
    KPIExplanationPayload,
    DashboardInsightsPayload,
    AnomalyResult,
    TrendSummary,
    TopContributor,
} from './types';

// ─── Single KPI Insight ───────────────────────────────────────────

/**
 * Generate comprehensive insights for a single KPI.
 * Combines lineage explanation, anomaly detection, trend analysis, and AI summary.
 */
export async function generateKPIInsight(
    projectId: string,
    kpiId: string
): Promise<KPIExplanationPayload | null> {
    console.log('[InsightGen] Generating insight for KPI:', kpiId);

    // 1. Get lineage explanation from Module 4D-B
    const explanation = await explainKPI(projectId, kpiId);
    if (!explanation) return null;

    // 2. Get lineage entry for detailed metadata
    const lineageEntries = await loadLineageRegistry(projectId);
    const lineage = lineageEntries.find(e => e.kpiId === kpiId);
    if (!lineage) return null;

    // 3. Load project data and compute time-series for analysis
    const dataMap = await loadProjectData(projectId);
    const timeSeries = computeTimeSeries(lineage, dataMap, 'monthly');

    // 4. Run anomaly detection on time-series
    const anomalies = detectAnomalies(timeSeries.dataPoints);

    // 5. Compute trend
    const trend = computeTrend(timeSeries.dataPoints);

    // 6. Get top contributors via grouped computation
    const primarySource = lineage.sources[0];
    let topContributors: TopContributor[] = [];
    if (primarySource) {
        // Find a good categorical column for grouping
        const source = dataMap.sources.get(primarySource.sourceId);
        if (source) {
            const categoricalCol = findBestCategoricalColumn(source.rows, source.columns);
            if (categoricalCol) {
                const grouped = computeGroupedKPI(lineage, dataMap, categoricalCol);
                topContributors = identifyTopContributors(grouped.dataPoints, 5);
            }
        }
    }

    // 7. Build structured insights
    const insights = buildKPIInsights(kpiId, explanation.kpiName, anomalies, trend, topContributors);

    // 8. Generate AI summary (grounded in actual data)
    let aiSummary: string | undefined;
    let aiEnhanced = false;

    try {
        const result = await generateGroundedAISummary(
            explanation.kpiName,
            lineage.formula,
            timeSeries.currentValue,
            trend,
            anomalies,
            topContributors
        );
        if (result) {
            aiSummary = result;
            aiEnhanced = true;
        }
    } catch (error) {
        console.log('[InsightGen] AI summary generation failed, using deterministic only');
    }

    return {
        kpiId,
        kpiName: explanation.kpiName,
        domain: explanation.domain,
        formula: explanation.formula,
        category: lineage.category,
        lineage: {
            sources: explanation.sources,
            joins: explanation.joins,
            aggregations: explanation.aggregations,
            technicalExplanation: explanation.technicalExplanation,
            businessExplanation: explanation.businessExplanation,
        },
        currentValue: timeSeries.currentValue,
        trend: trend ?? undefined,
        anomalies,
        insights,
        aiSummary,
        aiEnhanced,
    };
}

// ─── Global Dashboard Insights ────────────────────────────────────

/**
 * Generate insights across all KPIs in the dashboard.
 * Returns the most notable movements and anomalies.
 */
export async function generateDashboardInsights(
    projectId: string
): Promise<DashboardInsightsPayload> {
    console.log('[InsightGen] Generating dashboard insights for:', projectId);

    const lineageEntries = await loadLineageRegistry(projectId);
    const dataMap = await loadProjectData(projectId);

    const allInsights: KPIInsight[] = [];
    let anomalyCount = 0;
    let trendingUp = 0;
    let trendingDown = 0;

    for (const lineage of lineageEntries) {
        try {
            // Compute time-series for each KPI
            const timeSeries = computeTimeSeries(lineage, dataMap, 'monthly');

            // Check for latest anomaly
            const latestAnomaly = detectLatestAnomaly(timeSeries.dataPoints);
            if (latestAnomaly) {
                anomalyCount++;
                allInsights.push({
                    type: 'anomaly',
                    severity: latestAnomaly.severity,
                    title: `${lineage.kpiName}: ${latestAnomaly.direction === 'spike' ? '📈 Spike' : '📉 Drop'} in ${latestAnomaly.label}`,
                    description: `${lineage.kpiName} is ${Math.abs(latestAnomaly.percentFromMean).toFixed(1)}% ${latestAnomaly.direction === 'spike' ? 'above' : 'below'} average (${latestAnomaly.deviation.toFixed(1)}σ deviation).`,
                    kpiId: lineage.kpiId,
                    kpiName: lineage.kpiName,
                    data: { anomaly: latestAnomaly },
                });
            }

            // Check trend
            const trend = computeTrend(timeSeries.dataPoints);
            if (trend) {
                if (trend.direction === 'up') trendingUp++;
                if (trend.direction === 'down') trendingDown++;

                // Only highlight significant trends (> 5% change)
                if (Math.abs(trend.percentChange) > 5) {
                    allInsights.push({
                        type: 'trend',
                        severity: Math.abs(trend.percentChange) > 20 ? 'warning' : 'info',
                        title: `${lineage.kpiName}: ${trend.direction === 'up' ? '↑' : '↓'} ${Math.abs(trend.percentChange).toFixed(1)}%`,
                        description: `${lineage.kpiName} ${trend.direction === 'up' ? 'increased' : 'decreased'} by ${Math.abs(trend.percentChange).toFixed(1)}% from ${trend.previousPeriodLabel} to ${trend.currentPeriodLabel}.`,
                        kpiId: lineage.kpiId,
                        kpiName: lineage.kpiName,
                        data: { trend },
                    });
                }
            }
        } catch (error) {
            console.error(`[InsightGen] Error processing KPI ${lineage.kpiName}:`, error);
        }
    }

    // Sort insights by severity (critical > warning > info)
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    allInsights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Generate global AI summary
    let globalSummary: string | undefined;
    let aiEnhanced = false;

    try {
        globalSummary = await generateDashboardAISummary(
            lineageEntries.length,
            anomalyCount,
            trendingUp,
            trendingDown,
            allInsights.slice(0, 5) // Top 5 insights
        );
        if (globalSummary) aiEnhanced = true;
    } catch {
        console.log('[InsightGen] Dashboard AI summary failed');
    }

    return {
        projectId,
        insights: allInsights.slice(0, 10), // Top 10 insights
        anomalyCount,
        trendingUp,
        trendingDown,
        globalSummary,
        aiEnhanced,
        computedAt: new Date().toISOString(),
    };
}

// ─── Insight Builders ─────────────────────────────────────────────

/**
 * Build structured insights from detection results.
 */
function buildKPIInsights(
    kpiId: string,
    kpiName: string,
    anomalies: AnomalyResult[],
    trend: TrendSummary | null,
    topContributors: TopContributor[]
): KPIInsight[] {
    const insights: KPIInsight[] = [];

    // Anomaly insights
    for (const anomaly of anomalies.slice(0, 3)) {
        insights.push({
            type: 'anomaly',
            severity: anomaly.severity,
            title: `${anomaly.direction === 'spike' ? 'Spike' : 'Drop'} detected in ${anomaly.label}`,
            description: `Value of ${anomaly.value.toLocaleString()} is ${Math.abs(anomaly.percentFromMean).toFixed(1)}% ${anomaly.direction === 'spike' ? 'above' : 'below'} the average of ${anomaly.expectedValue.toLocaleString()}.`,
            kpiId,
            kpiName,
            data: { anomaly },
        });
    }

    // Trend insight
    if (trend && Math.abs(trend.percentChange) > 1) {
        insights.push({
            type: 'trend',
            severity: Math.abs(trend.percentChange) > 20 ? 'warning' : 'info',
            title: `${trend.direction === 'up' ? 'Increasing' : trend.direction === 'down' ? 'Decreasing' : 'Stable'} trend`,
            description: `${kpiName} ${trend.direction === 'up' ? 'increased' : 'decreased'} by ${Math.abs(trend.percentChange).toFixed(1)}% from ${trend.previousPeriodLabel} (${trend.previousPeriodValue.toLocaleString()}) to ${trend.currentPeriodLabel} (${trend.currentPeriodValue.toLocaleString()}).`,
            kpiId,
            kpiName,
            data: { trend },
        });
    }

    // Top contributors insight
    if (topContributors.length > 0) {
        const top = topContributors[0];
        insights.push({
            type: 'top_contributor',
            severity: 'info',
            title: `Top contributor: ${top.label}`,
            description: `${top.label} accounts for ${top.percentOfTotal.toFixed(1)}% of ${kpiName} (${top.value.toLocaleString()}).`,
            kpiId,
            kpiName,
            data: { topContributors },
        });
    }

    return insights;
}

// ─── AI Summary Generation (Grounded) ─────────────────────────────

/**
 * Generate a grounded AI summary for a KPI.
 * CRITICAL: Only uses actual computed data; never invents numbers.
 */
async function generateGroundedAISummary(
    kpiName: string,
    formula: string,
    currentValue: number,
    trend: TrendSummary | null,
    anomalies: AnomalyResult[],
    topContributors: TopContributor[]
): Promise<string | null> {
    const isAvailable = await checkOllamaHealth();
    if (!isAvailable) return null;

    // Build a structured data prompt — AI can only reference these facts
    const facts: string[] = [];
    facts.push(`KPI: ${kpiName}`);
    facts.push(`Formula: ${formula}`);
    facts.push(`Current Value: ${currentValue.toLocaleString()}`);

    if (trend) {
        facts.push(`Trend: ${trend.direction} ${Math.abs(trend.percentChange).toFixed(1)}% from ${trend.previousPeriodLabel} to ${trend.currentPeriodLabel}`);
    }

    if (anomalies.length > 0) {
        const topAnomaly = anomalies[0];
        facts.push(`Anomaly: ${topAnomaly.direction} of ${topAnomaly.deviation.toFixed(1)}σ in ${topAnomaly.label} (value: ${topAnomaly.value.toLocaleString()}, expected: ${topAnomaly.expectedValue.toLocaleString()})`);
    }

    if (topContributors.length > 0) {
        const topItems = topContributors.slice(0, 3)
            .map(c => `${c.label} (${c.percentOfTotal.toFixed(0)}%)`)
            .join(', ');
        facts.push(`Top contributors: ${topItems}`);
    }

    const prompt = `Based ONLY on these facts, write a 2-3 sentence business insight summary. Do NOT invent any data or numbers not listed below.\n\nFacts:\n${facts.map(f => `- ${f}`).join('\n')}\n\nSummary:`;

    try {
        const response = await generateCompletion({
            messages: [
                { role: 'system', content: 'You are a business analyst. Write concise, factual insights. Never invent numbers or facts not provided to you.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
        });

        const summary = response.trim();
        if (summary && summary.length > 20 && summary.length < 500) {
            return summary;
        }
    } catch {
        // Graceful fallback
    }

    return null;
}

/**
 * Generate AI summary for the global dashboard insights panel.
 */
async function generateDashboardAISummary(
    totalKPIs: number,
    anomalyCount: number,
    trendingUp: number,
    trendingDown: number,
    topInsights: KPIInsight[]
): Promise<string | undefined> {
    const isAvailable = await checkOllamaHealth();
    if (!isAvailable) return undefined;

    const facts = [
        `Dashboard tracks ${totalKPIs} KPIs`,
        `${anomalyCount} anomalies detected`,
        `${trendingUp} KPIs trending up, ${trendingDown} trending down`,
    ];

    for (const insight of topInsights.slice(0, 3)) {
        facts.push(`Notable: ${insight.title} — ${insight.description}`);
    }

    try {
        const response = await generateCompletion({
            messages: [
                { role: 'system', content: 'You are a business analyst dashboard. Summarize the key takeaways in 2-3 sentences. Only reference facts provided.' },
                { role: 'user', content: `Summarize this dashboard status:\n${facts.map(f => `- ${f}`).join('\n')}` },
            ],
            temperature: 0.3,
        });

        const summary = response.trim();
        if (summary && summary.length > 20 && summary.length < 500) return summary;
    } catch { /* graceful fallback */ }

    return undefined;
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Load KPI lineage entries from Module 4D-B registry.
 */
async function loadLineageRegistry(projectId: string): Promise<KPILineageEntry[]> {
    const registry = await db.kPILineageRegistry.findUnique({
        where: { projectId },
    });
    if (!registry || !registry.entries) return [];
    return registry.entries as unknown as KPILineageEntry[];
}

/**
 * Find the best categorical column for top-contributor grouping.
 * Picks the non-numeric, non-ID column with the most reasonable cardinality.
 */
function findBestCategoricalColumn(
    rows: Record<string, unknown>[],
    columns: string[]
): string | null {
    if (rows.length === 0) return null;

    let bestCol: string | null = null;
    let bestScore = 0;

    for (const col of columns) {
        // Skip IDs, dates, and numeric columns
        if (col.endsWith('id') || col === 'id') continue;
        if (col.includes('date') || col.includes('time')) continue;

        const sampleVal = rows[0][col];
        if (typeof sampleVal === 'number') continue;

        const uniqueCount = new Set(rows.map(r => r[col])).size;
        // Sweet spot: 2–20 unique values
        if (uniqueCount >= 2 && uniqueCount <= 20) {
            const score = uniqueCount;
            if (score > bestScore) {
                bestScore = score;
                bestCol = col;
            }
        }
    }

    return bestCol;
}
