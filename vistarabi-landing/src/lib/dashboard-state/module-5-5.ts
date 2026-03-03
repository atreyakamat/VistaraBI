// Module 5.5 — Orchestrator (Main Entry Point)
// runDashboardIntelligence() is the single function Module 5.5 exposes to the API.
// Pipeline:
//   hydrateDashboard → normalizeFilters → execute KPIs → attach summary → attach anomaly → return

import { hydrateDashboard } from './state-engine';
import { normalizeFilters } from './filter-interpreter';
import { mergeFilters, toExecutionFilters, extractDateRange, extractRankConfig } from './filter-propagation';
import { generateDeterministicSummary } from './kpi-summary-engine';
import { tryDetectAnomalies } from './anomaly-detector';
import { executeKPI } from '@/lib/execution';
import type {
    DashboardIntelligenceOptions,
    EnrichedKPIResult,
    EnrichedDashboardResult,
    GuardrailInfo,
    NormalizedFilter,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_GROUP_BY_ROWS = 200; // Cardinality guardrail threshold

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the full dashboard intelligence pipeline for a project.
 *
 * Steps:
 *   1. Hydrate DashboardState (from DB or seed from DashboardConfig)
 *   2. Parse raw business filter expressions → NormalizedFilter[]
 *   3. For each card: merge global+card filters → executeKPI
 *   4. Attach KPISummary (deterministic)
 *   5. Attach AnomalyReport (Z-score based, optional)
 *   6. Attach GuardrailInfo (cardinality check)
 *   7. Return EnrichedDashboardResult
 */
export async function runDashboardIntelligence(
    projectId: string,
    options: DashboardIntelligenceOptions = {}
): Promise<EnrichedDashboardResult> {
    const startTime = Date.now();

    // ── Step 1: Hydrate state ──
    const state = await hydrateDashboard(projectId);
    if (!state) {
        throw new Error(`[Module5.5] No dashboard state or config found for project "${projectId}". Run Module 5A first.`);
    }

    // ── Step 2: Normalize filters ──
    let globalFilters: NormalizedFilter[] = options.normalizedFilters || state.globalFilters;

    if (options.businessFilters && options.businessFilters.length > 0) {
        const parsed = normalizeFilters(options.businessFilters, {
            fiscalYearConvention: options.fiscalYearConvention || 'april_march',
        });
        // Business filter expressions OVERRIDE stored global filters
        globalFilters = parsed;
    }

    // ── Step 3: Execute per-card ──
    const granularity = options.granularity || state.granularity || 'monthly';

    const enrichedKPIs: EnrichedKPIResult[] = [];
    let skippedCount = 0;
    let anomalyCount = 0;
    let cacheHitCount = 0;

    // Filter to requested card IDs if specified
    const cardsToProcess = options.cardIds
        ? state.cards.filter(c => options.cardIds!.includes(c.id))
        : state.cards;

    for (const card of cardsToProcess) {
        try {
            // Merge global + card-level overrides (global-first, card wins on collision)
            const effectiveFilters = mergeFilters(globalFilters, card.filterOverrides);

            // Convert to execution layer filter format
            const executionFilters = toExecutionFilters(effectiveFilters);
            const dateRange = extractDateRange(effectiveFilters);
            const rankConfig = extractRankConfig(effectiveFilters);

            // Resolve groupBy: card setting OR rank filter column
            const groupBy = card.groupBy || rankConfig.groupBy || undefined;

            // Execute via Module 5B executor (untouched)
            const result = await executeKPI(projectId, card.kpiId, {
                granularity: groupBy ? undefined : granularity, // No time-series when grouped
                filters: executionFilters,
                groupBy,
                dateFrom: dateRange.dateFrom,
                dateTo: dateRange.dateTo,
                dateColumn: dateRange.dateColumn,
                skipCache: options.skipCache,
                skipAIExplanation: true, // 5.5 handles summaries deterministically
            });

            if (result.performance.cacheHit) cacheHitCount++;

            // ── Step 4: KPI Summary (deterministic, always present) ──
            const summary = options.skipSummaryGeneration
                ? null
                : generateDeterministicSummary(result);

            // ── Step 5: Anomaly Detection (optional, only time-series) ──
            let anomaly = null;
            if (!options.skipAnomalyDetection && result.dataset.length >= 5) {
                anomaly = tryDetectAnomalies(result.dataset);
                if (anomaly?.detected) anomalyCount++;
            }

            // ── Step 6: Performance Guardrail ──
            const guardrail: GuardrailInfo | null = result.datasetSize > MAX_GROUP_BY_ROWS
                ? {
                    triggered: true,
                    reason: `High cardinality: ${result.datasetSize} rows exceed limit of ${MAX_GROUP_BY_ROWS}`,
                    fallbackChartType: 'table',
                    originalCount: result.datasetSize,
                }
                : null;

            enrichedKPIs.push({ ...result, summary, anomaly, guardrail });

        } catch (err: any) {
            console.error(`[Module5.5] KPI "${card.kpiId}" failed:`, err.message);
            skippedCount++;
        }
    }

    const totalTimeMs = Date.now() - startTime;

    return {
        projectId,
        domain: state.domain,
        stateVersion: state.version,
        granularity,
        globalFilters,
        kpis: enrichedKPIs,
        computedAt: new Date().toISOString(),
        metadata: {
            totalKPIs: cardsToProcess.length,
            computedKPIs: enrichedKPIs.length,
            skippedKPIs: skippedCount,
            anomalyCount,
            cacheHitCount,
            totalTimeMs,
        },
    };
}

/**
 * Dry-run: evaluate which KPIs would execute and what filters normalize to,
 * without actually hitting the database or executing SQL.
 */
export async function previewDashboardIntelligence(
    projectId: string,
    options: DashboardIntelligenceOptions = {}
): Promise<{ state: Awaited<ReturnType<typeof hydrateDashboard>>; normalizedFilters: NormalizedFilter[] }> {
    const state = await hydrateDashboard(projectId);

    let normalizedFilters: NormalizedFilter[] = options.normalizedFilters || state?.globalFilters || [];
    if (options.businessFilters && options.businessFilters.length > 0) {
        normalizedFilters = normalizeFilters(options.businessFilters, {
            fiscalYearConvention: options.fiscalYearConvention || 'april_march',
        });
    }

    return { state, normalizedFilters };
}
